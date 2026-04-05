/** Main application controller */

let parser = null;
let directory = null;
let headerInfo = null;
let allEvents = [];
let filteredEvents = [];
let currentFilter = 'pix'; // 'api' = event index+details, 'pix' = GPU-visible PIX-like order, 'all' = everything
let resourceNames = new Map(); // obj# → debug name string

let eventDetailsByRecordId = new Map();
let objectInfo = new Map();
let queueInfo = new Map();
let resolveQueryInfo = new Map();
let signalInfo = new Map();
let descriptorInfo = { labelsByKey: new Map(), historyByCommandList: new Map() };
let bufferViewInfo = { labelsByKey: new Map() };
let rasterStateInfo = { viewportHistoryByCommandList: new Map() };
let resourceInfo = new Map();
let currentSearchQuery = '';

function getPixSortKey(evt) {
    if (evt == null) return Number.MAX_SAFE_INTEGER;
    if (evt.param1 != null && Number.isFinite(evt.param1)) return evt.param1;
    if (evt.recordId != null && Number.isFinite(evt.recordId)) return evt.recordId;
    if (evt.sequence != null && Number.isFinite(evt.sequence)) return 1000000000 + evt.sequence;
    return Number.MAX_SAFE_INTEGER;
}

function $(sel) { return document.querySelector(sel); }

function init() {
    const dropZone = $('#drop-zone');
    const fileInput = $('#file-input');

    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) handleFile(e.target.files[0]);
    });
}

async function handleFile(file) {
    if (!file.name.toLowerCase().endsWith('.wpix')) {
        showError('Please select a .wpix file');
        return;
    }

    showStatus('Reading file...');
    const buffer = await file.arrayBuffer();

    showStatus('Parsing header...');
    try {
        parser = new WPixParser(buffer);
        headerInfo = parser.parseHeader();
    } catch (e) {
        showError(`Parse error: ${e.message}`);
        return;
    }

    showStatus('Parsing directory...');
    try {
        directory = parser.parseDirectory();
    } catch (e) {
        showError(`Directory error: ${e.message}`);
        return;
    }

    showStatus('Extracting metadata...');
    let metadata = null;
    const metaBlock = directory.find(e => e.dirType === 0x02);
    if (metaBlock) {
        try {
            const data = parser.readBlock(metaBlock);
            metadata = parser.extractMetadata(data);
        } catch (e) {
            console.warn('Metadata extraction failed:', e);
        }
    }

    showStatus('Extracting resource names...');
    resourceNames = new Map();
    for (const entry of directory.filter(e => e.dirType === 0x12C)) {
        try {
            const data = parser.readBlock(entry);
            const names = parser.extractResourceNames(data);
            for (const [id, name] of names) resourceNames.set(id, name);
        } catch (e) {
            console.warn('Resource name extraction failed:', e);
        }
    }

    showStatus('Extracting events...');
    allEvents = [];
    let processedBlocks = 0;
    let sequence = 1;

    for (const entry of directory) {
        try {
            const data = parser.readBlock(entry);
            const events = parser.extractEvents(data);
            for (const evt of events) {
                evt.blockIndex = entry.index;
                evt.blockType = entry.dirType;
                evt.blockTypeName = entry.dirTypeName;
                evt.sequence = sequence++;
            }
            allEvents.push(...events);
        } catch (e) {
            console.warn(`Block ${entry.index} failed:`, e.message);
        }
        processedBlocks++;
        if (processedBlocks % 50 === 0) {
            showStatus(`Extracting events... (${processedBlocks}/${directory.length} blocks)`);
            await yieldToUI();
        }
    }

    eventDetailsByRecordId = new Map(
        allEvents
            .filter((evt) => evt.blockType === 0x3E9 && evt.param1 != null)
            .map((evt) => [evt.param1, evt]),
    );
    objectInfo = WPixEventDecoder.buildObjectInfo(allEvents, { resourceNames });
    queueInfo = WPixEventDecoder.buildQueueInfo(allEvents);
    resourceInfo = WPixEventDecoder.buildResourceInfo(allEvents, { objectInfo, resourceNames });
    resolveQueryInfo = WPixEventDecoder.buildResolveQueryInfo(allEvents);
    signalInfo = WPixEventDecoder.buildSignalInfo(allEvents);
    descriptorInfo = WPixEventDecoder.buildDescriptorInfo(allEvents);
    bufferViewInfo = WPixEventDecoder.buildBufferViewInfo(allEvents, descriptorInfo);
    rasterStateInfo = WPixEventDecoder.buildRasterStateInfo(allEvents);

    for (const evt of allEvents) {
        const decoded = WPixEventDecoder.decodeEvent(evt, { resourceNames, eventDetailsByRecordId, objectInfo, resolveQueryInfo, signalInfo, descriptorInfo, bufferViewInfo, rasterStateInfo });
        evt._decoded = decoded;
        evt.decodedName = decoded.name;
        evt.call = decoded.call;
        evt.args = decoded.args;
        evt.notes = decoded.notes || [];

        const visibility = WPixEventDecoder.classifyPixVisibility(evt, decoded);
        evt.pixVisibility = visibility.category;
        evt.pixVisibilityReason = visibility.reason;
        evt.isPixGpuVisible = visibility.category === 'gpu';
        evt.pixGlobalId = null;
        evt.pixSortKey = getPixSortKey(evt);
    }

    const pixOrderedEvents = allEvents
        .filter((evt) => evt.isPixGpuVisible)
        .sort((a, b) => {
            const keyDelta = (a.pixSortKey || 0) - (b.pixSortKey || 0);
            if (keyDelta !== 0) return keyDelta;
            return (a.sequence || 0) - (b.sequence || 0);
        });

    for (let i = 0; i < pixOrderedEvents.length; i++) {
        pixOrderedEvents[i].pixGlobalId = i + 1;
    }

    $('#upload-section').style.display = 'none';
    $('#results-section').style.display = 'block';

    renderCaptureInfo(headerInfo, metadata, directory, allEvents, objectInfo, queueInfo);
    renderBlockMap(directory);
    renderResourceTable(resourceInfo);
    applyFilter('pix');
    showStatus(`Loaded: ${allEvents.length} events from ${directory.length} blocks`);
}

function buildResourceRows(resources) {
    const rows = [];
    let nextTextureId = 1;

    for (const resource of resources.values()) {
        if (!resource) continue;
        const dimension = resource.dimension || null;
        const width = resource.width != null ? resource.width : resource.inferredWidth;
        const height = resource.height != null ? resource.height : resource.inferredHeight;
        const depth = resource.depth != null ? resource.depth : resource.inferredDepth;
        const mipCount = resource.mipLevels != null ? resource.mipLevels : null;
        const arrayCount = resource.arrayCount != null ? resource.arrayCount : null;
        const sampleCount = resource.sampleCount != null ? resource.sampleCount : null;
        const format = resource.format || resource.inferredFormat || '';
        const estimatedSize = estimateTextureSize({
            width,
            height,
            depth,
            arrayCount,
            mipCount,
            sampleCount,
            format,
        });

        const looksTexture = dimension && dimension !== 'BUFFER'
            ? true
            : (width != null && height != null && height > 1);

        if (!looksTexture) continue;

        const sources = [];
        if (resource.creationType) sources.push(resource.creationType);
        if (resource.creationOpcode != null) sources.push(`op_${resource.creationOpcode}`);
        if (resource.inferredFormat || resource.inferredWidth || resource.inferredHeight) sources.push('CopyTextureRegion');

        rows.push({
            id: nextTextureId++,
            objectId: resource.objectId,
            name: resource.resourceName || '',
            estimatedSize,
            format,
            width,
            height,
            depth,
            mipCount,
            arrayCount,
            sampleCount,
            creationType: resource.creationType || '',
            heapObjectId: resource.heapObjectId,
            heapOffset: resource.heapOffset,
            layout: resource.layout || '',
            flags: resource.flags || '',
            source: sources.join(' + '),
        });
    }

    return rows.sort((a, b) => {
        if ((a.width || 0) !== (b.width || 0)) return (b.width || 0) - (a.width || 0);
        if ((a.height || 0) !== (b.height || 0)) return (b.height || 0) - (a.height || 0);
        return Number(a.objectId) - Number(b.objectId);
    });
}

function bytesPerPixelForFormat(format) {
    const map = {
        R8_UNORM: 1,
        R8_UINT: 1,
        R8G8_UINT: 2,
        R8G8B8A8_UNORM: 4,
        B8G8R8A8_UNORM: 4,
        R16_FLOAT: 2,
        R16G16_FLOAT: 4,
        R16G16B16A16_FLOAT: 8,
        R32_FLOAT: 4,
        D32_FLOAT: 4,
        D32_FLOAT_S8X24_UINT: 8,
    };
    return map[String(format || '').toUpperCase()] || null;
}

function estimateTextureSize(info) {
    const width = info.width || 0;
    const height = info.height || 0;
    const depth = info.depth || 1;
    const arrayCount = info.arrayCount || 1;
    const mipCount = info.mipLevels || info.mipCount || 1;
    const sampleCount = info.sampleCount || 1;
    const bpp = bytesPerPixelForFormat(info.format);
    if (!width || !height || !bpp) return null;

    let total = 0;
    for (let mip = 0; mip < mipCount; mip++) {
        const mipWidth = Math.max(1, width >> mip);
        const mipHeight = Math.max(1, height >> mip);
        const rowSize = mipWidth * bpp;
        const alignedRowSize = Math.ceil(rowSize / 256) * 256;
        total += alignedRowSize * mipHeight * depth;
    }
    total *= arrayCount * sampleCount;
    return total;
}

function renderResourceTable(resources) {
    const container = $('#resource-table');
    if (!container) return;
    const textures = resources ? buildResourceRows(resources) : [];
    if (!resources || resources.size === 0) {
        container.innerHTML = '<div class="subtle-note">No binary-derived resource records decoded from this capture yet.</div>';
        return;
    }
    if (textures.length === 0) {
        container.innerHTML = `<div class="subtle-note">Decoded ${resources.size.toLocaleString()} resource objects from WPIX records, but none have enough texture fields yet to render in the table.</div>`;
        return;
    }

    let html = `<div class="subtle-note">Binary-derived WPIX texture table. ${textures.length.toLocaleString()} texture-like resources out of ${resources.size.toLocaleString()} total resource objects. Blank fields mean the current reader has not decoded that field yet from the capture.</div>`;
    html += '<div class="resource-table-scroll"><table class="data-table"><thead><tr>';
    html += '<th>ID</th><th>Obj</th><th>Name</th><th>Estimated Size*</th><th>Format</th><th>Width</th><th>Height</th><th>Depth</th><th>Mip Count</th><th>Array Count</th><th>Sample Count</th><th>Creation</th><th>Heap</th><th>Heap Offset</th><th>Layout</th><th>Flags</th><th>Source</th>';
    html += '</tr></thead><tbody>';

    for (const texture of textures) {
        html += `<tr>
            <td>${texture.id}</td>
            <td><code>obj#${texture.objectId}</code></td>
            <td>${escapeHtml(texture.name || '')}</td>
            <td>${texture.estimatedSize != null ? texture.estimatedSize.toLocaleString() : ''}</td>
            <td>${escapeHtml(texture.format || '')}</td>
            <td>${texture.width != null ? texture.width.toLocaleString() : ''}</td>
            <td>${texture.height != null ? texture.height.toLocaleString() : ''}</td>
            <td>${texture.depth != null ? texture.depth.toLocaleString() : ''}</td>
            <td>${texture.mipCount != null ? texture.mipCount.toLocaleString() : ''}</td>
            <td>${texture.arrayCount != null ? texture.arrayCount.toLocaleString() : ''}</td>
            <td>${texture.sampleCount != null ? texture.sampleCount.toLocaleString() : ''}</td>
            <td>${escapeHtml(texture.creationType || '')}</td>
            <td>${texture.heapObjectId != null ? `<code>obj#${texture.heapObjectId}</code>` : ''}</td>
            <td>${texture.heapOffset != null ? texture.heapOffset.toLocaleString() : ''}</td>
            <td>${escapeHtml(texture.layout || '')}</td>
            <td>${escapeHtml(texture.flags || '')}</td>
            <td>${escapeHtml(texture.source || '')}</td>
        </tr>`;
    }

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

/** Format event for display */
function formatEvent(evt) {
    if (evt && evt._decoded) return evt._decoded;
    return WPixEventDecoder.decodeEvent(evt, { resourceNames, eventDetailsByRecordId, objectInfo, resolveQueryInfo, signalInfo, descriptorInfo, bufferViewInfo, rasterStateInfo });
}

function getBaseFilteredEvents(filter) {
    if (filter === 'api') {
        return allEvents.filter(e => e.blockType === 0x3E8 || e.blockType === 0x3E9);
    }
    if (filter === 'pix') {
        return allEvents
            .filter((e) => e.isPixGpuVisible)
            .sort((a, b) => (a.pixGlobalId || 0) - (b.pixGlobalId || 0));
    }
    return [...allEvents];
}

function matchesEventSearch(evt, query) {
    const trimmed = String(query || '').trim();
    if (!trimmed) return true;

    const globalIdMatch = trimmed.match(/^(?:gid:|global:|global id:)\s*(\d+)$/i);
    const numericOnly = /^\d+$/.test(trimmed);
    if (globalIdMatch || numericOnly) {
        const globalId = Number(globalIdMatch ? globalIdMatch[1] : trimmed);
        return evt.pixGlobalId === globalId;
    }

    const fmt = formatEvent(evt);
    const haystack = [
        fmt.name,
        fmt.call,
        evt.opcodeName,
        evt.blockTypeName,
        evt.userString,
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    return haystack.includes(trimmed.toLowerCase());
}

function applyFilter(filter) {
    currentFilter = filter;
    filteredEvents = getBaseFilteredEvents(filter).filter((evt) => matchesEventSearch(evt, currentSearchQuery));
    renderEventTable(filteredEvents);

    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`.filter-btn[data-filter="${filter}"]`);
    if (activeBtn) activeBtn.classList.add('active');
}

function renderCaptureInfo(header, metadata, dir, events, objInfo, queues) {
    const compBlocks = dir.filter(e => e.blockType === 'COMP').length;
    const dataBlocks = dir.filter(e => e.blockType === 'DATA').length;
    const apiEvents = events.filter(e => e.blockType === 0x3E8 || e.blockType === 0x3E9).length;

    let html = `
        <div class="info-grid">
            <div class="info-item"><span class="info-label">File Version</span><span class="info-value">${header.version}</span></div>
            <div class="info-item"><span class="info-label">File Size</span><span class="info-value">${formatBytes(header.fileSize)}</span></div>
            <div class="info-item"><span class="info-label">Total Blocks</span><span class="info-value">${dir.length} (${compBlocks} compressed, ${dataBlocks} raw)</span></div>
            <div class="info-item"><span class="info-label">API Events</span><span class="info-value">${apiEvents.toLocaleString()}</span></div>
            <div class="info-item"><span class="info-label">All Events (incl. internal)</span><span class="info-value">${events.length.toLocaleString()}</span></div>
            <div class="info-item"><span class="info-label">Named Resources</span><span class="info-value">${resourceNames.size}</span></div>
            <div class="info-item"><span class="info-label">Typed Objects</span><span class="info-value">${objInfo ? objInfo.size : 0}</span></div>
            <div class="info-item"><span class="info-label">Command Queues</span><span class="info-value">${queues ? queues.size : 0}</span></div>
    `;

    if (metadata) {
        if (metadata.gpuName) {
            html += `<div class="info-item"><span class="info-label">GPU</span><span class="info-value">${escapeHtml(metadata.gpuName)}</span></div>`;
        }
        if (metadata.strings) {
            for (const s of metadata.strings) {
                if (s.text.includes('.exe')) {
                    html += `<div class="info-item"><span class="info-label">Application</span><span class="info-value">${escapeHtml(s.text)}</span></div>`;
                    break;
                }
            }
        }
    }

    html += '</div>';

    if (queues && queues.size > 0) {
        html += '<details class="meta-details"><summary>Queue Summary</summary><ul>';
        for (const queue of queues.values()) {
            const details = [];
            if (queue.queueType) details.push(`type=${escapeHtml(queue.queueType)}`);
            if (queue.queueNodeMask != null) details.push(`nodeMask=0x${(queue.queueNodeMask >>> 0).toString(16).padStart(8, '0')}`);
            if (queue.commandLists && queue.commandLists.length) details.push(`cmdLists=${queue.commandLists.join(', ')}`);
            html += `<li><code>obj#${queue.objectId}</code> ${details.join(' | ')}</li>`;
        }
        html += '</ul></details>';
    }

    if (metadata && metadata.strings && metadata.strings.length > 0) {
        html += '<details class="meta-details"><summary>All Metadata Strings</summary><ul>';
        for (const s of metadata.strings) {
            html += `<li><code>+${s.offset}</code> ${escapeHtml(s.text)}</li>`;
        }
        html += '</ul></details>';
    }

    $('#capture-info').innerHTML = html;
}

function renderBlockMap(dir) {
    const byType = {};
    for (const entry of dir) {
        const key = entry.dirType;
        if (!byType[key]) byType[key] = { entries: [], totalComp: 0, totalDecomp: 0, name: entry.dirTypeName };
        byType[key].entries.push(entry);
        byType[key].totalComp += entry.compSize;
        byType[key].totalDecomp += entry.decompSize;
    }

    let html = '<table class="data-table"><thead><tr><th>Type</th><th>Name</th><th>Blocks</th><th>Compressed</th><th>Decompressed</th><th>Ratio</th></tr></thead><tbody>';
    for (const key of Object.keys(byType).sort((a, b) => Number(a) - Number(b))) {
        const g = byType[key];
        const ratio = g.totalDecomp > 0 ? (g.totalComp / g.totalDecomp * 100).toFixed(1) : '-';
        html += `<tr>
            <td><code>0x${Number(key).toString(16)}</code></td>
            <td>${escapeHtml(g.name)}</td>
            <td>${g.entries.length}</td>
            <td>${formatBytes(g.totalComp)}</td>
            <td>${formatBytes(g.totalDecomp)}</td>
            <td>${ratio}%</td>
        </tr>`;
    }
    html += '</tbody></table>';

    // Visual block strip
    html += '<div class="block-strip">';
    const maxSize = Math.max(...dir.map(e => e.compSize || 1));
    for (const entry of dir) {
        const height = Math.max(2, Math.round((entry.compSize / maxSize) * 30));
        const color = blockTypeColor(entry.dirType);
        html += `<div class="block-bar" style="height:${height}px;background:${color}" title="Block ${entry.index}: ${entry.dirTypeName} (${formatBytes(entry.compSize)})"></div>`;
    }
    html += '</div>';

    $('#block-map').innerHTML = html;
}

function renderEventTable(events) {
    const container = $('#event-table');
    const PAGE_SIZE = 200;
    let currentPage = 0;
    const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
    const isPixView = currentFilter === 'pix';
    const apiEventCount = allEvents.filter(e => e.blockType === 0x3E8 || e.blockType === 0x3E9).length;
    const pixEventCount = allEvents.filter(e => e.isPixGpuVisible).length;
    const baseCount = getBaseFilteredEvents(currentFilter).length;

    function formatVisibility(evt) {
        if (!evt || !evt.pixVisibility) return '-';
        return evt.pixVisibility;
    }

    function recordIdForDisplay(evt) {
        if (!evt) return '';
        if (evt.param1 != null) return evt.param1;
        if (evt.recordId != null) return evt.recordId;
        return '';
    }

    function renderPage(page) {
        const start = page * PAGE_SIZE;
        const end = Math.min(start + PAGE_SIZE, events.length);
        const slice = events.slice(start, end);

        let html = `
            <div class="table-controls">
                <div class="filter-buttons">
                    <button class="filter-btn ${currentFilter === 'api' ? 'active' : ''}" data-filter="api" onclick="applyFilter('api')">API Events (${apiEventCount.toLocaleString()})</button>
                    <button class="filter-btn ${currentFilter === 'pix' ? 'active' : ''}" data-filter="pix" onclick="applyFilter('pix')">PIX Global View (${pixEventCount.toLocaleString()})</button>
                    <button class="filter-btn ${currentFilter === 'all' ? 'active' : ''}" data-filter="all" onclick="applyFilter('all')">All Events (${allEvents.length.toLocaleString()})</button>
                </div>
                <label class="event-search">
                    <span>Search</span>
                    <input id="event-search" type="search" value="${escapeHtml(currentSearchQuery)}" placeholder="Name or Global ID" />
                </label>
                <span>${events.length.toLocaleString()} of ${baseCount.toLocaleString()} events</span>
                <span>Page ${page + 1} of ${totalPages}</span>
                <button id="prev-page" ${page === 0 ? 'disabled' : ''}>Prev</button>
                <button id="next-page" ${page >= totalPages - 1 ? 'disabled' : ''}>Next</button>
            </div>
            ${isPixView ? '<div class="event-note">PIX Global View is derived from the WPIX GPU-visible event order and may still differ from PIX where events are not fully decoded yet.</div>' : ''}
            <div class="event-table-scroll">
            <table class="data-table event-data-table"><thead><tr>
                <th>Global ID</th><th>Visibility</th><th>Event</th><th>Decoded Call</th><th>Opcode</th><th>Record ID</th><th>Block</th><th>Raw Params</th>
            </tr></thead><tbody>`;

        for (let i = 0; i < slice.length; i++) {
            const evt = slice[i];
            const fmt = formatEvent(evt);
            const rawParams = evt.metaParams ? evt.metaParams.join(', ') : '-';
            const notes = fmt.notes && fmt.notes.length
                ? `<div class="event-note">${escapeHtml(fmt.notes.join(' | '))}</div>`
                : '';
            html += `<tr>
                <td class="mono">${evt.pixGlobalId != null ? evt.pixGlobalId.toLocaleString() : ''}</td>
                <td><span class="visibility-badge visibility-${escapeHtml(formatVisibility(evt))}">${escapeHtml(formatVisibility(evt))}</span></td>
                <td><strong>${escapeHtml(fmt.name)}</strong></td>
                <td class="mono">${escapeHtml(fmt.call)}${notes}</td>
                <td><code>${evt.opcode}</code></td>
                <td class="mono">${recordIdForDisplay(evt) !== '' ? String(recordIdForDisplay(evt)) : ''}</td>
                <td><span class="badge" style="background:${blockTypeColor(evt.blockType)}">${evt.blockTypeName}</span></td>
                <td class="mono">${rawParams}</td>
            </tr>`;
        }

        html += '</tbody></table></div>';
        container.innerHTML = html;

        $('#prev-page')?.addEventListener('click', () => { currentPage--; renderPage(currentPage); });
        $('#next-page')?.addEventListener('click', () => { currentPage++; renderPage(currentPage); });
        $('#event-search')?.addEventListener('input', (e) => {
            currentSearchQuery = e.target.value || '';
            applyFilter(currentFilter);
        });
    }

    renderPage(0);
}

// Helpers
function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function blockTypeColor(type) {
    const colors = {
        0x02: '#e74c3c', 0x03: '#e67e22', 0x04: '#f1c40f', 0x05: '#2ecc71',
        0x07: '#1abc9c', 0x08: '#3498db', 0x09: '#9b59b6', 0x0A: '#e91e63',
        0x0B: '#795548', 0x0D: '#607d8b', 0x0E: '#ff9800', 0x0F: '#8bc34a',
        0x64: '#00bcd4', 0x65: '#2196f3', 0xC8: '#ff5722',
        0x12C: '#cddc39', 0x3E8: '#4caf50', 0x3E9: '#009688',
        0x7D0: '#673ab7', 0x2710: '#f44336', 0x2711: '#3f51b5', 0x2712: '#9e9e9e',
    };
    return colors[type] || '#666';
}

function showStatus(msg) {
    const el = $('#status');
    el.textContent = msg;
    el.classList.remove('error');
}

function showError(msg) {
    const el = $('#status');
    el.textContent = msg;
    el.classList.add('error');
}

function yieldToUI() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

document.addEventListener('DOMContentLoaded', init);

