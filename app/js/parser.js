/**
 * WPix Binary File Parser
 *
 * File structure:
 *   GFXA [0xFFFFFFFF] GFXB [ver] ... [ver_major, ver_minor] ... padding
 *   <CAP [ver] BLOK... <CAP! ... BLOK...
 *   DIR3 entries (32 bytes each)
 *   DIR2, DIR1, DIR0
 *   GFXB GFXA (footer)
 */

const MAGIC_GFXA = 0x41584647; // "GFXA" as u32 LE
const MAGIC_GFXB = 0x42584647; // "GFXB"
const MAGIC_BLOK = 0x4B4F4C42; // "BLOK"
const MAGIC_COMP = 0x504D4F43; // "COMP"
const MAGIC_DATA = 0x41544144; // "DATA"
const MAGIC_DIR3 = 0x33524944; // "DIR3"
const MAGIC_EVT  = 0x5456453C; // "<EVT"
const MAGIC_META = 0x4154454D; // "META"

/** Block type names */
const BLOCK_TYPE_NAMES = {
    0x02: 'Capture Metadata',
    0x03: 'Object Table',
    0x04: 'Resource Data',
    0x05: 'Shader Data',
    0x07: 'Misc Info',
    0x08: 'Pipeline State',
    0x09: 'Descriptor Heap',
    0x0A: 'Root Signature',
    0x0B: 'Command Allocator',
    0x0D: 'Query Heap',
    0x0E: 'Fence Data',
    0x0F: 'Command Queue',
    0x64: 'Command Lists',
    0x65: 'GPU Commands',
    0xC8: 'Swap Chain',
    0x12C: 'Resource Names',
    0x3E8: 'Event Index',
    0x3E9: 'Event Details',
    0x7D0: 'Present Info',
    0x2710: 'Capture Summary',
    0x2711: 'Event Metadata',
    0x2712: 'Capture Footer',
};

class WPixParser {
    constructor(buffer) {
        this.buffer = buffer;
        this.view = new DataView(buffer);
        this.u8 = new Uint8Array(buffer);
        this.fileSize = buffer.byteLength;
    }

    /** Parse the file header and return basic info */
    parseHeader() {
        if (this.fileSize < 1024) throw new Error('File too small');

        const magic1 = this.view.getUint32(0, true);
        const sep = this.view.getUint32(4, true);
        const magic2 = this.view.getUint32(8, true);

        if (magic1 !== MAGIC_GFXA || magic2 !== MAGIC_GFXB) {
            throw new Error('Invalid WPix file: bad magic bytes');
        }

        // Verify footer
        const footerMagic1 = this.view.getUint32(this.fileSize - 4, true);
        const footerMagic2 = this.view.getUint32(this.fileSize - 8, true);
        if (footerMagic1 !== MAGIC_GFXA || footerMagic2 !== MAGIC_GFXB) {
            throw new Error('Invalid WPix file: bad footer');
        }

        const versionMajor = this.view.getUint32(0x40, true);
        const versionMinor = this.view.getUint32(0x44, true);

        return {
            fileSize: this.fileSize,
            version: `${versionMajor}.${versionMinor}`,
            versionMajor,
            versionMinor,
        };
    }

    /** Find and parse the DIR3 directory index */
    parseDirectory() {
        // Scan backwards from footer to find DIR3 entries
        // DIR0 is near the end, preceded by DIR1, DIR2, then DIR3 entries
        const footerStart = this.fileSize - 8;

        // Find the last DIR3 entry by scanning backwards
        let searchPos = footerStart - 32;
        let dir3End = -1;

        // First find DIR0 (at the very end before footer padding + GFXB GFXA)
        for (let pos = footerStart - 4; pos > footerStart - 2048; pos--) {
            if (this.view.getUint32(pos, true) === 0x30524944) { // "DIR0"
                // Found DIR0, now find DIR1 before it
                for (let p2 = pos - 4; p2 > pos - 256; p2--) {
                    if (this.view.getUint32(p2, true) === 0x31524944) { // "DIR1"
                        // Found DIR1, find DIR2 before it
                        for (let p3 = p2 - 4; p3 > p2 - 256; p3--) {
                            if (this.view.getUint32(p3, true) === 0x32524944) { // "DIR2"
                                dir3End = p3;
                                break;
                            }
                        }
                        break;
                    }
                }
                break;
            }
        }

        if (dir3End < 0) {
            throw new Error('Could not find directory index');
        }

        // Scan backwards from DIR2 byte-by-byte to find the last DIR3
        let lastDir3 = -1;
        for (let p = dir3End - 4; p > dir3End - 65536; p--) {
            if (this.view.getUint32(p, true) === MAGIC_DIR3) {
                lastDir3 = p;
                break;
            }
        }

        if (lastDir3 < 0) {
            throw new Error('Could not find any DIR3 entries');
        }

        // Now scan backwards from lastDir3 at exact 32-byte intervals
        let dir3Start = lastDir3;
        while (dir3Start >= 32) {
            const prevPos = dir3Start - 32;
            if (this.view.getUint32(prevPos, true) === MAGIC_DIR3) {
                dir3Start = prevPos;
            } else {
                break;
            }
        }

        // Read DIR3 entries forward from dir3Start
        const entries = [];
        let pos = dir3Start;
        while (pos + 32 <= lastDir3 + 32) {
            if (this.view.getUint32(pos, true) !== MAGIC_DIR3) break;

            const dirType = this.view.getUint32(pos + 4, true);
            // Read offset as u64 LE (use two u32s since JS doesn't have native u64)
            const offsetLow = this.view.getUint32(pos + 8, true);
            const offsetHigh = this.view.getUint32(pos + 12, true);
            const offset = offsetLow + offsetHigh * 0x100000000;

            const sizeLow = this.view.getUint32(pos + 16, true);
            const sizeHigh = this.view.getUint32(pos + 20, true);
            const size = sizeLow + sizeHigh * 0x100000000;

            // Read block header at offset to determine COMP vs DATA
            let blockType = 'UNKNOWN';
            let compSize = 0;
            let decompSize = 0;

            if (offset + 32 <= this.fileSize) {
                const blokTag = this.view.getUint32(offset, true);
                const subTag = this.view.getUint32(offset + 4, true);

                if (blokTag === MAGIC_BLOK) {
                    if (subTag === MAGIC_COMP) {
                        blockType = 'COMP';
                        compSize = this.view.getUint32(offset + 8, true);
                        decompSize = this.view.getUint32(offset + 24, true);
                    } else if (subTag === MAGIC_DATA) {
                        blockType = 'DATA';
                        compSize = this.view.getUint32(offset + 8, true);
                        decompSize = compSize; // uncompressed
                    }
                }
            }

            entries.push({
                index: entries.length,
                dirType,
                dirTypeName: BLOCK_TYPE_NAMES[dirType] || `Type 0x${dirType.toString(16)}`,
                offset,
                size,
                blockType,
                compSize,
                decompSize,
            });

            pos += 32;
        }

        return entries;
    }

    /**
     * Read and decompress a single block's data.
     * @param {object} entry - A directory entry from parseDirectory()
     * @returns {Uint8Array} Decompressed data
     */
    readBlock(entry) {
        const { offset, blockType, compSize, decompSize } = entry;

        if (blockType === 'DATA') {
            // Uncompressed: data starts at offset + 16
            const dataStart = offset + 16;
            const dataSize = Math.min(compSize, this.fileSize - dataStart);
            return new Uint8Array(this.buffer, dataStart, dataSize);
        }

        if (blockType === 'COMP') {
            // Compressed: BLOK(4) COMP(4) compSize(4) unk(4) CBLK(4) DATA(4) decompSize(4) unk(4) [data]
            // compSize includes the 16-byte CBLK header
            const dataStart = offset + 32;
            const dataLen = compSize - 16;

            if (dataStart + dataLen > this.fileSize) {
                throw new Error(`Block data exceeds file bounds at offset 0x${offset.toString(16)}`);
            }

            const compressed = new Uint8Array(this.buffer, dataStart, dataLen);
            return xpressDecompress(compressed, decompSize);
        }

        throw new Error(`Unknown block type: ${blockType}`);
    }

    /**
     * Extract events from a decompressed block.
     * @param {Uint8Array} data - Decompressed block data
     * @returns {Array} Array of event objects
     */
    extractEvents(data) {
        const events = [];
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

        // Scan for <EVT markers
        let i = 0;
        while (i <= data.length - 4) {
            if (data[i] === 0x3C && data[i+1] === 0x45 && data[i+2] === 0x56 && data[i+3] === 0x54) {
                // Found <EVT at position i
                const evt = { offset: i };

                if (i + 20 <= data.length) {
                    evt.opcode = view.getUint32(i + 4, true);
                    evt.param1 = view.getUint32(i + 8, true);
                    evt.param2 = view.getUint32(i + 12, true);
                    evt.dataSize = view.getUint32(i + 16, true);
                }

                // META is at <EVT+64 (0x40) per analysis
                const metaPos = i + 64;
                if (metaPos + 4 <= data.length &&
                    data[metaPos] === 0x4D && data[metaPos+1] === 0x45 &&
                    data[metaPos+2] === 0x54 && data[metaPos+3] === 0x41) {
                    evt.metaOffset = metaPos;
                } else {
                    // Fallback: scan for META
                    for (let m = i + 20; m <= Math.min(i + 256, data.length - 4); m++) {
                        if (data[m] === 0x4D && data[m+1] === 0x45 && data[m+2] === 0x54 && data[m+3] === 0x41) {
                            evt.metaOffset = m;
                            break;
                        }
                    }
                }

                // For SetMarker (1040) and BeginEvent (1041) in Event Details,
                // extract the UTF-16LE user string after META
                // SetMarker(1040), BeginEvent(1041): extract embedded UTF-16LE user string
                if (evt.opcode === 1040 || evt.opcode === 1041) {
                    evt.userString = this._extractEventString(data, evt.metaOffset);
                }

                const remainingBytes = data.length - i;
                const declaredRecordSize = evt.dataSize != null ? (64 + evt.dataSize) : null;
                const allowsOversizedPayload =
                    evt.opcode === 2029 || // GpuCommandRecord references chunk payloads outside the compact record body
                    evt.opcode === 2033 || // PIXCmdListRecord wrapper payloads can exceed the local record body
                    evt.opcode === 2034;   // PIXCmdListBundle wrapper payloads can exceed the local record body

                if (
                    (
                        evt.metaOffset == null &&
                        (
                            evt.dataSize == null ||
                            declaredRecordSize == null ||
                            declaredRecordSize > remainingBytes
                        )
                    ) ||
                    (
                        declaredRecordSize != null &&
                        declaredRecordSize > remainingBytes &&
                        !allowsOversizedPayload
                    )
                ) {
                    i += 1;
                    continue;
                }

                evt.recordSize = evt.dataSize != null
                    ? Math.max(0, Math.min(data.length - i, 64 + evt.dataSize))
                    : null;
                evt.metaParams = this._readMetaParams(view, evt.metaOffset, i, evt.recordSize, data.length);
                this._extractEventFields(data, view, evt, i);

                events.push(evt);

                if (evt.recordSize != null && evt.recordSize >= 4) {
                    i += evt.recordSize;
                    continue;
                }
            }

            i += 1;
        }

        return events;
    }

    _readMetaParams(view, metaOffset, eventOffset, recordSize, dataLength) {
        if (metaOffset == null || recordSize == null) return [];

        const params = [];
        const paramStart = metaOffset + 24;
        const recordEnd = Math.min(dataLength, eventOffset + recordSize);
        const availableBytes = Math.max(0, recordEnd - paramStart);
        const paramCount = Math.min(5, Math.floor(availableBytes / 4));

        for (let p = 0; p < paramCount; p++) {
            params.push(view.getUint32(paramStart + p * 4, true));
        }

        return params;
    }

    _extractEventFields(data, view, evt, eventOffset) {
        if (evt.recordSize && evt.recordSize > 0) {
            const strings = this._extractReadableStrings(
                data.subarray(eventOffset, Math.min(data.length, eventOffset + Math.min(evt.recordSize, 512))),
            );
            if (strings.length > 0) evt.embeddedStrings = strings;
        }

        if (!evt.metaOffset) return;

        const meta = evt.metaOffset;
        switch (evt.opcode) {
            case 1075:
                evt.recordId = evt.param1;
                evt.recordVersion = this._readU32(view, meta + 24, data.length);
                evt.queueTypeRaw = this._readU32(view, meta + 28, data.length);
                evt.queueField1 = this._readU32(view, meta + 32, data.length);
                evt.queueField2 = this._readU32(view, meta + 36, data.length);
                evt.queueNodeMaskRaw = this._readU32(view, meta + 40, data.length);
                this._applyTrailingObjectReference(data, view, evt, eventOffset);
                break;
            case 1076:
                evt.recordId = evt.param1;
                evt.recordVersion = this._readU32(view, meta + 24, data.length);
                this._applyTrailingObjectReference(data, view, evt, eventOffset);
                break;
            case 1077:
            case 1078:
            case 2044:
                evt.recordVersion = this._readU32(view, meta + 24, data.length);
                evt.blobMagic = this._findAsciiMagic(
                    data.subarray(eventOffset, Math.min(data.length, eventOffset + Math.min(evt.recordSize || 256, 512))),
                    ['DXBC', 'DXIL'],
                );
                break;
            case 1095:
                evt.recordId = evt.param1;
                evt.recordVersion = this._readU32(view, meta + 24, data.length);
                evt.field0 = this._readU32(view, meta + 32, data.length);
                evt.field1 = this._readU32(view, meta + 40, data.length);
                evt.field2 = this._readU32(view, meta + 48, data.length);
                this._applyTrailingObjectReference(data, view, evt, eventOffset);
                break;
            case 1103:
                evt.recordId = evt.param1;
                evt.recordVersion = this._readU32(view, meta + 24, data.length);
                evt.fenceValue = this._readU32(view, meta + 32, data.length);
                this._applyTrailingObjectReference(data, view, evt, eventOffset);
                break;
            case 1711:
                evt.recordId = evt.param1;
                evt.recordVersion = this._readU32(view, meta + 24, data.length);
                this._applyTrailingObjectReference(data, view, evt, eventOffset);
                break;
            case 2032:
                evt.resourceHandle = this._readU32(view, meta + 28, data.length);
                evt.resourceName = this._readResourceName(data, view, meta);
                if (evt.resourceName && !evt.userString) evt.userString = evt.resourceName;
                break;
            case 2035:
                evt.recordId = evt.param1;
                this._applyTrailingObjectReference(data, view, evt, eventOffset);
                break;
        }

        this._extractEventLayout(data, view, evt, eventOffset);
    }

    _extractEventLayout(data, view, evt, eventOffset) {
        const metaCount = this._getCoreMetaParamCount(evt.opcode >>> 0);
        if (metaCount == null) return;

        evt.coreMetaCount = metaCount;
        evt.coreMetaParams = (evt.metaParams || []).slice(0, metaCount);

        const payload = this._readEventPayload(data, evt, eventOffset, metaCount);
        if (!payload || payload.length === 0) return;

        evt.payloadSize = payload.length;
        evt.payloadPreviewU32 = this._readPayloadPreviewU32(payload, 8);

        switch (evt.opcode >>> 0) {
            case 1700:
            case 1767: {
                const descOffset = (evt.opcode >>> 0) === 1700 ? 12 : 0;
                const dimensionRaw = this._readU32FromBytes(payload, descOffset + 0);
                const alignment = this._readU64FromBytes(payload, descOffset + 4);
                const width = this._readU64FromBytes(payload, descOffset + 12);
                const height = this._readU32FromBytes(payload, descOffset + 20);
                const depthMipPacked = this._readU32FromBytes(payload, descOffset + 24);
                const formatRaw = this._readU32FromBytes(payload, descOffset + 28);
                const sampleCount = this._readU32FromBytes(payload, descOffset + 32);
                const sampleQuality = this._readU32FromBytes(payload, descOffset + 36);
                const layoutRaw = this._readU32FromBytes(payload, descOffset + 40);
                const flagsRaw = this._readU32FromBytes(payload, descOffset + 44);

                if (dimensionRaw != null || width != null || formatRaw != null) {
                    evt.resourceDesc = {
                        offset: descOffset,
                        dimensionRaw,
                        alignment,
                        width,
                        height,
                        depthOrArraySize: depthMipPacked != null ? (depthMipPacked & 0xFFFF) : null,
                        mipLevels: depthMipPacked != null ? ((depthMipPacked >>> 16) & 0xFFFF) : null,
                        formatRaw,
                        sampleCount,
                        sampleQuality,
                        layoutRaw,
                        flagsRaw,
                    };
                }
                break;
            }
            case 1037: {
                const destinationBufferObjectId = this._readU32FromBytes(payload, 0);
                const alignedDestinationBufferOffset = this._readU64FromBytes(payload, 4);
                const compactLinkRaw = this._readU32FromBytes(payload, 12);
                if (destinationBufferObjectId != null || alignedDestinationBufferOffset != null) {
                    evt.endQueryResult = {
                        destinationBufferObjectId,
                        alignedDestinationBufferOffset,
                        compactLinkRaw,
                    };
                }
                break;
            }
            case 1038: {
                const compactLinkRecordId = this._readU32FromBytes(payload, 0);
                if (compactLinkRecordId != null) {
                    evt.resolveQueryLink = {
                        compactLinkRecordId,
                    };
                }
                break;
            }
            case 998: {
                const srcOffset = this._readU64FromBytes(payload, 0);
                const numBytes = this._readU64FromBytes(payload, 8);
                if (srcOffset != null || numBytes != null) {
                    evt.copyBufferRegion = {
                        srcOffset,
                        numBytes,
                    };
                }
                break;
            }
            case 999: {
                const srcObjectId = this._readU16FromBytes(payload, 10);
                const srcTypeRaw = this._readU16FromBytes(payload, 14);
                const srcOffsetUnits = this._readU16FromBytes(payload, 20);
                const formatRaw = this._readU16FromBytes(payload, 26);
                const width = this._readU16FromBytes(payload, 30);
                const height = this._readU16FromBytes(payload, 34);
                const depth = this._readU16FromBytes(payload, 38);
                const rowPitch = this._readU16FromBytes(payload, 42);
                const footprintDepth = this._readU16FromBytes(payload, 46);

                if (srcObjectId != null || formatRaw != null) {
                    evt.copyTextureRegion = {
                        dstX: this._readU16FromBytes(payload, 0) || 0,
                        dstY: this._readU16FromBytes(payload, 2) || 0,
                        srcObjectId,
                        srcTypeRaw,
                        srcOffset: srcOffsetUnits != null ? (srcOffsetUnits << 16) : null,
                        formatRaw,
                        width,
                        height,
                        depth,
                        rowPitch,
                        footprintDepth,
                    };
                }
                break;
            }
            case 1009: {
                const barrierCount = (evt.coreMetaParams && evt.coreMetaParams[1] != null)
                    ? evt.coreMetaParams[1]
                    : (evt.metaParams && evt.metaParams[1] != null ? evt.metaParams[1] : 1);
                const transitionBarriers = this._decodeCompactTransitionBarriers(payload, barrierCount);

                if (transitionBarriers.length > 0) {
                    evt.transitionBarriers = transitionBarriers;
                    evt.transitionBarrier = transitionBarriers[0];
                }
                break;
            }
            case 1027: {
                const bufferLocation = this._readU64FromBytes(payload, 0);
                const packedWord0 = this._readU32FromBytes(payload, 8);
                const packedWord1 = this._readU32FromBytes(payload, 12);
                if (bufferLocation != null || packedWord0 != null || packedWord1 != null) {
                    evt.indexBufferView = {
                        bufferLocation,
                        packedWord0,
                        packedWord1,
                    };
                }
                break;
            }
            case 1030: {
                const packedHandle = this._readPackedHandleFromBytes(payload, 0, 0xFF);
                if (packedHandle) {
                    evt.renderTargetInfo = {
                        numRenderTargetDescriptors: packedHandle.tag,
                        firstDescriptor: packedHandle.value,
                        firstDescriptorHex: packedHandle.valueHex,
                        packedHandleHex: packedHandle.rawHex,
                        descriptorWord: this._readU32FromBytes(payload, 24),
                    };
                }
                break;
            }
            case 1031: {
                const packedHandle = this._readPackedHandleFromBytes(payload, 0, 0xFF);
                if (packedHandle) {
                    evt.depthStencilClear = {
                        clearFlags: packedHandle.tag,
                        depthStencilView: packedHandle.value,
                        depthStencilViewHex: packedHandle.valueHex,
                        packedHandleHex: packedHandle.rawHex,
                        descriptorWord: this._readU32FromBytes(payload, 24),
                    };
                }
                const clearColor = this._readFloat32ArrayFromBytes(payload, 87, 4);
                if (clearColor) {
                    evt.renderTargetClearColor = clearColor;
                }
                break;
            }
        }
    }

    _getCoreMetaParamCount(opcode) {
        switch (opcode >>> 0) {
            case 1036:
                return 4;
            case 1037:
            case 1038:
                return 5;
            case 998:
            case 999:
            case 1009:
            case 1700:
            case 1767:
                return 5;
            case 995:
            case 1007:
            case 1012:
                return 2;
            case 1027:
            case 1030:
            case 1031:
                return 1;
            default:
                return null;
        }
    }

    _readEventPayload(data, evt, eventOffset, metaCount) {
        if (!evt.metaOffset || evt.recordSize == null) return null;
        const payloadStart = evt.metaOffset + 24 + metaCount * 4;
        const recordEnd = Math.min(data.length, eventOffset + evt.recordSize);
        if (payloadStart >= recordEnd) return null;
        return data.subarray(payloadStart, recordEnd);
    }

    _readPayloadPreviewU32(data, maxWords) {
        const words = [];
        const count = Math.min(Math.floor(data.length / 4), maxWords || 0);
        for (let i = 0; i < count; i++) {
            words.push(this._readU32FromBytes(data, i * 4));
        }
        return words;
    }

    /**
     * Extract capture metadata from block type 0x2.
     * Strings are stored as UTF-16LE.
     */
    extractMetadata(data) {
        const meta = {};

        // Search for known UTF-16LE patterns
        const searchUTF16 = (needle) => {
            const encoded = new Uint8Array(needle.length * 2);
            for (let i = 0; i < needle.length; i++) {
                encoded[i * 2] = needle.charCodeAt(i) & 0xFF;
                encoded[i * 2 + 1] = (needle.charCodeAt(i) >> 8) & 0xFF;
            }

            for (let i = 0; i <= data.length - encoded.length; i++) {
                let found = true;
                for (let j = 0; j < encoded.length; j++) {
                    if (data[i + j] !== encoded[j]) { found = false; break; }
                }
                if (found) return i;
            }
            return -1;
        };

        // Extract GPU name - find the longest UTF-16 string containing "GeForce" or "Radeon" or "Intel"
        for (const gpuHint of ['GeForce', 'Radeon', 'Intel', 'NVIDIA', 'AMD']) {
            const idx = searchUTF16(gpuHint);
            if (idx >= 0) {
                meta.gpuName = this._readUTF16String(data, idx);
                break;
            }
        }

        // Extract all readable UTF-16 strings for display
        meta.strings = this._extractAllUTF16Strings(data);

        return meta;
    }

    /**
     * Extract a PIX user event string from after META in SetMarker/BeginEvent records.
     * The string is UTF-16LE, located at a variable offset after META.
     */
    _extractEventString(data, metaOffset) {
        if (!metaOffset || metaOffset + 80 > data.length) return null;
        // SetMarker/BeginEvent: UTF-16LE string at META+0x41 (odd offset).
        // Format: META + 64 bytes of fields + 1 byte (length prefix) + UTF-16LE string.
        // Try both even and odd alignments to find the string.
        for (let align = 0; align <= 1; align++) {
            for (let s = metaOffset + 24 + align; s < Math.min(metaOffset + 300, data.length - 3); s += 2) {
                const ch = data[s] | (data[s+1] << 8);
                if (ch >= 0x20 && ch <= 0x7E) {
                    const chars = [];
                    for (let c = s; c < Math.min(s + 512, data.length - 1); c += 2) {
                        const cc = data[c] | (data[c+1] << 8);
                        if (cc === 0 || cc < 0x20 || cc > 0x7E) break;
                        chars.push(String.fromCharCode(cc));
                    }
                    if (chars.length >= 3) return chars.join('');
                }
            }
        }
        return null;
    }

    _readResourceName(data, view, metaOffset) {
        const strLenOff = metaOffset + 33;
        if (strLenOff + 4 > data.length) return null;
        const strLen = view.getUint32(strLenOff, true);
        if (strLen <= 0 || strLen > 512) return null;
        return this._readASCIIString(data, metaOffset + 41, strLen);
    }

    _readASCIIString(data, start, maxLen) {
        if (start < 0 || start >= data.length) return null;
        const chars = [];
        const end = Math.min(data.length, start + maxLen);
        for (let i = start; i < end; i++) {
            const ch = data[i];
            if (ch === 0) break;
            if (ch < 0x20 || ch > 0x7E) break;
            chars.push(String.fromCharCode(ch));
        }
        return chars.length >= 3 ? chars.join('') : null;
    }

    _readU32(view, offset, limit) {
        return offset + 4 <= limit ? view.getUint32(offset, true) : null;
    }

    _readU16FromBytes(data, offset) {
        if (offset < 0 || offset + 2 > data.length) return null;
        return data[offset] | (data[offset + 1] << 8);
    }

    _readU32FromBytes(data, offset) {
        if (offset < 0 || offset + 4 > data.length) return null;
        return (
            data[offset] |
            (data[offset + 1] << 8) |
            (data[offset + 2] << 16) |
            (data[offset + 3] << 24)
        ) >>> 0;
    }

    _readU64FromBytes(data, offset) {
        const lo = this._readU32FromBytes(data, offset);
        const hi = this._readU32FromBytes(data, offset + 4);
        if (lo == null || hi == null) return null;
        return hi * 0x100000000 + lo;
    }

    _readPackedHandleFromBytes(data, offset, tagMask) {
        const raw = this._readU64FromBytes(data, offset);
        if (raw == null) return null;
        const mask = tagMask >>> 0;
        const tag = raw & mask;
        const value = raw - tag;
        return {
            raw,
            rawHex: this._formatHex64(raw),
            tag,
            value,
            valueHex: this._formatHex64(value),
        };
    }

    _readFloat32ArrayFromBytes(data, offset, count) {
        if (offset < 0 || offset + count * 4 > data.length) return null;
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        const values = [];
        for (let i = 0; i < count; i++) {
            values.push(view.getFloat32(offset + i * 4, true));
        }
        return values;
    }

    _decodeCompactTransitionBarriers(payload, barrierCount) {
        const count = Number.isFinite(barrierCount) && barrierCount > 0 ? barrierCount : 1;
        const stride = 24;
        const barriers = [];

        for (let i = 0; i < count; i++) {
            const base = i * stride;
            const packedResourceWord = this._readU32FromBytes(payload, base + 4);
            const subresourceWord = this._readU32FromBytes(payload, base + 8);
            const stateBeforeWord = this._readU32FromBytes(payload, base + 12);
            const stateAfterWord = this._readU32FromBytes(payload, base + 16);

            if (
                packedResourceWord == null &&
                subresourceWord == null &&
                stateBeforeWord == null &&
                stateAfterWord == null
            ) {
                continue;
            }

            let subresource = null;
            if (subresourceWord != null) {
                subresource = subresourceWord === 0xFFFFFF00 ? 0xFFFFFFFF : (subresourceWord >>> 8);
            }

            barriers.push({
                index: i,
                subresource,
                subresourceWord,
                resourceObjectId: packedResourceWord != null ? (packedResourceWord >>> 8) : null,
                resourceWord: packedResourceWord,
                stateBeforeRaw: stateBeforeWord != null ? (stateBeforeWord >>> 8) : null,
                stateAfterRaw: stateAfterWord != null ? (stateAfterWord >>> 8) : null,
            });
        }

        return barriers;
    }

    _applyTrailingObjectReference(data, view, evt, eventOffset) {
        if (evt.recordSize == null) return;
        const recordEnd = Math.min(data.length, eventOffset + evt.recordSize);
        const markerOffset = recordEnd - 5;
        const guidOffset = markerOffset - 16;
        if (guidOffset < 0 || markerOffset < 0) return;

        const objectGuid = this._readGuid(data, guidOffset);
        const objectId = this._readU32(view, markerOffset + 1, data.length);
        if (objectGuid) evt.objectGuid = objectGuid;
        if (objectId != null) evt.objectId = objectId;
        if (markerOffset < data.length) evt.objectMarker = data[markerOffset];
    }

    _formatHex64(value) {
        const hi = Math.floor(value / 0x100000000) >>> 0;
        const lo = value >>> 0;
        return `0x${hi.toString(16).padStart(8, '0')}${lo.toString(16).padStart(8, '0')}`;
    }

    _readGuid(data, offset) {
        if (offset < 0 || offset + 16 > data.length) return null;
        const b = data.subarray(offset, offset + 16);
        const p = (value, width) => value.toString(16).padStart(width, '0');
        const d1 = `${p(b[3], 2)}${p(b[2], 2)}${p(b[1], 2)}${p(b[0], 2)}`;
        const d2 = `${p(b[5], 2)}${p(b[4], 2)}`;
        const d3 = `${p(b[7], 2)}${p(b[6], 2)}`;
        const d4 = `${p(b[8], 2)}${p(b[9], 2)}`;
        const d5 = `${p(b[10], 2)}${p(b[11], 2)}${p(b[12], 2)}${p(b[13], 2)}${p(b[14], 2)}${p(b[15], 2)}`;
        return `${d1}-${d2}-${d3}-${d4}-${d5}`;
    }

    _findAsciiMagic(data, candidates) {
        for (const candidate of candidates) {
            const bytes = candidate.split('').map((ch) => ch.charCodeAt(0));
            for (let i = 0; i <= data.length - bytes.length; i++) {
                let matches = true;
                for (let j = 0; j < bytes.length; j++) {
                    if (data[i + j] !== bytes[j]) {
                        matches = false;
                        break;
                    }
                }
                if (matches) return candidate;
            }
        }
        return null;
    }

    _extractReadableStrings(data) {
        const found = [];
        const seen = new Set();
        const pushFound = (text) => {
            if (text.length < 4 || seen.has(text) || found.length >= 4) return;
            if (text.includes('META') || text.includes('EVT')) return;
            for (let i = found.length - 1; i >= 0; i--) {
                if (found[i].includes(text)) return;
                if (text.includes(found[i])) {
                    seen.delete(found[i]);
                    found.splice(i, 1);
                }
            }
            seen.add(text);
            found.push(text);
        };

        for (let i = 0; i < data.length; i++) {
            if (data[i] < 0x20 || data[i] > 0x7E) continue;
            let ascii = '';
            for (let j = i; j < Math.min(data.length, i + 96); j++) {
                const ch = data[j];
                if (ch < 0x20 || ch > 0x7E) break;
                ascii += String.fromCharCode(ch);
            }
            pushFound(ascii);
        }

        for (let i = 0; i + 1 < data.length; i += 2) {
            const ch = data[i] | (data[i + 1] << 8);
            if (ch < 0x20 || ch > 0x7E) continue;
            let utf16 = '';
            for (let j = i; j + 1 < Math.min(data.length, i + 192); j += 2) {
                const cc = data[j] | (data[j + 1] << 8);
                if (cc < 0x20 || cc > 0x7E) break;
                utf16 += String.fromCharCode(cc);
            }
            pushFound(utf16);
        }

        return found;
    }

    /** Read a UTF-16LE string starting near the given position */
    _readUTF16String(data, nearIdx) {
        // Scan backwards to find string start (first null u16 or non-printable)
        let start = nearIdx;
        while (start >= 2) {
            const ch = data[start - 2] | (data[start - 1] << 8);
            if (ch < 0x20 || ch > 0x7E) break;
            start -= 2;
        }

        // Scan forward to find string end
        let end = nearIdx;
        while (end + 2 <= data.length) {
            const ch = data[end] | (data[end + 1] << 8);
            if (ch < 0x20 || ch > 0x7E) break;
            end += 2;
        }

        const chars = [];
        for (let i = start; i < end; i += 2) {
            chars.push(String.fromCharCode(data[i] | (data[i + 1] << 8)));
        }
        return chars.join('');
    }

    /**
     * Extract resource debug names from block type 0x12C.
     * Each record: <EVT opcode=0x7f0 objID ... META ... resourceHandle stringLen nameString
     * @param {Uint8Array} data - Decompressed block data
     * @returns {Map<number, string>} Map of object ID → debug name
     */
    extractResourceNames(data) {
        const names = new Map();
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

        for (let i = 0; i <= data.length - 4; i++) {
            if (data[i] !== 0x3C || data[i+1] !== 0x45 || data[i+2] !== 0x56 || data[i+3] !== 0x54) continue;

            const opcode = view.getUint32(i + 4, true);
            if (opcode !== 0x07f0) continue;

            const objId = view.getUint32(i + 8, true);

            // Find META at <EVT+64
            const metaOff = i + 64;
            if (metaOff + 4 > data.length) continue;
            if (data[metaOff] !== 0x4D || data[metaOff+1] !== 0x45 || data[metaOff+2] !== 0x54 || data[metaOff+3] !== 0x41) continue;

            // String starts at META+41 based on analysis: META(4) + zeros(20) + zeros(4) + handle(4) + 0x01(1) + len(4) + zeros(4) + zeros(4) = +41 to string
            // Actually: META+24=zeros, META+28=resourceHandle(4), META+32=0x01(1), META+33=stringLen(4), META+37=zeros(4), META+41=string
            const name = this._readResourceName(data, view, metaOff);
            if (name && name.length >= 3) {
                names.set(objId, name);
            }
        }

        return names;
    }

    /** Extract all UTF-16LE strings of length >= 4 from data */
    _extractAllUTF16Strings(data) {
        const strings = [];
        let current = [];
        let startIdx = 0;

        for (let i = 0; i + 1 < data.length; i += 2) {
            const ch = data[i] | (data[i + 1] << 8);
            if (ch >= 0x20 && ch <= 0x7E) {
                if (current.length === 0) startIdx = i;
                current.push(String.fromCharCode(ch));
            } else {
                if (current.length >= 4) {
                    strings.push({ offset: startIdx, text: current.join('') });
                }
                current = [];
            }
        }
        if (current.length >= 4) {
            strings.push({ offset: startIdx, text: current.join('') });
        }

        return strings;
    }
}
