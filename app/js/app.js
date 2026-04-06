/** Main application controller */

let parser = null;
let directory = null;
let headerInfo = null;
let captureMetadata = null;
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
let descriptorHeapSetInfo = { byEventKey: new Map(), bySetId: new Map() };
let pixBundleInfo = { bundleByEventKey: new Map(), executeByEventKey: new Map() };
let bufferViewInfo = { labelsByKey: new Map() };
let rasterStateInfo = { viewportHistoryByCommandList: new Map() };
let resourceInfo = new Map();
let currentSearchQuery = '';
let selectedEventKey = null;
let selectedObjectId = null;
let dockviewApi = null;
let workspacePanelSubscriptions = [];
const WORKSPACE_LAYOUT_STORAGE_KEY = 'wpix-viewer.dockview-layout.v1';
const WORKSPACE_PANEL_DEFS = {
    capture: { title: 'Capture Info', contentId: 'capture-info' },
    blocks: { title: 'Block Map', contentId: 'block-map' },
    resources: { title: 'Resources', contentId: 'resource-table' },
    events: { title: 'Events', contentId: 'event-table' },
    'event-browser': { title: 'Event Browser', contentId: 'event-browser' },
    'object-browser': { title: 'Object Browser', contentId: 'object-browser' },
};

function getPixSortKey(evt) {
    if (evt == null) return Number.MAX_SAFE_INTEGER;
    if (evt.param1 != null && Number.isFinite(evt.param1)) return evt.param1;
    if (evt.recordId != null && Number.isFinite(evt.recordId)) return evt.recordId;
    if (evt.sequence != null && Number.isFinite(evt.sequence)) return 1000000000 + evt.sequence;
    return Number.MAX_SAFE_INTEGER;
}

function $(sel) { return document.querySelector(sel); }

function isDesktopWorkspaceMode() {
    return window.matchMedia('(min-width: 1181px)').matches;
}

function canMeasureWorkspace() {
    const desktop = $('#workspace-desktop');
    const results = $('#results-section');
    if (!desktop || !results) return false;
    if (!isDesktopWorkspaceMode()) return false;
    if (results.offsetParent == null) return false;
    return desktop.clientWidth >= 320 && desktop.clientHeight >= 240;
}

function getDockviewLibrary() {
    return window['dockview-core'];
}

function saveWorkspaceLayout() {
    if (!dockviewApi) return;
    try {
        localStorage.setItem(WORKSPACE_LAYOUT_STORAGE_KEY, JSON.stringify(dockviewApi.toJSON()));
    } catch (_error) {
        // Ignore storage failures. The workspace still works without persistence.
    }
}

function loadWorkspaceLayout() {
    try {
        const raw = localStorage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_error) {
        return null;
    }
}

function clearWorkspaceLayout() {
    try {
        localStorage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY);
    } catch (_error) {
        // Ignore storage failures.
    }
}

class WorkspacePanelRenderer {
    constructor(panelId) {
        const definition = WORKSPACE_PANEL_DEFS[panelId];
        this.panelId = panelId;
        this.element = document.createElement('div');
        this.element.className = `workspace-panel-host workspace-panel-${panelId}`;

        const body = document.createElement('div');
        body.className = panelId === 'events' ? 'workspace-panel-body workspace-panel-body-events' : 'workspace-panel-body';

        const content = document.createElement('div');
        content.id = definition.contentId;
        if (panelId === 'events') content.className = 'workspace-panel-events-content';
        body.appendChild(content);
        this.element.appendChild(body);
    }

    init() {}
    layout() {}
    update() {}
    focus() {}
    toJSON() { return { panelId: this.panelId }; }
    dispose() {}
}

function createWorkspacePanelRenderer(options) {
    const panelId = options.id;
    if (!WORKSPACE_PANEL_DEFS[panelId]) {
        throw new Error(`Unknown workspace panel '${panelId}'`);
    }
    return new WorkspacePanelRenderer(panelId);
}

function disposeWorkspacePanelSubscriptions() {
    for (const subscription of workspacePanelSubscriptions) {
        try {
            subscription?.dispose?.();
        } catch (_error) {
            // Ignore cleanup failures.
        }
    }
    workspacePanelSubscriptions = [];
}

function getWorkspacePanelContainer(panelId) {
    const definition = WORKSPACE_PANEL_DEFS[panelId];
    return definition ? document.getElementById(definition.contentId) : null;
}

function renderWorkspacePanelById(panelId) {
    if (!headerInfo || !directory) return;

    switch (panelId) {
    case 'capture':
        renderCaptureInfo(headerInfo, captureMetadata, directory, allEvents, objectInfo, queueInfo);
        break;
    case 'blocks':
        renderBlockMap(directory);
        break;
    case 'resources':
        renderResourceTable(resourceInfo);
        break;
    case 'events':
        applyFilter(currentFilter || 'pix');
        break;
    case 'event-browser':
        renderEventBrowserPanel();
        break;
    case 'object-browser':
        renderObjectBrowserPanel();
        break;
    default:
        break;
    }
}

function scheduleWorkspacePanelRender(panelId, attempt = 0) {
    if (!WORKSPACE_PANEL_DEFS[panelId]) return;
    if (getWorkspacePanelContainer(panelId)) {
        renderWorkspacePanelById(panelId);
        return;
    }
    if (attempt >= 8) return;
    requestAnimationFrame(() => scheduleWorkspacePanelRender(panelId, attempt + 1));
}

function bindWorkspacePanelActivation() {
    disposeWorkspacePanelSubscriptions();
    if (!dockviewApi) return;

    for (const panelId of Object.keys(WORKSPACE_PANEL_DEFS)) {
        const panel = dockviewApi.getPanel(panelId);
        if (!panel?.api || typeof panel.api.onDidActiveChange !== 'function') continue;
        const subscription = panel.api.onDidActiveChange((event) => {
            if (event?.isActive) {
                scheduleWorkspacePanelRender(panelId);
            }
        });
        workspacePanelSubscriptions.push(subscription);
    }
}

function buildDefaultDockviewLayout() {
    if (!dockviewApi) return;
    const desktop = $('#workspace-desktop');
    const desktopWidth = Math.max(960, desktop?.clientWidth || 0);
    const desktopHeight = Math.max(540, desktop?.clientHeight || 0);
    const leftWidth = Math.max(260, Math.round(desktopWidth * 0.25));
    const centerWidth = Math.max(420, Math.round(desktopWidth * 0.5));
    const rightWidth = Math.max(260, Math.round(desktopWidth * 0.25));
    const rightTopHeight = Math.max(220, Math.round(desktopHeight * 0.5));
    const rightBottomHeight = Math.max(220, desktopHeight - rightTopHeight);

    dockviewApi.clear();
    const eventsPanel = dockviewApi.addPanel({
        id: 'events',
        component: 'workspace-panel',
        title: WORKSPACE_PANEL_DEFS.events.title,
        params: { panelId: 'events' },
        initialWidth: centerWidth,
    });
    const eventBrowserPanel = dockviewApi.addPanel({
        id: 'event-browser',
        component: 'workspace-panel',
        title: WORKSPACE_PANEL_DEFS['event-browser'].title,
        params: { panelId: 'event-browser' },
        initialWidth: leftWidth,
        position: { referencePanel: 'events', direction: 'left' },
    });
    dockviewApi.addPanel({
        id: 'object-browser',
        component: 'workspace-panel',
        title: WORKSPACE_PANEL_DEFS['object-browser'].title,
        params: { panelId: 'object-browser' },
        position: { referencePanel: 'event-browser', direction: 'within' },
    });
    const resourcesPanel = dockviewApi.addPanel({
        id: 'resources',
        component: 'workspace-panel',
        title: WORKSPACE_PANEL_DEFS.resources.title,
        params: { panelId: 'resources' },
        initialWidth: rightWidth,
        position: { referencePanel: 'events', direction: 'right' },
    });
    const capturePanel = dockviewApi.addPanel({
        id: 'capture',
        component: 'workspace-panel',
        title: WORKSPACE_PANEL_DEFS.capture.title,
        params: { panelId: 'capture' },
        initialHeight: rightBottomHeight,
        position: { referencePanel: 'resources', direction: 'below' },
    });
    dockviewApi.addPanel({
        id: 'blocks',
        component: 'workspace-panel',
        title: WORKSPACE_PANEL_DEFS.blocks.title,
        params: { panelId: 'blocks' },
        position: { referencePanel: 'capture', direction: 'within' },
    });

    eventBrowserPanel.group.api.setSize({ width: leftWidth });
    eventsPanel.group.api.setSize({ width: centerWidth });
    resourcesPanel.group.api.setSize({ width: rightWidth, height: rightTopHeight });
    capturePanel.group.api.setSize({ height: rightBottomHeight });
}

function refreshWorkspacePanels() {
    if (!headerInfo || !directory) return;
    renderWorkspacePanelById('capture');
    renderWorkspacePanelById('blocks');
    renderWorkspacePanelById('resources');
    renderWorkspacePanelById('events');
    renderWorkspacePanelById('event-browser');
    renderWorkspacePanelById('object-browser');
}

function resetWorkspaceLayout(useSavedLayout = true) {
    const api = ensureDockviewWorkspace();
    if (!api) return;

    if (useSavedLayout) {
        const savedLayout = loadWorkspaceLayout();
        if (savedLayout) {
            try {
                api.fromJSON(savedLayout);
                bindWorkspacePanelActivation();
                refreshWorkspacePanels();
                return;
            } catch (error) {
                console.warn('Dockview layout restore failed, rebuilding default layout.', error);
            }
        }
    }

    buildDefaultDockviewLayout();
    bindWorkspacePanelActivation();
    refreshWorkspacePanels();
    saveWorkspaceLayout();
}

function ensureDockviewWorkspace() {
    if (dockviewApi) return dockviewApi;
    const desktop = $('#workspace-desktop');
    const dockview = getDockviewLibrary();
    if (!desktop || !dockview || typeof dockview.createDockview !== 'function') return null;

    dockviewApi = dockview.createDockview(desktop, {
        createComponent: createWorkspacePanelRenderer,
        noPanelsOverlay: 'emptyGroup',
        disableFloatingGroups: true,
        className: 'wpix-dockview',
        defaultHeaderPosition: 'top',
        tabAnimation: 'default',
    });

    dockviewApi.onDidLayoutChange(() => {
        if (dockviewApi && dockviewApi.totalPanels > 0) {
            saveWorkspaceLayout();
        }
    });

    return dockviewApi;
}

function initWorkspace() {
    const desktop = $('#workspace-desktop');
    if (!desktop) return;

    $('#reset-layout-btn')?.addEventListener('click', () => {
        clearWorkspaceLayout();
        resetWorkspaceLayout(false);
        focusWindowById('events');
    });

    desktop.addEventListener('click', (event) => {
        const objectRef = event.target.closest('.ref-object');
        if (objectRef) {
            event.preventDefault();
            openObjectWindow(Number(objectRef.dataset.objectId));
            return;
        }

        const eventRef = event.target.closest('.ref-event');
        if (eventRef) {
            event.preventDefault();
            openEventWindowByRecordId(Number(eventRef.dataset.recordId));
        }
    });

    window.addEventListener('resize', () => {
        if (dockviewApi && canMeasureWorkspace()) {
            dockviewApi.layout(desktop.clientWidth, desktop.clientHeight, true);
        }
    });
}

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

    initWorkspace();
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
    captureMetadata = metadata;

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
    descriptorHeapSetInfo = WPixEventDecoder.buildDescriptorHeapSetInfo(allEvents);
    pixBundleInfo = WPixEventDecoder.buildPixBundleInfo(allEvents);
    bufferViewInfo = WPixEventDecoder.buildBufferViewInfo(allEvents, descriptorInfo);
    rasterStateInfo = WPixEventDecoder.buildRasterStateInfo(allEvents, { resourceInfo });
    selectedEventKey = null;
    selectedObjectId = null;

    for (const evt of allEvents) {
        const decoded = WPixEventDecoder.decodeEvent(evt, { resourceNames, eventDetailsByRecordId, objectInfo, resolveQueryInfo, signalInfo, descriptorInfo, descriptorHeapSetInfo, pixBundleInfo, bufferViewInfo, rasterStateInfo });
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
    $('#results-section').style.display = 'flex';
    ensureDockviewWorkspace();
    if (!dockviewApi || dockviewApi.totalPanels === 0) {
        resetWorkspaceLayout();
    }

    renderCaptureInfo(headerInfo, captureMetadata, directory, allEvents, objectInfo, queueInfo);
    renderBlockMap(directory);
    renderResourceTable(resourceInfo);
    applyFilter('pix');
    renderObjectBrowserPanel();
    requestAnimationFrame(() => {
        if (dockviewApi && canMeasureWorkspace()) {
            dockviewApi.layout($('#workspace-desktop').clientWidth, $('#workspace-desktop').clientHeight, true);
        }
        focusWindowById('events');
    });
    showStatus(`${allEvents.length.toLocaleString()} events • ${directory.length} blocks`);
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
            <td>${objectRefButton(texture.objectId, `obj#${texture.objectId}`)}</td>
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
            <td>${texture.heapObjectId != null ? objectRefButton(texture.heapObjectId, `obj#${texture.heapObjectId}`) : ''}</td>
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
    return WPixEventDecoder.decodeEvent(evt, { resourceNames, eventDetailsByRecordId, objectInfo, resolveQueryInfo, signalInfo, descriptorInfo, descriptorHeapSetInfo, pixBundleInfo, bufferViewInfo, rasterStateInfo });
}

function focusWindowById(windowId) {
    const panel = dockviewApi?.getPanel(windowId);
    panel?.api.setActive();
}

function objectRefButton(id, label) {
    if (id == null || !Number.isFinite(Number(id))) return escapeHtml(String(label || ''));
    const display = label || `obj#${id}`;
    return `<button type="button" class="ref-link ref-object mono" data-object-id="${Number(id)}">${escapeHtml(display)}</button>`;
}

function eventRefButton(recordId, label) {
    if (recordId == null || !Number.isFinite(Number(recordId))) return escapeHtml(String(label || ''));
    const display = label || `RecordId ${recordId}`;
    return `<button type="button" class="ref-link ref-event mono" data-record-id="${Number(recordId)}">${escapeHtml(display)}</button>`;
}

function renderReferenceMarkup(text) {
    const source = String(text == null ? '' : text);
    if (!source) return '';

    const pattern = /(obj#(\d+)(?:\s*<[^>]+>)?)|(RecordId(?:=|:|\s+)(\d+))/g;
    let result = '';
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(source)) !== null) {
        result += escapeHtml(source.slice(lastIndex, match.index));
        if (match[1]) {
            result += objectRefButton(Number(match[2]), match[1]);
        } else if (match[3]) {
            result += eventRefButton(Number(match[4]), match[3]);
        }
        lastIndex = pattern.lastIndex;
    }

    result += escapeHtml(source.slice(lastIndex));
    return result;
}

function collectObjectIdsFromText(text, output) {
    const source = String(text == null ? '' : text);
    const target = output || new Set();
    const pattern = /obj#(\d+)/g;
    let match;
    while ((match = pattern.exec(source)) !== null) {
        target.add(Number(match[1]));
    }
    return target;
}

function collectObjectIdsFromValue(value, output) {
    const target = output || new Set();
    if (value == null) return target;
    if (Array.isArray(value)) {
        value.forEach((entry) => collectObjectIdsFromValue(entry, target));
        return target;
    }
    if (typeof value === 'object') {
        Object.values(value).forEach((entry) => collectObjectIdsFromValue(entry, target));
        return target;
    }
    if (typeof value === 'string') {
        collectObjectIdsFromText(value, target);
    }
    return target;
}

function collectEventObjectIds(evt) {
    if (evt && evt._objectRefs instanceof Set) return evt._objectRefs;
    const target = new Set();
    if (!evt) return target;
    if (evt.objectId != null && Number.isFinite(Number(evt.objectId))) target.add(Number(evt.objectId));
    collectObjectIdsFromText(evt.call, target);
    collectObjectIdsFromText(evt.userString, target);
    collectObjectIdsFromValue(evt.args, target);
    collectObjectIdsFromValue(evt.notes, target);
    collectObjectIdsFromValue(buildStructuredEventFields(evt), target);
    evt._objectRefs = target;
    return target;
}

function findEventBySelectionKey(key, events = allEvents) {
    if (!key || !events) return null;
    return events.find((evt) => getEventSelectionKey(evt) === key) || null;
}

function openObjectWindow(objectId) {
    if (objectId == null || !Number.isFinite(objectId)) return;
    selectedObjectId = objectId;
    renderObjectBrowserPanel();
    focusWindowById('object-browser');
}

function openEventWindowByRecordId(recordId) {
    if (recordId == null || !Number.isFinite(recordId)) return;
    const evt = allEvents.find((candidate) => candidate.param1 === recordId || candidate.recordId === recordId);
    if (!evt) return;
    selectedEventKey = getEventSelectionKey(evt);
    const isVisibleInCurrentView = filteredEvents.some((candidate) => getEventSelectionKey(candidate) === selectedEventKey);
    if (!isVisibleInCurrentView) {
        currentSearchQuery = '';
        applyFilter(evt.isPixGpuVisible ? 'pix' : 'all');
    } else {
        renderEventTable(filteredEvents);
        renderEventBrowserPanel();
    }
    focusWindowById('events');
    renderEventBrowserPanel();
    focusWindowById('event-browser');
}

function shortenEventListText(value, maxLength) {
    const text = String(value == null ? '' : value);
    if (text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
}

function buildEventListSummary(fmt) {
    if (!fmt) return '';
    const args = Array.isArray(fmt.args) ? fmt.args : [];
    if (args.length === 0) return fmt.name || '';

    const maxArgs = 3;
    const parts = args.slice(0, maxArgs).map((arg) => {
        const name = arg && arg.name ? arg.name : 'arg';
        const display = shortenEventListText(arg && arg.display != null ? arg.display : arg && arg.value, 28);
        return `${name}:${display}`;
    });

    let summary = `${fmt.name}(${parts.join(', ')}`;
    if (args.length > maxArgs) summary += `, +${args.length - maxArgs} more`;
    summary += ')';
    return shortenEventListText(summary, 120);
}

function getEventSelectionKey(evt) {
    if (!evt) return null;
    if (evt.sequence != null) return `seq:${evt.sequence}`;
    if (evt.param1 != null) return `rid:${evt.param1}`;
    if (evt.recordId != null) return `record:${evt.recordId}`;
    if (evt.blockIndex != null && evt.offset != null) return `block:${evt.blockIndex}:offset:${evt.offset}`;
    return null;
}

function getSelectedEventIndex(events) {
    if (!events || events.length === 0) return -1;
    if (!selectedEventKey) {
        selectedEventKey = getEventSelectionKey(events[0]);
        return 0;
    }
    const index = events.findIndex((evt) => getEventSelectionKey(evt) === selectedEventKey);
    if (index !== -1) return index;
    selectedEventKey = getEventSelectionKey(events[0]);
    return 0;
}

function renderInspectorFacts(items) {
    const rows = items.filter((item) => item && item.value != null && item.value !== '');
    if (rows.length === 0) return '<div class="event-browser-empty">No structured facts available for this event.</div>';
    return `<div class="event-fact-grid">${rows.map((item) => `
        <div class="event-fact">
            <div class="event-fact-label">${escapeHtml(item.label)}</div>
            <div class="event-fact-value ${item.mono ? 'mono' : ''}">${renderReferenceMarkup(String(item.value))}</div>
        </div>
    `).join('')}</div>`;
}

function renderPrimitiveReference(keyName, value, fallbackDisplay) {
    const normalizedKey = String(keyName || '').toLowerCase();
    const display = fallbackDisplay != null ? String(fallbackDisplay) : String(value);
    if (Number.isFinite(Number(value))) {
        if (normalizedKey === 'recordid' || normalizedKey.endsWith('recordid')) {
            return eventRefButton(Number(value), display || `RecordId ${Number(value)}`);
        }
        if (normalizedKey === 'objectid' || normalizedKey.endsWith('objectid')) {
            return objectRefButton(Number(value), display || `obj#${Number(value)}`);
        }
    }

    return renderReferenceMarkup(display);
}

function isArgumentTreeBranchValue(value) {
    if (value == null) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return false;
}

function renderArgumentTreeValue(value, fallbackDisplay, depth = 0, keyName = '') {
    const safeDisplay = fallbackDisplay != null ? String(fallbackDisplay) : '';
    if (value == null) {
        return `<span class="arg-tree-leaf mono">${escapeHtml(safeDisplay || 'null')}</span>`;
    }

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return '<span class="arg-tree-leaf mono">[]</span>';
        }
        return `
            <div class="arg-tree-group" data-depth="${depth}">
                <div class="arg-tree-children">
                    ${value.map((entry, index) => `
                        <div class="arg-tree-node">
                            <div class="arg-tree-row ${isArgumentTreeBranchValue(entry) ? 'arg-tree-row-branch' : 'arg-tree-row-leaf'}">
                                <span class="arg-tree-key mono">[${index}]</span>
                                <div class="arg-tree-value">${renderArgumentTreeValue(entry, null, depth + 1, '')}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    }

    if (typeof value === 'object') {
        const entries = Object.entries(value);
        if (entries.length === 0) {
            return '<span class="arg-tree-leaf mono">{}</span>';
        }
        return `
            <div class="arg-tree-group" data-depth="${depth}">
                <div class="arg-tree-children">
                    ${entries.map(([key, entryValue]) => `
                        <div class="arg-tree-node">
                            <div class="arg-tree-row ${isArgumentTreeBranchValue(entryValue) ? 'arg-tree-row-branch' : 'arg-tree-row-leaf'}">
                                <span class="arg-tree-key mono">${escapeHtml(key)}</span>
                                <div class="arg-tree-value">${renderArgumentTreeValue(entryValue, null, depth + 1, key)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    }

    const leafText = safeDisplay || String(value);
    return `<span class="arg-tree-leaf ${String(value).length > 48 ? 'mono' : ''}">${renderPrimitiveReference(keyName, value, leafText)}</span>`;
}

function renderInspectorArgTable(args) {
    if (!args || args.length === 0) return '<div class="event-browser-empty">No decoded arguments were exposed for this event.</div>';
    return `
        <div class="event-arg-tree-scroll">
            <div class="event-arg-tree">
                ${args.map((arg) => `
                    <div class="event-arg-item">
                        <div class="event-arg-name mono">${escapeHtml(arg.name)}</div>
                        <div class="event-arg-body">${renderArgumentTreeValue(arg.value, arg.display, 0, arg.name)}</div>
                    </div>
                `).join('')}
            </div>
        </div>`;
}

function renderInspectorList(items) {
    if (!items || items.length === 0) return '<div class="event-browser-empty">No additional notes.</div>';
    return `<ul class="event-browser-list">${items.map((item) => `<li>${renderReferenceMarkup(String(item))}</li>`).join('')}</ul>`;
}

function renderInspectorJson(value, emptyMessage) {
    if (!value || (typeof value === 'object' && Object.keys(value).length === 0)) {
        return `<div class="event-browser-empty">${escapeHtml(emptyMessage)}</div>`;
    }
    return `<pre class="event-json">${escapeHtml(JSON.stringify(value, null, 2))}</pre>`;
}

function normalizeArgumentName(name) {
    return String(name || '').trim().toLowerCase();
}

function isSecondaryDecodedArgument(arg, allArgs) {
    const name = normalizeArgumentName(arg?.name);
    if (!name) return false;
    if (name === 'this') return true;

    if (name.startsWith('num') && name.length > 3) {
        const suffix = name.slice(3);
        const hasRelatedPointerArg = allArgs.some((candidate) => {
            const candidateName = normalizeArgumentName(candidate?.name);
            return candidateName === `p${suffix}` || candidateName === `pp${suffix}` || candidateName.endsWith(suffix);
        });
        if (hasRelatedPointerArg) return true;
    }

    if (name.endsWith('count') && name.length > 5) {
        const suffix = name.slice(0, -5);
        const hasRelatedCollectionArg = allArgs.some((candidate) => {
            const candidateName = normalizeArgumentName(candidate?.name);
            return candidateName !== name && suffix && candidateName.includes(suffix);
        });
        if (hasRelatedCollectionArg) return true;
    }

    return false;
}

function getPrimaryDecodedArguments(args) {
    const list = Array.isArray(args) ? args.filter(Boolean) : [];
    const primary = list.filter((arg) => !isSecondaryDecodedArgument(arg, list));
    return primary.length > 0 ? primary : list.filter((arg) => normalizeArgumentName(arg?.name) !== 'this');
}

function getEventTargetDisplay(evt, args) {
    if (evt?.objectId != null && Number.isFinite(Number(evt.objectId))) {
        return `obj#${Number(evt.objectId)}`;
    }

    const thisArg = (Array.isArray(args) ? args : []).find((arg) => normalizeArgumentName(arg?.name) === 'this');
    if (!thisArg) return '';
    if (thisArg.display != null && String(thisArg.display).trim()) return String(thisArg.display);
    if (thisArg.value != null) return String(thisArg.value);
    return '';
}

function buildEventOverviewFacts(evt, args) {
    const facts = [];
    const target = getEventTargetDisplay(evt, args);
    if (target) facts.push({ label: 'Target', value: target });
    if (evt?.userString) facts.push({ label: 'Label', value: evt.userString });
    if (evt?.embeddedStrings && evt.embeddedStrings.length === 1) {
        facts.push({ label: 'String', value: evt.embeddedStrings[0] });
    } else if (evt?.embeddedStrings && evt.embeddedStrings.length > 1) {
        facts.push({ label: 'Strings', value: evt.embeddedStrings.join(' | ') });
    }
    if (evt?.pixGlobalId != null) facts.push({ label: 'Global ID', value: evt.pixGlobalId, mono: true });
    return facts;
}

function buildEventStructuredFieldGroups(evt) {
    const fields = buildStructuredEventFields(evt);
    const important = {};
    const lowLevel = {};

    for (const [key, value] of Object.entries(fields)) {
        if (/(raw|word)$/i.test(key)) {
            lowLevel[key] = value;
        } else {
            important[key] = value;
        }
    }

    return { important, lowLevel };
}

function buildStructuredEventFields(evt) {
    if (!evt) return {};
    const ignored = new Set([
        'offset',
        'metaOffset',
        'recordSize',
        'dataSize',
        'payloadSize',
        'payloadPreviewU32',
        'metaParams',
        'coreMetaCount',
        'coreMetaParams',
        'param1',
        'param2',
        'opcode',
        'sequence',
        'blockIndex',
        'blockType',
        'blockTypeName',
        'pixGlobalId',
        'pixVisibility',
        'pixVisibilityReason',
        'isPixGpuVisible',
        'pixSortKey',
        'recordId',
        'decodedName',
        'call',
        'args',
        'notes',
        '_decoded',
    ]);

    const fields = {};
    for (const [key, value] of Object.entries(evt)) {
        if (ignored.has(key) || key.startsWith('_')) continue;
        if (value == null) continue;
        if (Array.isArray(value) && value.length === 0) continue;
        fields[key] = value;
    }
    return fields;
}

function renderEventBrowserContent(evt, absoluteIndex, totalCount) {
    if (!evt) {
        return `
            <div class="event-browser-inspector">
                <div class="event-browser-empty-state">
                    <h3>Event Browser</h3>
                    <p>Select an event from the table to inspect its decoded structure.</p>
                </div>
            </div>`;
    }

    const fmt = formatEvent(evt);
    const recordId = evt.param1 != null ? evt.param1 : (evt.recordId != null ? evt.recordId : '');
    const allArgs = fmt.args || [];
    const primaryArgs = getPrimaryDecodedArguments(allArgs);
    const facts = buildEventOverviewFacts(evt, allArgs);

    const technicalFacts = [
        { label: 'Selection', value: `${absoluteIndex + 1} / ${totalCount}` },
        { label: 'Sequence', value: evt.sequence, mono: true },
        { label: 'Global ID', value: evt.pixGlobalId != null ? evt.pixGlobalId : '', mono: true },
        { label: 'Visibility', value: evt.pixVisibility || '' },
        { label: 'Block', value: evt.blockTypeName || '' },
        { label: 'Record ID', value: recordId, mono: true },
        { label: 'Opcode', value: evt.opcode, mono: true },
        { label: 'Payload Size', value: evt.dataSize != null ? evt.dataSize : '' },
    ];

    const rawFacts = [
        { label: 'Meta Params', value: evt.metaParams && evt.metaParams.length ? evt.metaParams.join(', ') : '' , mono: true },
        { label: 'Core Meta', value: evt.coreMetaParams && evt.coreMetaParams.length ? evt.coreMetaParams.join(', ') : '' , mono: true },
        { label: 'Payload Preview', value: evt.payloadPreviewU32 && evt.payloadPreviewU32.length ? evt.payloadPreviewU32.join(', ') : '' , mono: true },
        { label: 'User String', value: evt.userString || '' },
        { label: 'Embedded Strings', value: evt.embeddedStrings && evt.embeddedStrings.length ? evt.embeddedStrings.join(' | ') : '' },
    ];

    const structuredFieldGroups = buildEventStructuredFieldGroups(evt);
    const hasExtraArgs = primaryArgs.length !== allArgs.length;
    const hasImportantStructuredFields = Object.keys(structuredFieldGroups.important).length > 0;
    const hasLowLevelStructuredFields = Object.keys(structuredFieldGroups.lowLevel).length > 0;
    const hasRawFacts = rawFacts.some((item) => item && item.value != null && item.value !== '');
    const hasNotes = Array.isArray(fmt.notes) && fmt.notes.length > 0;

    return `
        <div class="event-browser-inspector">
            <div class="event-browser-header">
                <div>
                    <div class="event-browser-kicker">Event Browser</div>
                    <h3>${escapeHtml(fmt.name)}</h3>
                </div>
                <span class="visibility-badge visibility-${escapeHtml(evt.pixVisibility || 'internal')}">${escapeHtml(evt.pixVisibility || 'internal')}</span>
            </div>

            ${facts.length > 0 ? `
                <section class="event-browser-section">
                    <h4>Overview</h4>
                    ${renderInspectorFacts(facts)}
                </section>` : ''}

            <section class="event-browser-section">
                <h4>Function Parameters</h4>
                ${renderInspectorArgTable(primaryArgs)}
            </section>

            <section class="event-browser-section">
                <h4>Decoded Call</h4>
                <div class="event-call-block mono">${renderReferenceMarkup(fmt.call)}</div>
            </section>

            ${hasImportantStructuredFields ? `
                <section class="event-browser-section">
                    <h4>Dependencies</h4>
                    <div class="event-arg-body">${renderArgumentTreeValue(structuredFieldGroups.important, null, 0, 'structuredFields')}</div>
                </section>` : ''}

            ${hasNotes ? `
                <section class="event-browser-section">
                    <h4>Decoder Notes</h4>
                    ${renderInspectorList(fmt.notes || [])}
                </section>` : ''}

            ${hasExtraArgs ? `
                <details class="event-browser-section">
                    <summary>All Decoded Arguments</summary>
                    ${renderInspectorArgTable(allArgs)}
                </details>` : ''}

            <details class="event-browser-section">
                <summary>Technical Details</summary>
                ${renderInspectorFacts(technicalFacts)}
            </details>

            ${hasRawFacts ? `
                <details class="event-browser-section">
                    <summary>Raw Metadata</summary>
                    ${renderInspectorFacts(rawFacts)}
                </details>` : ''}

            ${hasLowLevelStructuredFields ? `
                <details class="event-browser-section">
                    <summary>Low-Level Fields</summary>
                    <div class="event-arg-body">${renderArgumentTreeValue(structuredFieldGroups.lowLevel, null, 0, 'structuredFields')}</div>
                </details>` : ''}

            <details class="event-browser-section">
                <summary>Raw Event JSON</summary>
                ${renderInspectorJson({
                    sequence: evt.sequence,
                    pixGlobalId: evt.pixGlobalId,
                    pixVisibility: evt.pixVisibility,
                    opcode: evt.opcode,
                    param1: evt.param1,
                    param2: evt.param2,
                    recordId,
                    blockType: evt.blockType,
                    blockTypeName: evt.blockTypeName,
                    metaParams: evt.metaParams || [],
                    coreMetaParams: evt.coreMetaParams || [],
                    payloadPreviewU32: evt.payloadPreviewU32 || [],
                    structuredFields: {
                        ...structuredFieldGroups.important,
                        ...structuredFieldGroups.lowLevel,
                    },
                }, 'No raw event data.')}
            </details>
        </div>`;
}

function renderEventBrowserPanel() {
    const container = $('#event-browser');
    if (!container) return;
    const selectedEvent = findEventBySelectionKey(selectedEventKey, allEvents);
    const absoluteIndex = selectedEvent ? Math.max(0, allEvents.findIndex((evt) => getEventSelectionKey(evt) === selectedEventKey)) : -1;
    container.innerHTML = renderEventBrowserContent(selectedEvent, absoluteIndex, allEvents.length);
}

function renderObjectBrowserContent(objectId) {
    if (objectId == null) {
        return `
            <div class="event-browser-inspector">
                <div class="event-browser-empty-state">
                    <h3>Object Browser</h3>
                    <p>Click any <code>obj#...</code> reference to inspect the decoded object, resource, or queue metadata here.</p>
                </div>
            </div>`;
    }

    const object = objectInfo.get(objectId) || { objectId };
    const resource = resourceInfo.get(objectId) || null;
    const queue = queueInfo.get(objectId) || null;
    const relatedObjects = [
        object.linkedObjectId != null ? { label: 'Linked Object', value: `obj#${object.linkedObjectId}` } : null,
        object.originalObjectId != null ? { label: 'Original Object', value: `obj#${object.originalObjectId}` } : null,
        resource && resource.heapObjectId != null ? { label: 'Heap', value: `obj#${resource.heapObjectId}` } : null,
    ].filter(Boolean);

    const relatedEvents = [];
    for (const evt of allEvents) {
        if (relatedEvents.length >= 18) break;
        const objectIds = collectEventObjectIds(evt);
        if (objectIds.has(objectId)) {
            relatedEvents.push(evt);
        }
    }

    const summaryFacts = [
        { label: 'Object', value: `obj#${objectId}` },
        { label: 'Name', value: object.resourceName || resource?.resourceName || '' },
        { label: 'Interface', value: object.interfaceName || '' },
        { label: 'Record ID', value: object.recordId != null ? String(object.recordId) : '' },
        { label: 'Source Opcode', value: object.sourceOpcode != null ? String(object.sourceOpcode) : '' },
    ];

    const resourceFacts = resource ? [
        { label: 'Creation', value: resource.creationType || '' },
        { label: 'Dimension', value: resource.dimension || '' },
        { label: 'Format', value: resource.format || resource.inferredFormat || '' },
        { label: 'Size', value: resource.width != null ? `${resource.width} x ${resource.height || 1}` : '' },
        { label: 'Mips', value: resource.mipLevels != null ? String(resource.mipLevels) : '' },
        { label: 'Array', value: resource.arrayCount != null ? String(resource.arrayCount) : '' },
        { label: 'Layout', value: resource.layout || '' },
    ] : [];

    const queueFacts = queue ? [
        { label: 'Queue Type', value: queue.queueType || '' },
        { label: 'Node Mask', value: queue.queueNodeMask != null ? `0x${(queue.queueNodeMask >>> 0).toString(16).padStart(8, '0')}` : '' },
        { label: 'Command Lists', value: queue.commandLists && queue.commandLists.length ? queue.commandLists.map((id) => `obj#${id}`).join(', ') : '' },
        { label: 'Fences', value: queue.fences && queue.fences.length ? queue.fences.map((id) => `obj#${id}`).join(', ') : '' },
    ] : [];

    return `
        <div class="event-browser-inspector">
            <div class="event-browser-header">
                <div>
                    <div class="event-browser-kicker">Object Browser</div>
                    <h3>${renderReferenceMarkup(`obj#${objectId}`)}</h3>
                </div>
            </div>

            <section class="event-browser-section">
                <h4>Overview</h4>
                ${renderInspectorFacts(summaryFacts)}
            </section>

            ${relatedObjects.length > 0 ? `
                <section class="event-browser-section">
                    <h4>Related Objects</h4>
                    ${renderInspectorFacts(relatedObjects)}
                </section>` : ''}

            ${resourceFacts.length > 0 ? `
                <section class="event-browser-section">
                    <h4>Resource Details</h4>
                    ${renderInspectorFacts(resourceFacts)}
                </section>` : ''}

            ${queueFacts.length > 0 ? `
                <section class="event-browser-section">
                    <h4>Queue Details</h4>
                    ${renderInspectorFacts(queueFacts)}
                </section>` : ''}

            <section class="event-browser-section">
                <h4>Related Events</h4>
                ${relatedEvents.length === 0
                    ? '<div class="event-browser-empty">No matching events were found for this object yet.</div>'
                    : `<ul class="event-browser-list">${relatedEvents.map((evt) => {
                        const fmt = formatEvent(evt);
                        const recordId = evt.param1 != null ? evt.param1 : evt.recordId;
                        return `<li>${eventRefButton(recordId, `${fmt.name} (RecordId ${recordId})`)}</li>`;
                    }).join('')}</ul>`}
            </section>

            <details class="event-browser-section">
                <summary>Raw Object JSON</summary>
                ${renderInspectorJson({
                    object,
                    resource,
                    queue,
                }, 'No object metadata was decoded.')}
            </details>
        </div>`;
}

function renderObjectBrowserPanel() {
    const container = $('#object-browser');
    if (!container) return;
    container.innerHTML = renderObjectBrowserContent(selectedObjectId);
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
    renderEventBrowserPanel();
    renderObjectBrowserPanel();

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
            if (queue.queueType) details.push(`type=${queue.queueType}`);
            if (queue.queueNodeMask != null) details.push(`nodeMask=0x${(queue.queueNodeMask >>> 0).toString(16).padStart(8, '0')}`);
            if (queue.commandLists && queue.commandLists.length) details.push(`cmdLists=${queue.commandLists.map((id) => `obj#${id}`).join(', ')}`);
            html += `<li>${objectRefButton(queue.objectId, `obj#${queue.objectId}`)} ${renderReferenceMarkup(details.join(' | '))}</li>`;
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

    const container = $('#capture-info');
    if (!container) return;
    container.innerHTML = html;
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

    let html = '<div class="block-map-content">';
    html += '<table class="data-table"><thead><tr><th>Type</th><th>Name</th><th>Blocks</th><th>Compressed</th><th>Decompressed</th><th>Ratio</th></tr></thead><tbody>';
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
    html += '</div>';

    const container = $('#block-map');
    if (!container) return;
    container.innerHTML = html;
}

function renderEventTable(events) {
    const container = $('#event-table');
    const PAGE_SIZE = 200;
    if (!container) return;
    if (!events || events.length === 0) {
        selectedEventKey = null;
        container.innerHTML = `
            <div class="table-controls">
                <div class="filter-buttons">
                    <button class="filter-btn ${currentFilter === 'api' ? 'active' : ''}" data-filter="api" onclick="applyFilter('api')">API Events (${allEvents.filter(e => e.blockType === 0x3E8 || e.blockType === 0x3E9).length.toLocaleString()})</button>
                    <button class="filter-btn ${currentFilter === 'pix' ? 'active' : ''}" data-filter="pix" onclick="applyFilter('pix')">PIX Global View (${allEvents.filter(e => e.isPixGpuVisible).length.toLocaleString()})</button>
                    <button class="filter-btn ${currentFilter === 'all' ? 'active' : ''}" data-filter="all" onclick="applyFilter('all')">All Events (${allEvents.length.toLocaleString()})</button>
                </div>
                <label class="event-search">
                    <span>Search</span>
                    <input id="event-search" type="search" value="${escapeHtml(currentSearchQuery)}" placeholder="Name or Global ID" />
                </label>
                <span>0 events</span>
            </div>
            <div class="event-browser-empty-state">
                <h3>No events match this view</h3>
                <p>Adjust the search or switch filters to browse decoded events.</p>
            </div>`;
        $('#event-search')?.addEventListener('input', (e) => {
            currentSearchQuery = e.target.value || '';
            applyFilter(currentFilter);
        });
        return;
    }

    let currentPage = Math.floor(getSelectedEventIndex(events) / PAGE_SIZE);
    const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
    const isPixView = currentFilter === 'pix';
    const apiEventCount = allEvents.filter(e => e.blockType === 0x3E8 || e.blockType === 0x3E9).length;
    const pixEventCount = allEvents.filter(e => e.isPixGpuVisible).length;
    const baseCount = getBaseFilteredEvents(currentFilter).length;

    function formatVisibility(evt) {
        if (!evt || !evt.pixVisibility) return '-';
        return evt.pixVisibility;
    }

    function renderPage(page, options = {}) {
        const preserveTableScroll = options.preserveTableScroll === true;
        const previousTableScroll = preserveTableScroll
            ? container.querySelector('.event-table-scroll')
            : null;
        const previousTableScrollTop = previousTableScroll ? previousTableScroll.scrollTop : 0;
        const previousTableScrollLeft = previousTableScroll ? previousTableScroll.scrollLeft : 0;
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
                <th>Global ID</th><th>Visibility</th><th>Event</th><th>Summary</th><th>Block</th>
            </tr></thead><tbody>`;

        for (let i = 0; i < slice.length; i++) {
            const evt = slice[i];
            const fmt = formatEvent(evt);
            const summary = buildEventListSummary(fmt);
            const notes = fmt.notes && fmt.notes.length
                ? `<div class="event-note">${escapeHtml(fmt.notes.join(' | '))}</div>`
                : '';
            const absoluteIndex = start + i;
            const eventKey = getEventSelectionKey(evt);
            const selectedClass = eventKey === selectedEventKey ? 'selected' : '';
            html += `<tr class="event-row ${selectedClass}" data-event-key="${escapeHtml(eventKey || '')}" data-event-index="${absoluteIndex}" tabindex="0">
                <td class="mono">${evt.pixGlobalId != null ? evt.pixGlobalId.toLocaleString() : ''}</td>
                <td><span class="visibility-badge visibility-${escapeHtml(formatVisibility(evt))}">${escapeHtml(formatVisibility(evt))}</span></td>
                <td><strong>${escapeHtml(fmt.name)}</strong></td>
                <td class="mono" title="${escapeHtml(fmt.call)}">${escapeHtml(summary)}${notes}</td>
                <td><span class="badge" style="background:${blockTypeColor(evt.blockType)}">${evt.blockTypeName}</span></td>
            </tr>`;
        }

        html += `</tbody></table></div>`;
        container.innerHTML = html;

        $('#prev-page')?.addEventListener('click', () => { currentPage--; renderPage(currentPage); });
        $('#next-page')?.addEventListener('click', () => { currentPage++; renderPage(currentPage); });
        $('#event-search')?.addEventListener('input', (e) => {
            currentSearchQuery = e.target.value || '';
            applyFilter(currentFilter);
        });
        if (preserveTableScroll) {
            const tableScroll = container.querySelector('.event-table-scroll');
            if (tableScroll) {
                tableScroll.scrollTop = previousTableScrollTop;
                tableScroll.scrollLeft = previousTableScrollLeft;
            }
        }
        container.querySelectorAll('.event-row').forEach((row) => {
            const activate = () => {
                selectedEventKey = row.dataset.eventKey || null;
                const nextIndex = Number(row.dataset.eventIndex || '0');
                currentPage = Math.floor(nextIndex / PAGE_SIZE);
                renderPage(currentPage, { preserveTableScroll: true });
                renderEventBrowserPanel();
                focusWindowById('event-browser');
            };
            row.addEventListener('click', activate);
            row.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    activate();
                }
            });
        });
    }

    renderPage(currentPage);
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

