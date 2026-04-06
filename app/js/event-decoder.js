(function (global) {
    const EVT_SENTINEL = 1414939964;

    const OPCODE_MAP = {
        36: 'CaptureSummary',
        37: 'EventMetadata',
        992: 'GetType',
        993: 'Close',
        994: 'Reset',
        995: 'ClearState',
        996: 'DrawInstanced',
        997: 'DrawIndexedInstanced',
        998: 'Dispatch',
        999: 'CopyBufferRegion',
        1000: 'CopyTextureRegion',
        1001: 'CopyResource',
        1002: 'CopyTiles',
        1004: 'OMSetStencilRef',
        1005: 'RSSetScissorRects',
        1006: 'RSSetViewports',
        1007: 'OMSetBlendFactor',
        1008: 'SetPipelineState',
        1009: 'SetPipelineState',
        1010: 'ResourceBarrier',
        1011: 'ExecuteBundle',
        1012: 'SetDescriptorHeaps',
        1013: 'SetGraphicsRootSignature',
        1015: 'SetGraphicsRootDescriptorTable',
        1016: 'SetComputeRootDescriptorTable',
        1017: 'SetComputeRoot32BitConstant',
        1018: 'SetGraphicsRoot32BitConstant',
        1019: 'SetGraphicsRoot32BitConstants',
        1020: 'SetComputeRoot32BitConstants',
        1021: 'SetComputeRootCBV',
        1022: 'SetGraphicsRootCBV',
        1023: 'SetComputeRootSRV',
        1024: 'SetGraphicsRootSRV',
        1025: 'SetComputeRootUAV',
        1026: 'IASetIndexBuffer / SetPredication',
        1027: 'IASetVertexBuffers',
        1028: 'IASetVertexBuffers / SOSetTargets',
        1029: 'OMSetRenderTargets / SOSetTargets',
        1030: 'ClearDepthStencilView',
        1031: 'ClearRenderTargetView',
        1032: 'ClearUnorderedAccessViewUint',
        1033: 'ClearUnorderedAccessViewUint',
        1034: 'ClearUnorderedAccessViewFloat',
        1035: 'DiscardResource',
        1036: 'BeginQuery',
        1037: 'EndQuery',
        1038: 'ResolveQueryData',
        1039: 'SetPredication',
        1040: 'SetMarker',
        1041: 'BeginEvent',
        1042: 'EndEvent',
        1043: 'ExecuteIndirect',
        1044: 'AtomicCopyBufferUINT',
        1045: 'AtomicCopyBufferUINT64',
        1046: 'OMSetDepthBounds',
        1047: 'SetSamplePositions',
        1048: 'ResolveSubresourceRegion',
        1049: 'SetViewInstanceMask',
        1050: 'WriteBufferImmediate',
        1051: 'SetProtectedResourceSession',
        1052: 'BeginRenderPass',
        1053: 'EndRenderPass',
        1054: 'InitializeMetaCommand',
        1055: 'ExecuteMetaCommand',
        1056: 'BuildRaytracingAS',
        1057: 'EmitRaytracingASPostbuildInfo',
        1058: 'CopyRaytracingAS',
        1059: 'SetPipelineState1',
        1060: 'DispatchRays',
        1061: 'RSSetShadingRate',
        1062: 'RSSetShadingRateImage',
        1063: 'DispatchMesh / UpdateTileMappings',
        1064: 'Barrier / CopyTileMappings',
        1065: 'ExecuteCommandLists',
        1066: 'CmdQueueSetMarker',
        1067: 'CmdQueueBeginEvent',
        1068: 'CmdQueueEndEvent',
        1069: 'Signal',
        1070: 'Wait',
        1071: 'GetTimestampFrequency',
        1072: 'GetClockCalibration',
        1075: 'CommandQueueRecord',
        1076: 'CommandAllocatorRecord',
        1077: 'ResourceRecord',
        1078: 'ShaderRecord',
        1095: 'HeapRecord',
        1103: 'FenceRecord',
        1566: 'MetadataRecord',
        1700: 'CommittedResourceRecord',
        1711: 'CommandListRecord',
        1767: 'PlacedResourceRecord',
        1860: 'SharedFenceSignal',
        1885: 'Present',
        2029: 'GpuCommandRecord',
        2031: 'PresentRecord',
        2032: 'ResourceNameRecord',
        2033: 'PIXCmdListRecord',
        2034: 'PIXCmdListBundle',
        2035: 'SwapChainRecord',
        2042: 'CaptureFooterRecord',
        2043: 'MiscRecord',
        2044: 'PipelineStateRecord',
    };

    const DEVICE_METHODS = {
        0: 'QueryInterface',
        1: 'AddRef',
        2: 'Release',
        3: 'GetPrivateData',
        4: 'SetPrivateData',
        5: 'SetPrivateDataInterface',
        6: 'SetName',
        7: 'GetNodeCount',
        8: 'CreateCommandQueue',
        9: 'CreateCommandAllocator',
        10: 'CreateGraphicsPipelineState',
        11: 'CreateComputePipelineState',
        12: 'CreateCommandList',
        13: 'CheckFeatureSupport',
        14: 'CreateDescriptorHeap',
        15: 'GetDescriptorHandleIncrementSize',
        16: 'CreateRootSignature',
        17: 'CreateConstantBufferView',
        18: 'CreateShaderResourceView',
        19: 'CreateUnorderedAccessView',
        20: 'CreateRenderTargetView',
        21: 'CreateDepthStencilView',
        22: 'CreateSampler',
        23: 'CopyDescriptors',
        24: 'CopyDescriptorsSimple',
        25: 'GetResourceAllocationInfo',
        26: 'GetResourceAllocationInfo2',
        27: 'GetCustomHeapProperties',
        28: 'GetCustomHeapProperties2',
        29: 'CreateCommittedResource',
        30: 'CreateHeap',
        31: 'CreatePlacedResource',
        32: 'CreateReservedResource',
        33: 'CreateSharedHandle',
        34: 'OpenSharedHandle',
        35: 'OpenSharedHandleByName',
        36: 'MakeResident',
        37: 'Evict',
        38: 'CreateFence',
        39: 'GetDeviceRemovedReason',
        40: 'GetCopyableFootprints',
        41: 'CreateQueryHeap',
        42: 'SetStablePowerState',
        43: 'CreateCommandSignature',
        44: 'GetResourceTiling',
        45: 'GetAdapterLuid',
        46: 'GetAdapterLuid2',
    };

    const INTERFACE_GUID_NAMES = {
        '0a753dcf-c4d8-4b91-adf6-be5a60d95a76': 'ID3D12Fence',
        '0ec870a6-5d7e-4c22-8cfc-5baae07616ed': 'ID3D12CommandQueue',
        '6102dee4-af59-4b09-b999-b44d73f09b24': 'ID3D12CommandAllocator',
        '8754318e-d3a9-4541-98cf-645b50dc4874': 'ID3D12GraphicsCommandList4',
        '8efb471d-616c-4f49-90f7-127bb763fa51': 'ID3D12DescriptorHeap',
        'c54a6b66-72df-4ee8-8be5-a946a1429214': 'ID3D12RootSignature',
        '6b3b2502-6e51-45b3-90ee-9884265e8df3': 'ID3D12Heap',
        '696442be-a72e-4059-bc79-5b5c98040fad': 'ID3D12Resource',
        '765a30f3-f624-4c6f-a828-ace948622445': 'ID3D12PipelineState',
        'c36a797c-ec80-4f0a-8985-a7b2475082d1': 'ID3D12CommandSignature',
    };

    function sanitizeMetaParams(metaParams) {
        return (metaParams || []).map((value) => value === EVT_SENTINEL ? null : value);
    }

    function getOpcodeName(opcode) {
        if ((opcode & 0xFFFFFF00) === 0x0D040D00) {
            const vtIndex = opcode & 0xFF;
            return DEVICE_METHODS[vtIndex] ? `Device::${DEVICE_METHODS[vtIndex]}` : `Device::vtable_${vtIndex}`;
        }
        if (opcode > 0x80000000) {
            const baseOpcode = opcode & 0x7FFFFFFF;
            return `${getOpcodeName(baseOpcode)} [End]`;
        }
        return OPCODE_MAP[opcode] || `op_${opcode}`;
    }

    function getResourceName(resourceNames, id) {
        if (!resourceNames || id == null) return null;
        if (typeof resourceNames.get === 'function') return resourceNames.get(id) || null;
        return resourceNames[id] || null;
    }

    function getInterfaceName(guid) {
        if (!guid) return null;
        return INTERFACE_GUID_NAMES[String(guid).toLowerCase()] || null;
    }

    function getObjectInfo(objectInfo, id) {
        if (!objectInfo || id == null) return null;
        if (typeof objectInfo.get === 'function') return objectInfo.get(id) || null;
        return objectInfo[id] || null;
    }

    function buildObjectInfo(events, ctx) {
        const objectInfo = new Map();
        const resourceNames = ctx && ctx.resourceNames;

        const upsert = (id, patch) => {
            if (id == null) return;
            const current = objectInfo.get(id) || { objectId: id };
            for (const [key, value] of Object.entries(patch)) {
                if (value == null) continue;
                if (current[key] == null) current[key] = value;
            }
            objectInfo.set(id, current);
        };

        for (const evt of events || []) {
            if (evt.param1 != null) {
                const resourceName = evt.resourceName || getResourceName(resourceNames, evt.param1);
                if (resourceName) upsert(evt.param1, { resourceName });
            }

            if (evt.objectId != null) {
                const meta = sanitizeMetaParams(evt.metaParams);
                const linkedObjectId = meta[1] != null && meta[1] !== evt.objectId ? meta[1] : null;
                upsert(evt.objectId, {
                    interfaceGuid: evt.objectGuid || null,
                    interfaceName: evt.interfaceName || getInterfaceName(evt.objectGuid),
                    sourceOpcode: evt.opcode >>> 0,
                    recordId: evt.recordId != null ? evt.recordId : evt.param1,
                    linkedObjectId,
                    originalObjectId: linkedObjectId && (evt.interfaceName === 'ID3D12Fence' || getInterfaceName(evt.objectGuid) === 'ID3D12Fence')
                        ? linkedObjectId
                        : null,
                });
            }
        }

        return objectInfo;
    }

    function buildQueueInfo(events) {
        const queueInfo = new Map();

        const ensureQueue = (objectId) => {
            if (objectId == null) return null;
            const current = queueInfo.get(objectId) || {
                objectId,
                counts: {},
                commandLists: new Set(),
                fences: new Set(),
                presents: new Set(),
                firstSequence: null,
                lastSequence: null,
            };
            queueInfo.set(objectId, current);
            return current;
        };

        for (const evt of events || []) {
            const opcode = evt.opcode >>> 0;
            if (opcode === 1075 && evt.objectId != null) {
                const queue = ensureQueue(evt.objectId);
                if (!queue) continue;
                queue.recordId = evt.recordId != null ? evt.recordId : evt.param1;
                queue.recordVersion = evt.recordVersion;
                queue.interfaceGuid = evt.objectGuid || null;
                queue.interfaceName = evt.interfaceName || getInterfaceName(evt.objectGuid);
                queue.queueTypeRaw = evt.queueTypeRaw;
                queue.queueType = evt.queueTypeRaw != null ? queueTypeName(evt.queueTypeRaw) : null;
                queue.queueField1 = evt.queueField1;
                queue.queueField2 = evt.queueField2;
                queue.queueNodeMaskRaw = evt.queueNodeMaskRaw;
                queue.queueNodeMask = normalizeQueueNodeMask(evt.queueNodeMaskRaw);
                continue;
            }

            if (opcode !== 1065 && opcode !== 1069 && opcode !== 1070 && opcode !== 1885) continue;
            const meta = sanitizeMetaParams(evt.metaParams);
            const queueObjectId = meta[0];
            const queue = ensureQueue(queueObjectId);
            if (!queue) continue;

            const name = getOpcodeName(opcode);
            queue.counts[name] = (queue.counts[name] || 0) + 1;
            if (queue.firstSequence == null) queue.firstSequence = evt.sequence;
            queue.lastSequence = evt.sequence;

            if (opcode === 1065 && meta[4] != null) queue.commandLists.add(meta[4]);
            if ((opcode === 1069 || opcode === 1070) && meta[2] != null) queue.fences.add(meta[2]);
            if (opcode === 1885 && meta[1] != null) queue.presents.add(meta[1]);
        }

        return new Map(
            [...queueInfo.entries()]
                .sort((a, b) => a[0] - b[0])
                .map(([objectId, info]) => [objectId, {
                    ...info,
                    commandLists: [...info.commandLists].sort((a, b) => a - b),
                    fences: [...info.fences].sort((a, b) => a - b),
                    presents: [...info.presents].sort((a, b) => a - b),
                }]),
        );
    }

    function buildResourceInfo(events, ctx) {
        const objectInfo = ctx && ctx.objectInfo;
        const resourceNames = ctx && ctx.resourceNames;
        const resources = new Map();

        const upsert = (objectId, patch) => {
            if (objectId == null) return;
            const current = resources.get(objectId) || { objectId };
            for (const [key, value] of Object.entries(patch || {})) {
                if (value == null) continue;
                if (current[key] == null) current[key] = value;
            }
            resources.set(objectId, current);
        };

        if (objectInfo && typeof objectInfo.values === 'function') {
            for (const info of objectInfo.values()) {
                if (!info || info.objectId == null) continue;
                if (info.interfaceName !== 'ID3D12Resource') continue;
                upsert(info.objectId, {
                    interfaceName: info.interfaceName,
                    resourceName: info.resourceName || getResourceName(resourceNames, info.objectId),
                });
            }
        }

        for (const evt of events || []) {
            const opcode = evt.opcode >>> 0;
            const meta = sanitizeMetaParams(evt.metaParams);

            if (opcode === 1700) {
                const objectId = meta[1];
                const desc = evt.resourceDesc || null;
                const dimension = desc ? d3d12ResourceDimensionName(desc.dimensionRaw) : null;
                upsert(objectId, {
                    creationType: 'Committed',
                    creationRecordId: evt.param1,
                    creationOpcode: opcode,
                    heapTypeToken: meta[2],
                    dimensionRaw: desc ? desc.dimensionRaw : null,
                    dimension,
                    alignment: desc ? desc.alignment : null,
                    width: desc ? desc.width : null,
                    height: desc ? desc.height : null,
                    depthOrArraySize: desc ? desc.depthOrArraySize : null,
                    mipLevels: desc ? desc.mipLevels : null,
                    formatRaw: desc ? desc.formatRaw : null,
                    format: desc ? dxgiFormatName(desc.formatRaw) : null,
                    sampleCount: desc ? desc.sampleCount : null,
                    sampleQuality: desc ? desc.sampleQuality : null,
                    layoutRaw: desc ? desc.layoutRaw : null,
                    layout: desc ? d3d12TextureLayoutName(desc.layoutRaw) : null,
                    flagsRaw: desc ? desc.flagsRaw : null,
                    flags: desc ? d3d12ResourceFlagsName(desc.flagsRaw) : null,
                    depth: desc ? (dimension === 'TEXTURE3D' ? desc.depthOrArraySize : 1) : null,
                    arrayCount: desc ? (dimension === 'TEXTURE3D' ? 1 : desc.depthOrArraySize) : null,
                });
                continue;
            }

            if (opcode === 1767) {
                const objectId = meta[1];
                const desc = evt.resourceDesc || null;
                const dimension = desc ? d3d12ResourceDimensionName(desc.dimensionRaw) : null;
                upsert(objectId, {
                    creationType: 'Placed',
                    creationRecordId: evt.param1,
                    creationOpcode: opcode,
                    heapObjectId: meta[2],
                    heapOffset: meta[3],
                    dimensionRaw: desc ? desc.dimensionRaw : null,
                    dimension,
                    alignment: desc ? desc.alignment : null,
                    width: desc ? desc.width : null,
                    height: desc ? desc.height : null,
                    depthOrArraySize: desc ? desc.depthOrArraySize : null,
                    mipLevels: desc ? desc.mipLevels : null,
                    formatRaw: desc ? desc.formatRaw : null,
                    format: desc ? dxgiFormatName(desc.formatRaw) : null,
                    sampleCount: desc ? desc.sampleCount : null,
                    sampleQuality: desc ? desc.sampleQuality : null,
                    layoutRaw: desc ? desc.layoutRaw : null,
                    layout: desc ? d3d12TextureLayoutName(desc.layoutRaw) : null,
                    flagsRaw: desc ? desc.flagsRaw : null,
                    flags: desc ? d3d12ResourceFlagsName(desc.flagsRaw) : null,
                    depth: desc ? (dimension === 'TEXTURE3D' ? desc.depthOrArraySize : 1) : null,
                    arrayCount: desc ? (dimension === 'TEXTURE3D' ? 1 : desc.depthOrArraySize) : null,
                });
                continue;
            }

            if (opcode === 999 && evt.copyTextureRegion) {
                const dstPacked = meta[1];
                const dstObjectId = dstPacked != null ? (dstPacked >>> 8) : null;
                if (dstObjectId != null) {
                    upsert(dstObjectId, {
                        inferredFormatRaw: evt.copyTextureRegion.formatRaw,
                        inferredFormat: dxgiFormatName(evt.copyTextureRegion.formatRaw),
                        inferredWidth: evt.copyTextureRegion.width,
                        inferredHeight: evt.copyTextureRegion.height,
                        inferredDepth: evt.copyTextureRegion.depth != null ? evt.copyTextureRegion.depth : evt.copyTextureRegion.footprintDepth,
                        inferredRowPitch: evt.copyTextureRegion.rowPitch,
                    });
                }
            }
        }

        return new Map([...resources.entries()].sort((a, b) => a[0] - b[0]));
    }

    function buildResolveQueryInfo(events) {
        const pendingByCommandList = new Map();
        const info = new Map();

        const enqueueResolve = (commandListId, evt) => {
            if (commandListId == null || !evt) return;
            const pending = pendingByCommandList.get(commandListId) || [];
            pending.push(evt);
            pendingByCommandList.set(commandListId, pending);
        };

        const dequeueResolve = (commandListId) => {
            const pending = pendingByCommandList.get(commandListId);
            if (!pending || pending.length === 0) return null;
            const evt = pending.shift();
            if (pending.length === 0) pendingByCommandList.delete(commandListId);
            return evt;
        };

        const sorted = [...(events || [])].sort((a, b) => {
            const aSeq = a.sequence != null ? a.sequence : 0;
            const bSeq = b.sequence != null ? b.sequence : 0;
            return aSeq - bSeq;
        });

        for (const evt of sorted) {
            const opcode = evt.opcode >>> 0;
            const meta = sanitizeMetaParams(evt.metaParams);
            const commandListId = meta[0];

            if (opcode === 1038) {
                enqueueResolve(commandListId, evt);
                continue;
            }

            if (opcode !== 1037 || !evt.endQueryResult) continue;
            const resolveEvt = dequeueResolve(commandListId);
            if (!resolveEvt) continue;

            const key = eventKey(resolveEvt);
            if (!key) continue;

            info.set(key, {
                queryHeapObjectId: meta[1],
                typeRaw: meta[2],
                startIndex: meta[3] != null ? meta[3] : 0,
                numQueries: meta[4] != null ? meta[4] : 1,
                destinationBufferObjectId: evt.endQueryResult.destinationBufferObjectId,
                alignedDestinationBufferOffset: evt.endQueryResult.alignedDestinationBufferOffset,
                sourceEndQueryRecordId: evt.param1,
                sourceEndQuerySequence: evt.sequence != null ? evt.sequence : null,
            });
        }

        return info;
    }

    function buildSignalInfo(events) {
        const queueFenceCounts = new Map();
        const groups = new Map();
        const inferredFenceByEvent = new Map();

        const bumpFenceCount = (opcode, queueId, fenceId) => {
            if (queueId == null || fenceId == null || fenceId === 0) return;
            const key = `${opcode}:${queueId}`;
            let counts = queueFenceCounts.get(key);
            if (!counts) {
                counts = new Map();
                queueFenceCounts.set(key, counts);
            }
            counts.set(fenceId, (counts.get(fenceId) || 0) + 1);
        };

        for (const evt of events || []) {
            const opcode = evt.opcode >>> 0;
            if (opcode !== 1069 && opcode !== 1070) continue;
            const meta = sanitizeMetaParams(evt.metaParams);
            const queueId = meta[0];
            const fenceId = meta[2];
            const value = meta[3];
            if (queueId == null || value == null) continue;

            bumpFenceCount(opcode, queueId, fenceId);

            const groupKey = `${opcode}:${queueId}:${value}`;
            const group = groups.get(groupKey) || [];
            group.push({ evt, fenceId });
            groups.set(groupKey, group);
        }

        for (const [groupKey, group] of groups.entries()) {
            const [, queueIdText] = groupKey.split(':', 3);
            const queueId = Number(queueIdText);
            const opcode = Number(groupKey.split(':', 2)[0]);
            const counts = queueFenceCounts.get(`${opcode}:${queueId}`);
            if (!counts || counts.size === 0) continue;

            const presentFences = new Set(group.map((entry) => entry.fenceId).filter((id) => id != null && id !== 0));
            const rankedCandidates = [...counts.entries()]
                .sort((a, b) => {
                    if (b[1] !== a[1]) return b[1] - a[1];
                    return a[0] - b[0];
                })
                .map(([fenceId]) => fenceId);

            const inferredFenceId = rankedCandidates.find((fenceId) => !presentFences.has(fenceId));
            if (inferredFenceId == null) continue;

            for (const entry of group) {
                if (entry.fenceId !== 0) continue;
                const key = eventKey(entry.evt);
                if (!key) continue;
                inferredFenceByEvent.set(key, inferredFenceId);
            }
        }

        return inferredFenceByEvent;
    }

    function buildRasterStateInfo(events, ctx) {
        const viewportHistoryByCommandList = new Map();
        const scissorHistoryByCommandList = new Map();
        const resourceInfo = ctx && ctx.resourceInfo;
        const sorted = [...(events || [])].sort((a, b) => {
            const aSeq = a.sequence != null ? a.sequence : 0;
            const bSeq = b.sequence != null ? b.sequence : 0;
            return aSeq - bSeq;
        });

        const pushHistory = (map, commandListId, entry) => {
            if (commandListId == null || !entry) return;
            const list = map.get(commandListId) || [];
            list.push(entry);
            map.set(commandListId, list);
        };

        const inferViewportFromScissorRects = (rects) => {
            if (!Array.isArray(rects) || rects.length !== 1) return null;
            const rect = rects[0];
            if (!rect) return null;
            const width = rect.right - rect.left;
            const height = rect.bottom - rect.top;
            if (!Number.isFinite(width) || !Number.isFinite(height) || width < 0 || height < 0) return null;
            return {
                numViewports: 1,
                viewports: [{
                    topLeftX: rect.left,
                    topLeftY: rect.top,
                    width,
                    height,
                    minDepth: 0,
                    maxDepth: 1,
                }],
                inferredFromScissor: true,
            };
        };

        const getResource = (objectId) => {
            if (!resourceInfo || objectId == null) return null;
            if (typeof resourceInfo.get === 'function') return resourceInfo.get(objectId) || null;
            return resourceInfo[objectId] || null;
        };

        const inferViewportFromRenderTarget = (startIndex, commandListId, sequence) => {
            const maxSequenceDelta = 64;
            let sawSingleRenderTargetBind = false;

            for (let i = startIndex - 1; i >= 0; i--) {
                const candidate = sorted[i];
                if (!candidate) continue;
                if (candidate.sequence != null && Math.abs(candidate.sequence - sequence) > maxSequenceDelta) break;
                const candidateMeta = sanitizeMetaParams(candidate.metaParams);
                if (candidateMeta[0] !== commandListId) continue;

                if ((candidate.opcode >>> 0) === 1029 && candidateMeta[1] === 1) {
                    sawSingleRenderTargetBind = true;
                    continue;
                }

                if (!sawSingleRenderTargetBind || (candidate.opcode >>> 0) !== 1009 || !candidate.transitionBarriers || candidate.transitionBarriers.length !== 1) {
                    continue;
                }

                const barrier = candidate.transitionBarriers[0];
                if (!barrier || barrier.stateAfterRaw !== 4) continue;

                const resource = getResource(barrier.resourceObjectId);
                if (!resource || resource.dimension !== 'TEXTURE2D') continue;
                if (!Number.isFinite(resource.width) || !Number.isFinite(resource.height)) continue;

                return {
                    numViewports: 1,
                    viewports: [{
                        topLeftX: 0,
                        topLeftY: 0,
                        width: resource.width,
                        height: resource.height,
                        minDepth: 0,
                        maxDepth: 1,
                    }],
                    inferredFromRenderTarget: true,
                    inferredResourceObjectId: barrier.resourceObjectId,
                };
            }

            return null;
        };

        const findNearbyScissorRects = (startIndex, commandListId, sequence) => {
            const maxSequenceDelta = 4;
            let best = null;

            const consider = (candidate) => {
                if (!candidate || (candidate.opcode >>> 0) !== 1005 || !candidate.scissorRects || candidate.scissorRects.length === 0) {
                    return;
                }
                const candidateMeta = sanitizeMetaParams(candidate.metaParams);
                if (candidateMeta[0] !== commandListId || candidate.sequence == null) return;
                const delta = Math.abs(candidate.sequence - sequence);
                if (delta > maxSequenceDelta) return;
                if (!best || delta < best.delta) {
                    best = { delta, rects: candidate.scissorRects };
                }
            };

            for (let i = startIndex - 1; i >= 0; i--) {
                const candidate = sorted[i];
                if (candidate.sequence != null && Math.abs(candidate.sequence - sequence) > maxSequenceDelta) break;
                consider(candidate);
            }
            for (let i = startIndex + 1; i < sorted.length; i++) {
                const candidate = sorted[i];
                if (candidate.sequence != null && Math.abs(candidate.sequence - sequence) > maxSequenceDelta) break;
                consider(candidate);
            }

            return best ? best.rects : null;
        };

        for (let i = 0; i < sorted.length; i++) {
            const evt = sorted[i];
            const meta = sanitizeMetaParams(evt.metaParams);
            const commandListId = meta[0];
            if ((evt.opcode >>> 0) === 1005 && evt.scissorRects && evt.scissorRects.length > 0) {
                pushHistory(scissorHistoryByCommandList, commandListId, {
                    sequence: evt.sequence,
                    scissorRects: evt.scissorRects,
                });
            }
            if ((evt.opcode >>> 0) !== 1006) continue;

            let viewportSet = evt.viewportSet || null;
            if (!viewportSet) {
                const nearbyRects = findNearbyScissorRects(i, commandListId, evt.sequence);
                viewportSet = inferViewportFromScissorRects(nearbyRects);
                if (viewportSet) evt.viewportSet = viewportSet;
            }
            if (!viewportSet) {
                viewportSet = inferViewportFromRenderTarget(i, commandListId, evt.sequence);
                if (viewportSet) evt.viewportSet = viewportSet;
            }

            if (!viewportSet || commandListId == null) continue;
            pushHistory(viewportHistoryByCommandList, commandListId, {
                sequence: evt.sequence,
                viewportSet,
            });
        }

        return { viewportHistoryByCommandList, scissorHistoryByCommandList };
    }

    function buildBufferViewInfo(events, descriptorInfo) {
        const labelsByKey = new Map();
        let nextLabelId = descriptorInfo && descriptorInfo.labelsByKey
            ? descriptorInfo.labelsByKey.size + 1
            : 1;

        const sorted = [...(events || [])].sort((a, b) => {
            const aSeq = a.sequence != null ? a.sequence : 0;
            const bSeq = b.sequence != null ? b.sequence : 0;
            return aSeq - bSeq;
        });

        const nextDrawSeqByEventKey = new Map();
        const nextDrawByCommandList = new Map();
        for (let i = sorted.length - 1; i >= 0; i--) {
            const evt = sorted[i];
            const meta = sanitizeMetaParams(evt.metaParams);
            const commandListId = meta[0];
            if (commandListId != null) {
                if ((evt.opcode >>> 0) === 995 || (evt.opcode >>> 0) === 996 || (evt.opcode >>> 0) === 997 || (evt.opcode >>> 0) === 998) {
                    nextDrawByCommandList.set(commandListId, evt.sequence != null ? evt.sequence : Number.MAX_SAFE_INTEGER);
                }
                const key = eventKey(evt);
                if (key) {
                    nextDrawSeqByEventKey.set(key, nextDrawByCommandList.get(commandListId) || Number.MAX_SAFE_INTEGER);
                }
            }
        }

        const candidates = [];
        for (const evt of sorted) {
            const opcode = evt.opcode >>> 0;
            const meta = sanitizeMetaParams(evt.metaParams);
            if (opcode === 1026 && meta[1] != null && ((meta[1] >>> 24) & 0xFF) === 9 && meta[2] === 0) {
                candidates.push({
                    evt,
                    key: `ibv1:${meta[1]}:${meta[2]}:${meta[3]}:${meta[4]}`,
                    precedence: 0,
                });
            } else if (opcode === 1027 && meta[2] === 1) {
                candidates.push({
                    evt,
                    key: `vbv1:${meta[1]}:${meta[2]}:${meta[3]}:${meta[4]}`,
                    precedence: 1,
                });
            }
        }

        candidates.sort((a, b) => {
            const nextA = nextDrawSeqByEventKey.get(eventKey(a.evt)) || Number.MAX_SAFE_INTEGER;
            const nextB = nextDrawSeqByEventKey.get(eventKey(b.evt)) || Number.MAX_SAFE_INTEGER;
            if (nextA !== nextB) return nextA - nextB;
            if (a.precedence !== b.precedence) return a.precedence - b.precedence;
            const aSeq = a.evt.sequence != null ? a.evt.sequence : 0;
            const bSeq = b.evt.sequence != null ? b.evt.sequence : 0;
            return aSeq - bSeq;
        });

        for (const candidate of candidates) {
            if (!labelsByKey.has(candidate.key)) {
                labelsByKey.set(candidate.key, `res#${nextLabelId++}`);
            }
        }

        return { labelsByKey };
    }

    function buildDescriptorKey(kind, handleHex, descriptorWord) {
        if (!kind || !handleHex) return null;
        const suffix = descriptorWord != null ? `:${descriptorWord >>> 0}` : '';
        return `${kind}:${handleHex}${suffix}`;
    }

    function buildDescriptorInfo(events) {
        const labelsByKey = new Map();
        const historyByCommandList = new Map();
        let nextLabelId = 1;

        const ensureLabel = (key) => {
            if (!key) return null;
            let label = labelsByKey.get(key);
            if (!label) {
                label = `res#${nextLabelId++}`;
                labelsByKey.set(key, label);
            }
            return label;
        };

        const pushHistory = (commandListId, entry) => {
            if (commandListId == null || !entry) return;
            const list = historyByCommandList.get(commandListId) || [];
            list.push(entry);
            historyByCommandList.set(commandListId, list);
        };

        const sorted = [...(events || [])].sort((a, b) => {
            const aSeq = a.sequence != null ? a.sequence : 0;
            const bSeq = b.sequence != null ? b.sequence : 0;
            return aSeq - bSeq;
        });

        for (const evt of sorted) {
            const meta = sanitizeMetaParams(evt.metaParams);
            const commandListId = meta[0];
            if ((evt.opcode >>> 0) === 1031 && evt.depthStencilClear && evt.depthStencilClear.depthStencilViewHex) {
                const key = buildDescriptorKey('rtv', evt.depthStencilClear.depthStencilViewHex, evt.depthStencilClear.descriptorWord);
                const label = ensureLabel(key);
                pushHistory(commandListId, { sequence: evt.sequence, kind: 'rtv', key, label });
            } else if ((evt.opcode >>> 0) === 1030 && evt.renderTargetInfo && evt.renderTargetInfo.firstDescriptorHex) {
                const key = buildDescriptorKey('dsv', evt.renderTargetInfo.firstDescriptorHex, evt.renderTargetInfo.descriptorWord);
                const label = ensureLabel(key);
                pushHistory(commandListId, { sequence: evt.sequence, kind: 'dsv', key, label });
            }
        }

        return { labelsByKey, historyByCommandList };
    }

    function buildDescriptorHeapSetInfo(events) {
        const byEventKey = new Map();
        const bySetId = new Map();
        const sorted = [...(events || [])].sort((a, b) => {
            const aSeq = a.sequence != null ? a.sequence : 0;
            const bSeq = b.sequence != null ? b.sequence : 0;
            return aSeq - bSeq;
        });

        for (let i = 0; i < sorted.length; i++) {
            const evt = sorted[i];
            if ((evt.opcode >>> 0) !== 1012) continue;

            const meta = sanitizeMetaParams(evt.metaParams);
            const commandListId = meta[0];
            const setId = meta[1];
            const heapIds = [];
            const seen = new Set();

            for (let j = i + 1; j < sorted.length; j++) {
                const candidate = sorted[j];
                const candidateMeta = sanitizeMetaParams(candidate.metaParams);
                if (candidateMeta[0] !== commandListId) continue;
                if ((candidate.opcode >>> 0) === 1012) break;

                if (((candidate.opcode >>> 0) === 1015 || (candidate.opcode >>> 0) === 1016 || (candidate.opcode >>> 0) === 1014) && candidateMeta[2] != null) {
                    const heapId = candidateMeta[2];
                    if (!seen.has(heapId)) {
                        seen.add(heapId);
                        heapIds.push(heapId);
                    }
                }
            }

            const info = {
                commandListId,
                setId,
                heapIds,
            };
            const key = eventKey(evt);
            if (key) byEventKey.set(key, info);

            if (setId != null) {
                const existing = bySetId.get(setId) || { setId, heapIds: [] };
                const merged = [...existing.heapIds];
                for (const heapId of heapIds) {
                    if (!merged.includes(heapId)) merged.push(heapId);
                }
                bySetId.set(setId, {
                    setId,
                    heapIds: merged,
                });
            }
        }

        return { byEventKey, bySetId };
    }

    function buildPixBundleInfo(events) {
        const bundleByEventKey = new Map();
        const executeByEventKey = new Map();
        const sorted = [...(events || [])].sort((a, b) => {
            const aSeq = a.sequence != null ? a.sequence : 0;
            const bSeq = b.sequence != null ? b.sequence : 0;
            return aSeq - bSeq;
        });

        let currentBundle = null;

        for (const evt of sorted) {
            const opcode = evt.opcode >>> 0;
            const key = eventKey(evt);
            if (!key) continue;

            if (opcode === 2034) {
                const meta = sanitizeMetaParams(evt.metaParams);
                currentBundle = {
                    recordId: evt.param1,
                    info0: meta[0],
                    info1: meta[1],
                    linkedEventRecordId: meta[2],
                    resourceObjectId: meta[3],
                    info4: meta[4],
                    executeCommandLists: [],
                };
                bundleByEventKey.set(key, currentBundle);
                continue;
            }

            if (opcode !== 1065 || !currentBundle) continue;

            const meta = sanitizeMetaParams(evt.metaParams);
            const executeInfo = {
                bundleRecordId: currentBundle.recordId,
                resourceObjectId: currentBundle.resourceObjectId,
                bundleInfo1: currentBundle.info1,
                queueObjectId: meta[0],
                numCommandLists: meta[1],
                packedWord0: meta[2],
                packedWord1: meta[3],
                commandListIds: meta[1] === 1 && meta[4] != null ? [meta[4]] : [],
            };
            executeByEventKey.set(key, executeInfo);
            currentBundle.executeCommandLists.push({
                recordId: evt.param1,
                queueObjectId: meta[0],
                numCommandLists: meta[1],
                commandListIds: executeInfo.commandListIds,
            });
        }

        return { bundleByEventKey, executeByEventKey };
    }

    function getEventByRecordId(ctx, recordId) {
        if (!ctx || recordId == null) return null;
        const source = ctx.eventDetailsByRecordId;
        if (!source) return null;
        if (typeof source.get === 'function') return source.get(recordId) || null;
        return source[recordId] || null;
    }

    function eventKey(evt) {
        if (!evt) return null;
        if (evt.sequence != null) return `seq:${evt.sequence}`;
        if (evt.param1 != null) return `rid:${evt.param1}`;
        return null;
    }

    function getResolveQueryInfo(ctx, evt) {
        if (!ctx || !ctx.resolveQueryInfo || !evt) return null;
        const key = eventKey(evt);
        if (!key) return null;
        if (typeof ctx.resolveQueryInfo.get === 'function') return ctx.resolveQueryInfo.get(key) || null;
        return ctx.resolveQueryInfo[key] || null;
    }

    function getInferredSignalFenceId(ctx, evt) {
        if (!ctx || !ctx.signalInfo || !evt) return null;
        const key = eventKey(evt);
        if (!key) return null;
        if (typeof ctx.signalInfo.get === 'function') return ctx.signalInfo.get(key) || null;
        return ctx.signalInfo[key] || null;
    }

    function getDescriptorHeapSet(ctx, evt) {
        if (!ctx || !ctx.descriptorHeapSetInfo || !evt) return null;
        const key = eventKey(evt);
        if (key && ctx.descriptorHeapSetInfo.byEventKey && typeof ctx.descriptorHeapSetInfo.byEventKey.get === 'function') {
            const byEvent = ctx.descriptorHeapSetInfo.byEventKey.get(key);
            if (byEvent) return byEvent;
        }

        const meta = sanitizeMetaParams(evt.metaParams);
        const setId = meta[1];
        if (setId == null || !ctx.descriptorHeapSetInfo.bySetId || typeof ctx.descriptorHeapSetInfo.bySetId.get !== 'function') return null;
        return ctx.descriptorHeapSetInfo.bySetId.get(setId) || null;
    }

    function getPixBundleForEvent(ctx, evt) {
        if (!ctx || !ctx.pixBundleInfo || !evt) return null;
        const key = eventKey(evt);
        if (!key || !ctx.pixBundleInfo.bundleByEventKey || typeof ctx.pixBundleInfo.bundleByEventKey.get !== 'function') return null;
        return ctx.pixBundleInfo.bundleByEventKey.get(key) || null;
    }

    function getExecuteBundleInfo(ctx, evt) {
        if (!ctx || !ctx.pixBundleInfo || !evt) return null;
        const key = eventKey(evt);
        if (!key || !ctx.pixBundleInfo.executeByEventKey || typeof ctx.pixBundleInfo.executeByEventKey.get !== 'function') return null;
        return ctx.pixBundleInfo.executeByEventKey.get(key) || null;
    }

    function getDecodedCall(evt, ctx) {
        if (!evt) return null;
        if (evt.call) return evt.call;
        return decodeEvent(evt, ctx).call;
    }

    function getDescriptorLabel(ctx, kind, handleHex, descriptorWord) {
        if (!ctx || !ctx.descriptorInfo || !ctx.descriptorInfo.labelsByKey) return null;
        const key = buildDescriptorKey(kind, handleHex, descriptorWord);
        if (!key) return null;
        return ctx.descriptorInfo.labelsByKey.get(key) || null;
    }

    function getRecentDescriptorBindings(ctx, evt, commandListId, numRenderTargets) {
        if (!ctx || !ctx.descriptorInfo || !ctx.descriptorInfo.historyByCommandList || commandListId == null || evt.sequence == null) {
            return null;
        }
        const history = ctx.descriptorInfo.historyByCommandList.get(commandListId);
        if (!history || history.length === 0) return null;
        const prior = history.filter((entry) => entry.sequence != null && entry.sequence < evt.sequence);
        if (prior.length === 0) return null;

        const rtvLabels = prior
            .filter((entry) => entry.kind === 'rtv')
            .slice(-Math.max(0, numRenderTargets || 0))
            .map((entry) => entry.label);

        const dsvEntry = [...prior].reverse().find((entry) => entry.kind === 'dsv') || null;
        return {
            renderTargetLabels: rtvLabels,
            depthStencilLabel: dsvEntry ? dsvEntry.label : null,
        };
    }

    function getRecentViewportSet(ctx, evt, commandListId) {
        if (!ctx || !ctx.rasterStateInfo || !ctx.rasterStateInfo.viewportHistoryByCommandList || commandListId == null || evt.sequence == null) {
            return null;
        }
        const history = ctx.rasterStateInfo.viewportHistoryByCommandList.get(commandListId);
        if (!history || history.length === 0) return null;
        for (let i = history.length - 1; i >= 0; i--) {
            const entry = history[i];
            if (entry.sequence != null && entry.sequence < evt.sequence) return entry.viewportSet;
        }
        return null;
    }

    function getBufferViewLabel(ctx, kind, evt, signature) {
        if (!ctx || !ctx.bufferViewInfo || !ctx.bufferViewInfo.labelsByKey) return null;
        let key = signature;
        if (!key && kind === 'ibv1' && evt) {
            const meta = sanitizeMetaParams(evt.metaParams);
            key = `ibv1:${meta[1]}:${meta[2]}:${meta[3]}:${meta[4]}`;
        } else if (!key && kind === 'vbv1' && evt) {
            const meta = sanitizeMetaParams(evt.metaParams);
            key = `vbv1:${meta[1]}:${meta[2]}:${meta[3]}:${meta[4]}`;
        }
        if (!key) return null;
        return ctx.bufferViewInfo.labelsByKey.get(key) || null;
    }

    function formatPixDescriptorList(labels) {
        if (!labels || labels.length === 0) return 'nullptr';
        if (labels.length === 1) return labels[0];
        return `{${labels.map((label, index) => `Element_${index}:${label}`).join(', ')}}`;
    }

    function formatPixViewport(viewport) {
        if (!viewport) return 'nullptr';
        return `{TopLeftX:${viewport.topLeftX}, TopLeftY:${viewport.topLeftY}, Width:${viewport.width}, Height:${viewport.height}, MinDepth:${viewport.minDepth}, MaxDepth:${viewport.maxDepth}}`;
    }

    function formatPixViewportList(viewports) {
        if (!viewports || viewports.length === 0) return 'nullptr';
        if (viewports.length === 1) return formatPixViewport(viewports[0]);
        return `{${viewports.map((viewport) => `Element:${formatPixViewport(viewport)}`).join(', ')}}`;
    }

    function formatPixRect(rect) {
        if (!rect) return 'nullptr';
        return `{left:${rect.left}, top:${rect.top}, right:${rect.right}, bottom:${rect.bottom}}`;
    }

    function formatPixRectList(rects) {
        if (!rects || rects.length === 0) return 'nullptr';
        if (rects.length === 1) return formatPixRect(rects[0]);
        return `{${rects.map((rect) => `Element:${formatPixRect(rect)}`).join(', ')}}`;
    }

    function formatObj(id, ctx) {
        if (id == null) return 'null';
        const name = getResourceName(ctx.resourceNames, id);
        const info = getObjectInfo(ctx.objectInfo, id);
        const interfaceName = info && info.interfaceName ? info.interfaceName : null;
        let display = `obj#${id}`;
        if (name) display += ` "${name}"`;
        if (interfaceName) display += ` <${interfaceName}>`;
        if (info && info.originalObjectId != null && info.originalObjectId !== id) {
            display += ` -> obj#${info.originalObjectId}`;
        }
        return display;
    }

    function formatValue(value) {
        if (value === null) return 'null';
        if (typeof value === 'string') return JSON.stringify(value);
        if (Array.isArray(value)) return `[${value.map(formatValue).join(', ')}]`;
        return String(value);
    }

    function pushArg(args, name, value, display) {
        if (value === undefined) return;
        args.push({ name, value, display: display !== undefined ? display : formatValue(value) });
    }

    function buildCall(name, args) {
        return `${name}(${args.map((arg) => `${arg.name}=${arg.display}`).join(', ')})`;
    }

    function result(name, args, notes, callOverride) {
        return { name, args, call: callOverride || buildCall(name, args), notes: notes || [] };
    }

    function classifyPixVisibility(evt, decoded) {
        const name = decoded && decoded.name ? decoded.name : getOpcodeName(evt.opcode >>> 0);
        const opcode = evt.opcode >>> 0;
        const userString = evt.userString || null;

        const gpuVisibleNames = new Set([
            'Wait',
            'Signal',
            'Present',
            'ResourceBarrier',
            'DrawIndexedInstanced',
            'DrawInstanced',
            'Dispatch',
            'DispatchRays',
            'DispatchMesh / UpdateTileMappings',
            'ExecuteIndirect',
            'ResolveQueryData',
            'CopyBufferRegion',
            'CopyTextureRegion',
            'CopyResource',
            'CopyTiles',
            'ResolveSubresourceRegion',
            'ClearRenderTargetView',
            'ClearDepthStencilView',
            'ClearUnorderedAccessViewUint',
            'ClearUnorderedAccessViewFloat',
            'DiscardResource',
            'WriteBufferImmediate',
            'BeginRenderPass',
            'EndRenderPass',
            'BuildRaytracingAS',
            'EmitRaytracingASPostbuildInfo',
            'CopyRaytracingAS',
            'InitializeMetaCommand',
            'ExecuteMetaCommand',
        ]);

        const nonGpuNames = new Set([
            'Close',
            'Reset',
            'GetType',
            'ClearState',
            'IASetPrimitiveTopology',
            'RSSetViewports',
            'RSSetScissorRects',
            'OMSetBlendFactor',
            'OMSetStencilRef',
            'SetPipelineState',
            'SetPipelineState1',
            'ExecuteBundle',
            'SetDescriptorHeaps',
            'SetGraphicsRootSignature',
            'SetComputeRootDescriptorTable',
            'SetGraphicsRootDescriptorTable',
            'SetComputeRoot32BitConstant',
            'SetGraphicsRoot32BitConstant',
            'SetGraphicsRoot32BitConstants',
            'SetComputeRoot32BitConstants',
            'SetComputeRootCBV',
            'SetGraphicsRootCBV',
            'SetComputeRootSRV',
            'SetGraphicsRootSRV',
            'SetComputeRootUAV',
            'SetGraphicsRootUAV',
            'IASetIndexBuffer',
            'IASetVertexBuffers',
            'SOSetTargets',
            'OMSetRenderTargets',
            'BeginQuery',
            'EndQuery',
            'SetPredication',
            'SetProtectedResourceSession',
            'OMSetDepthBounds',
            'SetSamplePositions',
            'SetViewInstanceMask',
            'RSSetShadingRate',
            'RSSetShadingRateImage',
            'PrepareForPresent',
        ]);

        const internalNames = new Set([
            'CaptureSummary',
            'EventMetadata',
            'ExecuteCommandLists',
            'CmdQueueSetMarker',
            'CmdQueueBeginEvent',
            'CmdQueueEndEvent',
            'GetTimestampFrequency',
            'GetClockCalibration',
            'CommandQueueRecord',
            'CommandAllocatorRecord',
            'ResourceRecord',
            'ShaderRecord',
            'HeapRecord',
            'FenceRecord',
            'MetadataRecord',
            'CommandListRecord',
            'SharedFenceSignal',
            'GpuCommandRecord',
            'PresentRecord',
            'ResourceNameRecord',
            'PIXCmdListRecord',
            'PIXCmdListBundle',
            'SwapChainRecord',
            'CaptureFooterRecord',
            'MiscRecord',
            'PipelineStateRecord',
        ]);

        if (internalNames.has(name) || (opcode & 0xFFFFFF00) === 0x0D040D00) {
            return { category: 'internal', reason: 'WPIX wrapper/object metadata rather than a PIX timeline item.' };
        }

        if (name === 'PreDraw') {
            return { category: 'marker', reason: 'PIX emits PreDraw as a marker-like item; it is not stable enough to count as a normal GPU event yet.' };
        }

        if (opcode === 1040 || opcode === 1041 || opcode === 1042 || opcode === 1066 || opcode === 1067 || opcode === 1068) {
            if (userString === 'PrepareForPresent') {
                return { category: 'non-gpu', reason: 'PrepareForPresent appears in PIX as an interleaved non-GPU setup marker.' };
            }
            return { category: 'marker', reason: 'Marker/event-string record.' };
        }

        if (gpuVisibleNames.has(name)) {
            return { category: 'gpu', reason: 'Matches PIX GPU-visible execution/queue timeline events.' };
        }

        if (nonGpuNames.has(name)) {
            return { category: 'non-gpu', reason: 'Matches PIX non-GPU setup/state items interleaved between GPU-visible rows.' };
        }

        return { category: 'internal', reason: 'Not yet classified as PIX GPU-visible or non-GPU; treat as internal for comparisons.' };
    }

    function primitiveTopologyName(value) {
        const normalized = value >>> 0;
        const names = {
            0: 'UNDEFINED',
            1: 'POINTLIST',
            2: 'LINELIST',
            3: 'LINESTRIP',
            4: 'TRIANGLELIST',
            5: 'TRIANGLESTRIP',
            6: 'TRIANGLEFAN',
            10: 'LINELIST_ADJ',
            11: 'LINESTRIP_ADJ',
            12: 'TRIANGLELIST_ADJ',
            13: 'TRIANGLESTRIP_ADJ',
        };
        if (Object.prototype.hasOwnProperty.call(names, normalized)) return names[normalized];
        if (normalized >= 33 && normalized <= 64) return `${normalized - 32}_CONTROL_POINT_PATCHLIST`;
        return String(normalized);
    }

    function d3d12CommandListTypeName(value) {
        if (value == null) return null;
        const normalized = value >>> 0;
        if (normalized === 0xFFFFFFFF) return 'NONE';
        const names = {
            0: 'DIRECT',
            1: 'BUNDLE',
            2: 'COMPUTE',
            3: 'COPY',
            4: 'VIDEO_DECODE',
            5: 'VIDEO_PROCESS',
            6: 'VIDEO_ENCODE',
        };
        return Object.prototype.hasOwnProperty.call(names, normalized) ? names[normalized] : String(normalized);
    }

    function queueTypeName(value) {
        return d3d12CommandListTypeName(value);
    }

    function d3d12CommandQueuePriorityName(value) {
        if (value == null) return null;
        const normalized = value >>> 0;
        const names = {
            0: 'NORMAL',
            100: 'HIGH',
            10000: 'GLOBAL_REALTIME',
        };
        return Object.prototype.hasOwnProperty.call(names, normalized) ? names[normalized] : String(normalized);
    }

    function d3d12CommandQueueFlagsName(value) {
        if (value == null) return null;
        const normalized = value >>> 0;
        if (normalized === 0) return 'NONE';
        const bits = [
            [0x1, 'DISABLE_GPU_TIMEOUT'],
        ];
        const names = [];
        for (const [bit, label] of bits) {
            if ((normalized & bit) !== 0) names.push(label);
        }
        const knownMask = bits.reduce((acc, [bit]) => acc | bit, 0);
        const remaining = normalized & ~knownMask;
        if (remaining) names.push(`0x${remaining.toString(16)}`);
        return names.join(' | ');
    }

    function dxgiFormatName(value) {
        const names = {
            0: 'UNKNOWN',
            1: 'R32G32B32A32_TYPELESS',
            2: 'R32G32B32A32_FLOAT',
            3: 'R32G32B32A32_UINT',
            4: 'R32G32B32A32_SINT',
            5: 'R32G32B32_TYPELESS',
            6: 'R32G32B32_FLOAT',
            7: 'R32G32B32_UINT',
            8: 'R32G32B32_SINT',
            9: 'R16G16B16A16_TYPELESS',
            10: 'R16G16B16A16_FLOAT',
            11: 'R16G16B16A16_UNORM',
            12: 'R16G16B16A16_UINT',
            13: 'R16G16B16A16_SNORM',
            14: 'R16G16B16A16_SINT',
            15: 'R32G32_TYPELESS',
            16: 'R32G32_FLOAT',
            17: 'R32G32_UINT',
            18: 'R32G32_SINT',
            19: 'R32G8X24_TYPELESS',
            20: 'D32_FLOAT_S8X24_UINT',
            21: 'R32_FLOAT_X8X24_TYPELESS',
            22: 'X32_TYPELESS_G8X24_UINT',
            23: 'R10G10B10A2_TYPELESS',
            24: 'R10G10B10A2_UNORM',
            25: 'R10G10B10A2_UINT',
            26: 'R11G11B10_FLOAT',
            27: 'R8G8B8A8_TYPELESS',
            28: 'R8G8B8A8_UNORM',
            29: 'R8G8B8A8_UNORM_SRGB',
            30: 'R8G8B8A8_UINT',
            31: 'R8G8B8A8_SNORM',
            32: 'R8G8B8A8_SINT',
            33: 'R16G16_TYPELESS',
            34: 'R16G16_FLOAT',
            35: 'R16G16_UNORM',
            36: 'R16G16_UINT',
            37: 'R16G16_SNORM',
            38: 'R16G16_SINT',
            39: 'R32_TYPELESS',
            40: 'D32_FLOAT',
            41: 'R32_FLOAT',
            42: 'R32_UINT',
            43: 'R32_SINT',
            44: 'R24G8_TYPELESS',
            45: 'D24_UNORM_S8_UINT',
            46: 'R24_UNORM_X8_TYPELESS',
            47: 'X24_TYPELESS_G8_UINT',
            48: 'R8G8_TYPELESS',
            49: 'R8G8_UNORM',
            50: 'R8G8_UINT',
            51: 'R8G8_SNORM',
            52: 'R8G8_SINT',
            53: 'R16_TYPELESS',
            54: 'R16_FLOAT',
            55: 'D16_UNORM',
            56: 'R16_UNORM',
            57: 'R16_UINT',
            58: 'R16_SNORM',
            59: 'R16_SINT',
            60: 'R8_TYPELESS',
            61: 'R8_UNORM',
            62: 'R8_UINT',
            63: 'R8_SNORM',
            64: 'R8_SINT',
            65: 'A8_UNORM',
            66: 'R1_UNORM',
            67: 'R9G9B9E5_SHAREDEXP',
            68: 'R8G8_B8G8_UNORM',
            69: 'G8R8_G8B8_UNORM',
            70: 'BC1_TYPELESS',
            71: 'BC1_UNORM',
            72: 'BC1_UNORM_SRGB',
            73: 'BC2_TYPELESS',
            74: 'BC2_UNORM',
            75: 'BC2_UNORM_SRGB',
            76: 'BC3_TYPELESS',
            77: 'BC3_UNORM',
            78: 'BC3_UNORM_SRGB',
            79: 'BC4_TYPELESS',
            80: 'BC4_UNORM',
            81: 'BC4_SNORM',
            82: 'BC5_TYPELESS',
            83: 'BC5_UNORM',
            84: 'BC5_SNORM',
            85: 'B5G6R5_UNORM',
            86: 'B5G5R5A1_UNORM',
            87: 'B8G8R8A8_UNORM',
            88: 'B8G8R8X8_UNORM',
            89: 'R10G10B10_XR_BIAS_A2_UNORM',
            90: 'B8G8R8A8_TYPELESS',
            91: 'B8G8R8A8_UNORM_SRGB',
            92: 'B8G8R8X8_TYPELESS',
            93: 'B8G8R8X8_UNORM_SRGB',
            94: 'BC6H_TYPELESS',
            95: 'BC6H_UF16',
            96: 'BC6H_SF16',
            97: 'BC7_TYPELESS',
            98: 'BC7_UNORM',
            99: 'BC7_UNORM_SRGB',
            100: 'AYUV',
            101: 'Y410',
            102: 'Y416',
            103: 'NV12',
            104: 'P010',
            105: 'P016',
            106: '420_OPAQUE',
            107: 'YUY2',
            108: 'Y210',
            109: 'Y216',
            110: 'NV11',
            111: 'AI44',
            112: 'IA44',
            113: 'P8',
            114: 'A8P8',
            115: 'B4G4R4A4_UNORM',
            130: 'P208',
            131: 'V208',
            132: 'V408',
            189: 'SAMPLER_FEEDBACK_MIN_MIP_OPAQUE',
            190: 'SAMPLER_FEEDBACK_MIP_REGION_USED_OPAQUE',
            191: 'A4B4G4R4_UNORM',
            0xffffffff: 'FORCE_UINT',
        };
        return names[value] || `DXGI_FORMAT_${value}`;
    }

    function dxgiFormatPixName(value) {
        const name = dxgiFormatName(value);
        return name.startsWith('DXGI_FORMAT_') ? name : `DXGI_FORMAT_${name}`;
    }

    function d3d12QueryTypeName(value) {
        const names = {
            0: 'OCCLUSION',
            1: 'BINARY_OCCLUSION',
            2: 'TIMESTAMP',
            3: 'PIPELINE_STATISTICS',
            4: 'SO_STATISTICS_STREAM0',
            5: 'SO_STATISTICS_STREAM1',
            6: 'SO_STATISTICS_STREAM2',
            7: 'SO_STATISTICS_STREAM3',
            8: 'VIDEO_DECODE_STATISTICS',
            10: 'PIPELINE_STATISTICS1',
        };
        return names[value] || String(value);
    }

    function d3d12PredicationOpName(value) {
        if (value == null) return null;
        const normalized = value >>> 0;
        const names = {
            0: 'EQUAL_ZERO',
            1: 'NOT_EQUAL_ZERO',
        };
        return Object.prototype.hasOwnProperty.call(names, normalized) ? names[normalized] : String(normalized);
    }

    function d3d12ResourceDimensionName(value) {
        const names = {
            0: 'UNKNOWN',
            1: 'BUFFER',
            2: 'TEXTURE1D',
            3: 'TEXTURE2D',
            4: 'TEXTURE3D',
        };
        return names[value] || String(value);
    }

    function d3d12TextureLayoutName(value) {
        const names = {
            0: 'UNKNOWN',
            1: 'ROW_MAJOR',
            2: '64KB_UNDEFINED_SWIZZLE',
            3: '64KB_STANDARD_SWIZZLE',
        };
        return names[value] || String(value);
    }

    function d3d12ResourceFlagsName(value) {
        if (value == null) return null;
        if (value === 0) return 'NONE';
        const bits = [
            [0x1, 'ALLOW_RENDER_TARGET'],
            [0x2, 'ALLOW_DEPTH_STENCIL'],
            [0x4, 'ALLOW_UNORDERED_ACCESS'],
            [0x8, 'DENY_SHADER_RESOURCE'],
            [0x10, 'ALLOW_CROSS_ADAPTER'],
            [0x20, 'ALLOW_SIMULTANEOUS_ACCESS'],
            [0x40, 'VIDEO_DECODE_REFERENCE_ONLY'],
            [0x80, 'VIDEO_ENCODE_REFERENCE_ONLY'],
            [0x100, 'RAYTRACING_ACCELERATION_STRUCTURE'],
        ];
        const names = [];
        for (const [bit, label] of bits) {
            if ((value & bit) !== 0) names.push(label);
        }
        const knownMask = bits.reduce((acc, [bit]) => acc | bit, 0);
        const remaining = value & ~knownMask;
        if (remaining) names.push(`0x${remaining.toString(16)}`);
        return names.join(' | ');
    }

    function d3d12ResourceStateName(value) {
        if (value == null) return null;
        if (value === 0) return 'COMMON';

        const bits = [
            [0x1, 'VERTEX_AND_CONSTANT_BUFFER'],
            [0x2, 'INDEX_BUFFER'],
            [0x4, 'RENDER_TARGET'],
            [0x8, 'UNORDERED_ACCESS'],
            [0x10, 'DEPTH_WRITE'],
            [0x20, 'DEPTH_READ'],
            [0x40, 'NON_PIXEL_SHADER_RESOURCE'],
            [0x80, 'PIXEL_SHADER_RESOURCE'],
            [0x100, 'STREAM_OUT'],
            [0x200, 'INDIRECT_ARGUMENT'],
            [0x400, 'COPY_DEST'],
            [0x800, 'COPY_SOURCE'],
            [0x1000, 'RESOLVE_DEST'],
            [0x2000, 'RESOLVE_SOURCE'],
            [0x4000, 'RESERVED_INTERNAL_4000'],
            [0x8000, 'RESERVED_INTERNAL_8000'],
            [0x10000, 'VIDEO_DECODE_READ'],
            [0x20000, 'VIDEO_DECODE_WRITE'],
            [0x40000, 'VIDEO_PROCESS_READ'],
            [0x80000, 'VIDEO_PROCESS_WRITE'],
            [0x100000, 'RESERVED_INTERNAL_100000'],
            [0x200000, 'VIDEO_ENCODE_READ'],
            [0x400000, 'RAYTRACING_ACCELERATION_STRUCTURE'],
            [0x800000, 'VIDEO_ENCODE_WRITE'],
            [0x1000000, 'SHADING_RATE_SOURCE'],
            [0x40000000, 'RESERVED_INTERNAL_40000000'],
            [0x80000000, 'RESERVED_INTERNAL_80000000'],
        ];

        const names = bits
            .filter(([mask]) => (value & mask) !== 0)
            .map(([, name]) => name);

        return names.length > 0 ? names.join(' | ') : `0x${(value >>> 0).toString(16)}`;
    }

    function d3d12ResourceStatePixName(value) {
        if (value == null) return null;
        if (value === 0) return 'D3D12_RESOURCE_STATE_COMMON';

        const bits = [
            [0x1, 'D3D12_RESOURCE_STATE_VERTEX_AND_CONSTANT_BUFFER'],
            [0x2, 'D3D12_RESOURCE_STATE_INDEX_BUFFER'],
            [0x4, 'D3D12_RESOURCE_STATE_RENDER_TARGET'],
            [0x8, 'D3D12_RESOURCE_STATE_UNORDERED_ACCESS'],
            [0x10, 'D3D12_RESOURCE_STATE_DEPTH_WRITE'],
            [0x20, 'D3D12_RESOURCE_STATE_DEPTH_READ'],
            [0x40, 'D3D12_RESOURCE_STATE_NON_PIXEL_SHADER_RESOURCE'],
            [0x80, 'D3D12_RESOURCE_STATE_PIXEL_SHADER_RESOURCE'],
            [0x100, 'D3D12_RESOURCE_STATE_STREAM_OUT'],
            [0x200, 'D3D12_RESOURCE_STATE_INDIRECT_ARGUMENT'],
            [0x400, 'D3D12_RESOURCE_STATE_COPY_DEST'],
            [0x800, 'D3D12_RESOURCE_STATE_COPY_SOURCE'],
            [0x1000, 'D3D12_RESOURCE_STATE_RESOLVE_DEST'],
            [0x2000, 'D3D12_RESOURCE_STATE_RESOLVE_SOURCE'],
            [0x4000, 'D3D12_RESOURCE_STATE_RESERVED_INTERNAL_4000'],
            [0x8000, 'D3D12_RESOURCE_STATE_RESERVED_INTERNAL_8000'],
            [0x10000, 'D3D12_RESOURCE_STATE_VIDEO_DECODE_READ'],
            [0x20000, 'D3D12_RESOURCE_STATE_VIDEO_DECODE_WRITE'],
            [0x40000, 'D3D12_RESOURCE_STATE_VIDEO_PROCESS_READ'],
            [0x80000, 'D3D12_RESOURCE_STATE_VIDEO_PROCESS_WRITE'],
            [0x100000, 'D3D12_RESOURCE_STATE_RESERVED_INTERNAL_100000'],
            [0x200000, 'D3D12_RESOURCE_STATE_VIDEO_ENCODE_READ'],
            [0x400000, 'D3D12_RESOURCE_STATE_RAYTRACING_ACCELERATION_STRUCTURE'],
            [0x800000, 'D3D12_RESOURCE_STATE_VIDEO_ENCODE_WRITE'],
            [0x1000000, 'D3D12_RESOURCE_STATE_SHADING_RATE_SOURCE'],
            [0x40000000, 'D3D12_RESOURCE_STATE_RESERVED_INTERNAL_40000000'],
            [0x80000000, 'D3D12_RESOURCE_STATE_RESERVED_INTERNAL_80000000'],
        ];

        const names = bits
            .filter(([mask]) => (value & mask) !== 0)
            .map(([, name]) => name);

        return names.length > 0 ? names.join('|') : `0x${(value >>> 0).toString(16)}`;
    }

    function d3d12ShadingRateName(value) {
        if (value == null) return null;
        const normalized = value >>> 0;
        const names = {
            0x0: '1X1',
            0x1: '1X2',
            0x4: '2X1',
            0x5: '2X2',
            0x6: '2X4',
            0x9: '4X2',
            0xA: '4X4',
        };
        return Object.prototype.hasOwnProperty.call(names, normalized) ? names[normalized] : `0x${normalized.toString(16)}`;
    }

    function d3d12HeapTypeName(value) {
        if (value == null) return null;
        const normalized = value >>> 0;
        const names = {
            1: 'DEFAULT',
            2: 'UPLOAD',
            3: 'READBACK',
            4: 'CUSTOM',
            5: 'GPU_UPLOAD',
        };
        return Object.prototype.hasOwnProperty.call(names, normalized) ? names[normalized] : null;
    }

    function d3d12SubresourceName(value) {
        if (value == null) return null;
        if ((value >>> 0) === 0xFFFFFFFF) return 'ALL_SUBRESOURCES';
        return String(value >>> 0);
    }

    function formatCompactTransitionBarrier(barrier, ctx) {
        if (!barrier) return '{}';
        const transitionParts = [];
        if (barrier.resourceObjectId != null) {
            transitionParts.push(`pResource=${formatObj(barrier.resourceObjectId, ctx)}`);
        }
        if (barrier.subresource != null) {
            transitionParts.push(`Subresource=${d3d12SubresourceName(barrier.subresource)}`);
        }
        if (barrier.stateBeforeRaw != null) {
            transitionParts.push(`StateBefore=${d3d12ResourceStateName(barrier.stateBeforeRaw)}`);
        }
        if (barrier.stateAfterRaw != null) {
            transitionParts.push(`StateAfter=${d3d12ResourceStateName(barrier.stateAfterRaw)}`);
        }

        return `{Type=TRANSITION, Flags=NONE, Transition={${transitionParts.join(', ')}}}`;
    }

    function formatCompactTransitionBarrierList(barriers, ctx) {
        return `[${(barriers || []).map((barrier) => formatCompactTransitionBarrier(barrier, ctx)).join(', ')}]`;
    }

    function formatPixTransitionBarrier(barrier, ctx) {
        if (!barrier) return '{}';
        const transitionParts = [];
        if (barrier.resourceObjectId != null) {
            transitionParts.push(`pResource:${formatObj(barrier.resourceObjectId, ctx)}`);
        }
        if (barrier.subresource != null) {
            transitionParts.push(`Subresource:${barrier.subresource >>> 0}`);
        }
        if (barrier.stateBeforeRaw != null) {
            transitionParts.push(`StateBefore:${d3d12ResourceStatePixName(barrier.stateBeforeRaw)}`);
        }
        if (barrier.stateAfterRaw != null) {
            transitionParts.push(`StateAfter:${d3d12ResourceStatePixName(barrier.stateAfterRaw)}`);
        }
        return `{Type:D3D12_RESOURCE_BARRIER_TYPE_TRANSITION, Flags:D3D12_RESOURCE_BARRIER_FLAG_NONE, Transition:{${transitionParts.join(', ')}}}`;
    }

    function formatPixTransitionBarrierCollection(barriers, ctx) {
        if (!barriers || barriers.length === 0) return '{}';
        if (barriers.length === 1) return formatPixTransitionBarrier(barriers[0], ctx);
        return `{${barriers.map((barrier) => `Element:${formatPixTransitionBarrier(barrier, ctx)}`).join(', ')}}`;
    }

    function inferTextureCopySubresource(copyInfo) {
        if (!copyInfo) return null;
        if (copyInfo.srcOffset == null || copyInfo.rowPitch == null || copyInfo.height == null) return null;
        const depth = copyInfo.footprintDepth || copyInfo.depth || 1;
        const sliceSize = copyInfo.rowPitch * copyInfo.height * depth;
        if (!sliceSize || copyInfo.srcOffset % sliceSize !== 0) return null;
        return copyInfo.srcOffset / sliceSize;
    }

    function formatPixCopyTextureRegionCall(copyInfo, dstObjectId, dstSubresource, ctx) {
        if (!copyInfo) return 'CopyTextureRegion()';

        const depth = copyInfo.depth != null ? copyInfo.depth : 1;
        const pDstParts = [];
        if (dstObjectId != null) pDstParts.push(`pResource:${formatObj(dstObjectId, ctx)}`);
        pDstParts.push('Type:D3D12_TEXTURE_COPY_TYPE_SUBRESOURCE_INDEX');
        if (dstSubresource != null) pDstParts.push(`SubresourceIndex:${dstSubresource}`);

        const pSrcParts = [];
        if (copyInfo.srcObjectId != null) pSrcParts.push(`pResource:${formatObj(copyInfo.srcObjectId, ctx)}`);
        pSrcParts.push('Type:D3D12_TEXTURE_COPY_TYPE_PLACED_FOOTPRINT');
        const footprintParts = [];
        if (copyInfo.srcOffset != null) footprintParts.push(`Offset:${copyInfo.srcOffset}`);
        const innerFootprintParts = [];
        if (copyInfo.formatRaw != null) innerFootprintParts.push(`Format:${dxgiFormatPixName(copyInfo.formatRaw)}`);
        if (copyInfo.width != null) innerFootprintParts.push(`Width:${copyInfo.width}`);
        if (copyInfo.height != null) innerFootprintParts.push(`Height:${copyInfo.height}`);
        innerFootprintParts.push(`Depth:${depth}`);
        if (copyInfo.rowPitch != null) innerFootprintParts.push(`RowPitch:${copyInfo.rowPitch}`);
        footprintParts.push(`Footprint:{${innerFootprintParts.join(', ')}}`);
        pSrcParts.push(`PlacedFootprint:{${footprintParts.join(', ')}}`);

        const srcBoxParts = [
            'left:0',
            'top:0',
            'front:0',
        ];
        if (copyInfo.width != null) srcBoxParts.push(`right:${copyInfo.width}`);
        if (copyInfo.height != null) srcBoxParts.push(`bottom:${copyInfo.height}`);
        srcBoxParts.push(`back:${depth}`);

        const dstX = copyInfo.dstX != null ? copyInfo.dstX : 0;
        const dstY = copyInfo.dstY != null ? copyInfo.dstY : 0;

        return `CopyTextureRegion(pDst:{${pDstParts.join(', ')}}, DstX:${dstX}, DstY:${dstY}, DstZ:0, pSrc:{${pSrcParts.join(', ')}}, pSrcBox:{${srcBoxParts.join(', ')}})`;
    }

    function formatPixColorElements(values) {
        const rgba = Array.isArray(values) ? values : [0, 0, 0, 0];
        return `{Element:${rgba[0] || 0}, Element:${rgba[1] || 0}, Element:${rgba[2] || 0}, Element:${rgba[3] || 0}}`;
    }

    function normalizeQueueNodeMask(value) {
        if (value == null) return null;
        if (value !== 0 && (value & 0xFF) === 0) return value >>> 8;
        return value >>> 0;
    }

    function addCommonThisArg(args, metaParams, ctx) {
        if (metaParams[0] != null) pushArg(args, 'this', metaParams[0], formatObj(metaParams[0], ctx));
    }

    function decodeKnownEvent(evt, ctx) {
        const opcode = evt.opcode >>> 0;
        const name = getOpcodeName(opcode);
        const meta = sanitizeMetaParams(evt.metaParams);
        const a = meta[1];
        const b = meta[2];
        const c = meta[3];
        const d = meta[4];
        const args = [];

        switch (opcode) {
            case 992:
                addCommonThisArg(args, meta, ctx);
                if (a != null) {
                    pushArg(args, 'TypeRaw', a);
                    pushArg(args, 'Type', a, d3d12CommandListTypeName(a));
                    return result(name, args, ['GetType is stored in a compact PIX form in this capture; the type enum is decoded from the packed metadata word.']);
                }
                return result(name, args, ['GetType is stored in a compact PIX form in this capture; this record did not expose a type word beyond the object id.']);
            case 993:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'returnValue', 'S_OK', 'S_OK');
                return result(
                    'Close',
                    args,
                    ['Close is decoded from the compact WPIX method form. The successful HRESULT return value is inferred as S_OK for this compact success path. Additional packed metadata words in this form are currently ignored until their meaning is identified.'],
                    'Close()',
                );
            case 994:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'returnValue', 'S_OK', 'S_OK');
                if (a != null) pushArg(args, 'pAllocator', a, formatObj(a, ctx));
                if (b == null || b === 0) {
                    pushArg(args, 'pInitialState', 'nullptr', 'nullptr');
                    return result(
                        name,
                        args,
                        ['Reset is decoded from the compact WPIX method form. The successful HRESULT return value is inferred as S_OK for this compact success path; pInitialState is treated as nullptr when the packed word is zero or omitted.'],
                        `Reset(pAllocator:${a != null ? formatObj(a, ctx) : 'nullptr'}, pInitialState:nullptr)`,
                    );
                }
                pushArg(args, 'pInitialState', b, formatObj(b, ctx));
                return result(
                    name,
                    args,
                    ['Reset is decoded from the compact WPIX method form. The successful HRESULT return value is inferred as S_OK for this compact success path.'],
                    `Reset(pAllocator:${a != null ? formatObj(a, ctx) : 'nullptr'}, pInitialState:${formatObj(b, ctx)})`,
                );
            case 996:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'IndexCountPerInstance', a);
                pushArg(args, 'InstanceCount', b);
                pushArg(args, 'StartIndexLocation', c);
                pushArg(args, 'BaseVertexLocation', d != null ? d : 0);
                pushArg(args, 'StartInstanceLocation', 0);
                return result('DrawIndexedInstanced', args, ['This capture stores the common indexed draw form in the compact opcode 996 path; StartInstanceLocation is currently inferred as zero when omitted from the packed record.']);
            case 997:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'ThreadGroupCountX', a);
                pushArg(args, 'ThreadGroupCountY', b);
                pushArg(args, 'ThreadGroupCountZ', c != null ? c : 1);
                return result('Dispatch', args, ['This capture stores a compact Dispatch form in opcode 997; thread-group counts are taken from the packed metadata words.']);
            case 998:
                if (evt.copyBufferRegion) {
                    addCommonThisArg(args, meta, ctx);
                    pushArg(args, 'pDstBuffer', a, formatObj(a, ctx));
                    pushArg(args, 'DstOffset', b != null ? b : 0);
                    pushArg(args, 'pSrcBuffer', d, formatObj(d, ctx));
                    if (evt.copyBufferRegion.srcOffset != null) pushArg(args, 'SrcOffset', evt.copyBufferRegion.srcOffset);
                    if (evt.copyBufferRegion.numBytes != null) pushArg(args, 'NumBytes', evt.copyBufferRegion.numBytes);
                    return result('CopyBufferRegion', args, ['This capture stores CopyBufferRegion in a compact PIX payload; SrcOffset and NumBytes are decoded from the trailing payload bytes.']);
                }
            case 1060:
            case 1063:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'ThreadGroupCountX', a);
                pushArg(args, 'ThreadGroupCountY', b);
                pushArg(args, 'ThreadGroupCountZ', c);
                return result(name, args);
            case 999:
                if (evt.copyTextureRegion) {
                    const copyInfo = evt.copyTextureRegion;
                    const dstObjectId = a != null ? (a >>> 8) : null;
                    const dstSubresource = inferTextureCopySubresource(copyInfo);

                    const pixCall = formatPixCopyTextureRegionCall(copyInfo, dstObjectId, dstSubresource, ctx);
                    pushArg(args, 'pDst', dstObjectId, dstObjectId != null ? formatObj(dstObjectId, ctx) : 'null');
                    pushArg(args, 'DstX', copyInfo.dstX != null ? copyInfo.dstX : 0);
                    pushArg(args, 'DstY', copyInfo.dstY != null ? copyInfo.dstY : 0);
                    pushArg(args, 'DstZ', 0);
                    pushArg(args, 'pSrc', copyInfo.srcObjectId, copyInfo.srcObjectId != null ? formatObj(copyInfo.srcObjectId, ctx) : 'null');
                    return result('CopyTextureRegion', args, [], pixCall);
                }
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'pDstBuffer', a, formatObj(a, ctx));
                pushArg(args, 'DstOffset', b);
                pushArg(args, 'pSrcBuffer', c, formatObj(c, ctx));
                pushArg(args, 'SrcOffset', d);
                return result(name, args);
            case 1001:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'pDstResource', a, formatObj(a, ctx));
                pushArg(args, 'pSrcResource', b, formatObj(b, ctx));
                return result(name, args);
            case 1003:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'PrimitiveTopology', a, primitiveTopologyName(a));
                return result('IASetPrimitiveTopology', args);
            case 1004:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'StencilRef', 0);
                return result('OMSetStencilRef', args, [], 'OMSetStencilRef(StencilRef:0)');
            case 1005:
                {
                    if (evt.scissorRects && evt.scissorRects.length > 0) {
                        pushArg(args, 'NumRects', evt.scissorRects.length);
                        pushArg(args, 'pRects', evt.scissorRects, formatPixRectList(evt.scissorRects));
                        return result(
                            'RSSetScissorRects',
                            args,
                            [],
                            `RSSetScissorRects(NumRects:${evt.scissorRects.length}, pRects:${formatPixRectList(evt.scissorRects)})`,
                        );
                    }
                    addCommonThisArg(args, meta, ctx);
                    pushArg(args, 'NumRects', evt.scissorRectCount != null ? evt.scissorRectCount : a);
                    return result('RSSetScissorRects', args, ['RSSetScissorRects is compacted in this capture; the rect array was not fully recovered for this record.']);
                }
            case 1006:
                {
                    const viewportSet = evt.viewportSet || null;
                    if (viewportSet) {
                        pushArg(args, 'NumViewports', viewportSet.numViewports);
                        pushArg(args, 'pViewports', viewportSet.viewports, formatPixViewportList(viewportSet.viewports));
                        let notes = [];
                        if (viewportSet.inferredFromScissor) {
                            notes = ['Viewport dimensions were inferred from the matching single scissor rect because this capture stores RSSetViewports in PIX\'s compact full-target form.'];
                        } else if (viewportSet.inferredFromRenderTarget) {
                            notes = ['Viewport dimensions were inferred from the currently bound render-target resource because this compact RSSetViewports record only stores the full-target token.'];
                        }
                        return result(
                            'RSSetViewports',
                            args,
                            notes,
                            `RSSetViewports(NumViewports:${viewportSet.numViewports}, pViewports:${formatPixViewportList(viewportSet.viewports)})`,
                        );
                    }
                    addCommonThisArg(args, meta, ctx);
                    pushArg(args, 'NumViewports', evt.viewportCount != null ? evt.viewportCount : (a != null ? (a & 0xFF) || a : a));
                    return result('RSSetViewports', args, ['RSSetViewports is stored in PIX\'s compact full-target form here; the exact viewport dimensions could not be proven from this record alone.']);
                }
            case 1007:
                addCommonThisArg(args, evt.coreMetaParams || meta, ctx);
                if (evt.blendFactor) {
                    pushArg(args, 'BlendFactor', evt.blendFactor, formatPixColorElements(evt.blendFactor));
                    return result('OMSetBlendFactor', args, [], `OMSetBlendFactor(BlendFactor:${formatPixColorElements(evt.blendFactor)})`);
                }
                if ((evt.coreMetaParams || [])[1] === 0) {
                    pushArg(args, 'BlendFactor', [0, 0, 0, 0], '{Element:0, Element:0, Element:0, Element:0}');
                    return result('OMSetBlendFactor', args, [], 'OMSetBlendFactor(BlendFactor:{Element:0, Element:0, Element:0, Element:0})');
                } else if ((evt.coreMetaParams || [])[1] != null) {
                    pushArg(args, 'BlendFactorRaw', (evt.coreMetaParams || [])[1], `0x${((evt.coreMetaParams || [])[1] >>> 0).toString(16)}`);
                }
                return result(name, args, ['Blend factor uses a compact PIX encoding in this capture; the non-zero form is not fully decoded yet.']);
            case 1008:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'pPipelineState', a, formatObj(a, ctx));
                return result('SetPipelineState', args);
            case 1009:
                if (evt.transitionBarriers && evt.transitionBarriers.length > 0) {
                    pushArg(args, 'NumBarriers', a);
                    pushArg(args, 'pBarriers', evt.transitionBarriers, formatPixTransitionBarrierCollection(evt.transitionBarriers, ctx));
                    const pixCall = `ResourceBarrier(NumBarriers:${a}, pBarriers:${formatPixTransitionBarrierCollection(evt.transitionBarriers, ctx)})`;
                    return result('ResourceBarrier', args, [], pixCall);
                }
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'pPipelineState', a, formatObj(a, ctx));
                if (b) pushArg(args, 'StateFlags', b);
                return result(name, args);
            case 1010:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'NumBarriers', a);
                if (b) pushArg(args, 'BarrierData0', b);
                if (c) pushArg(args, 'BarrierData1', c);
                return result(name, args);
            case 995:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'VertexCountPerInstance', a);
                pushArg(args, 'InstanceCount', b);
                pushArg(args, 'StartVertexLocation', c != null ? c : 0);
                pushArg(args, 'StartInstanceLocation', d != null ? d : 0);
                return result('DrawInstanced', args, ['This capture stores a compact DrawInstanced form in opcode 995; the four draw parameters are taken from the packed metadata words.']);
            case 1011:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'pCommandList', a, formatObj(a, ctx));
                return result(name, args);
            case 1012:
                addCommonThisArg(args, evt.coreMetaParams || meta, ctx);
                if ((evt.coreMetaParams || [])[1] != null) pushArg(args, 'DescriptorHeapSetId', (evt.coreMetaParams || [])[1]);
                {
                    const heapSet = getDescriptorHeapSet(ctx, evt);
                    if (heapSet && heapSet.heapIds && heapSet.heapIds.length > 0) {
                        pushArg(args, 'NumDescriptorHeaps', heapSet.heapIds.length);
                        pushArg(args, 'ppDescriptorHeaps', heapSet.heapIds, `{${heapSet.heapIds.map((heapId) => `Element:${formatObj(heapId, ctx)}`).join(', ')}}`);
                        return result(
                            name,
                            args,
                            ['Descriptor heap object ids were inferred from the descriptor-table heap bases used after this compact SetDescriptorHeaps record on the same command list. Unused bound heaps may still be absent from the observed set.'],
                            `SetDescriptorHeaps(NumDescriptorHeaps:${heapSet.heapIds.length}, ppDescriptorHeaps:{${heapSet.heapIds.map((heapId) => `Element:${formatObj(heapId, ctx)}`).join(', ')}})`,
                        );
                    }
                }
                return result(name, args, ['SetDescriptorHeaps is compacted in this capture; the heap set is currently identified by PIX\'s packed set id rather than expanded per-heap object ids.']);
            case 1013:
            case 1014:
            case 1051:
            case 1054:
            case 1055:
            case 1059:
            case 1062:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'pObject', a, formatObj(a, ctx));
                return result(name, args);
            case 1015:
            case 1016:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'RootParameterIndex', a);
                pushArg(args, 'DescriptorTableBase', b);
                pushArg(args, 'DescriptorTableOffset', c);
                return result(name, args);
            case 1017:
            case 1018:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'RootParameterIndex', a);
                pushArg(args, 'SrcData', b);
                pushArg(args, 'DestOffsetIn32BitValues', c);
                return result(name, args);
            case 1019:
            case 1020:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'RootParameterIndex', a);
                pushArg(args, 'Num32BitValuesToSet', b);
                if (c != null) {
                    if (c === 2049 && (d == null || d === 0)) {
                        pushArg(args, 'pSrcData', '<blob>', '<blob>');
                        pushArg(args, 'DestOffsetIn32BitValues', 0);
                        return result(name, args);
                    }
                    pushArg(args, 'DestOffsetIn32BitValues', c);
                }
                return result(name, args);
            case 1021:
            case 1022:
            case 1023:
            case 1024:
            case 1025:
            case 1026:
                if (evt.opcode === 1026) {
                    addCommonThisArg(args, meta, ctx);
                    if (a === 1 && b === 0) {
                        pushArg(args, 'pBuffer', 'nullptr', 'nullptr');
                        pushArg(args, 'AlignedBufferOffset', 0);
                        pushArg(args, 'Operation', 0, 'D3D12_PREDICATION_OP_EQUAL_ZERO');
                        return result('SetPredication', args);
                    }
                    if (((a >>> 24) & 0xFF) === 9 && b === 0) {
                        const viewLabel = getBufferViewLabel(ctx, 'ibv1', evt);
                        if (viewLabel) {
                            pushArg(args, 'pView', viewLabel, viewLabel);
                            return result('IASetIndexBuffer', args, [], `IASetIndexBuffer(pView:${viewLabel})`);
                        }
                        return result('IASetIndexBuffer', args, ['IASetIndexBuffer is compacted in this capture; the packed view token is recognized, but the PIX-style pView label is not yet resolved for this record.']);
                    }
                }
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'RootParameterIndex', a);
                pushArg(args, 'BufferLocation', b);
                return result(name, args);
            case 1027:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'StartSlot', a);
                pushArg(args, 'NumViews', b);
                if (b === 1) {
                    const viewLabel = getBufferViewLabel(ctx, 'vbv1', evt);
                    if (viewLabel) {
                        pushArg(args, 'pViews', viewLabel, viewLabel);
                        return result('IASetVertexBuffers', args, [], `IASetVertexBuffers(StartSlot:${a}, NumViews:${b}, pViews:${viewLabel})`);
                    }
                }
                return result('IASetVertexBuffers', args);
            case 1028:
                addCommonThisArg(args, meta, ctx);
                if (b === 4) {
                    pushArg(args, 'StartSlot', a);
                    pushArg(args, 'NumViews', b);
                    return result('SOSetTargets', args, ['SOSetTargets is compacted in this capture; the detailed stream-output view payload is not fully expanded yet.']);
                }
                pushArg(args, 'StartSlot', a);
                pushArg(args, 'NumViews', b);
                return result('IASetVertexBuffers', args);
            case 1029:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'NumRenderTargetDescriptors', a);
                pushArg(args, 'RTsSingleHandleToDescriptorRange', 0);
                const descriptorBindings = getRecentDescriptorBindings(ctx, evt, meta[0], a);
                if (descriptorBindings && descriptorBindings.renderTargetLabels.length === a) {
                    pushArg(args, 'pRenderTargetDescriptors', descriptorBindings.renderTargetLabels, formatPixDescriptorList(descriptorBindings.renderTargetLabels));
                    if (descriptorBindings.depthStencilLabel) {
                        pushArg(args, 'pDepthStencilDescriptor', descriptorBindings.depthStencilLabel, descriptorBindings.depthStencilLabel);
                        return result(
                            'OMSetRenderTargets',
                            args,
                            [],
                            `OMSetRenderTargets(NumRenderTargetDescriptors:${a}, pRenderTargetDescriptors:${formatPixDescriptorList(descriptorBindings.renderTargetLabels)}, RTsSingleHandleToDescriptorRange:0, pDepthStencilDescriptor:${descriptorBindings.depthStencilLabel})`,
                        );
                    }
                    if (a === 1 && evt.dataSize <= 128) {
                        pushArg(args, 'pDepthStencilDescriptor', 'nullptr', 'nullptr');
                        return result(
                            'OMSetRenderTargets',
                            args,
                            [],
                            `OMSetRenderTargets(NumRenderTargetDescriptors:${a}, pRenderTargetDescriptors:${formatPixDescriptorList(descriptorBindings.renderTargetLabels)}, RTsSingleHandleToDescriptorRange:0, pDepthStencilDescriptor:nullptr)`,
                        );
                    }
                }
                if (a === 1 && evt.dataSize <= 128) {
                    pushArg(args, 'pDepthStencilDescriptor', 'nullptr', 'nullptr');
                    return result('OMSetRenderTargets', args);
                }
                if (evt.metaParams && evt.metaParams[4] != null) {
                    pushArg(args, 'DescriptorToken', evt.metaParams[4], `0x${(evt.metaParams[4] >>> 0).toString(16)}`);
                    return result('OMSetRenderTargets', args, ['OMSetRenderTargets is stored in a compact PIX descriptor form here; descriptor handles are only partially decoded so the call currently exposes the bound count and packed descriptor token.']);
                }
                return result('OMSetRenderTargets', args);
            case 1030:
                addCommonThisArg(args, evt.coreMetaParams || meta, ctx);
                let dsvDisplay = 'nullptr';
                if (evt.renderTargetInfo) {
                    const dsvLabel = getDescriptorLabel(ctx, 'dsv', evt.renderTargetInfo.firstDescriptorHex, evt.renderTargetInfo.descriptorWord);
                    dsvDisplay = dsvLabel || evt.renderTargetInfo.firstDescriptorHex;
                    pushArg(args, 'DepthStencilView', dsvDisplay, dsvDisplay);
                }
                pushArg(args, 'ClearFlags', 'D3D12_CLEAR_FLAG_DEPTH|D3D12_CLEAR_FLAG_STENCIL', 'D3D12_CLEAR_FLAG_DEPTH|D3D12_CLEAR_FLAG_STENCIL');
                pushArg(args, 'Depth', 0);
                pushArg(args, 'Stencil', 0);
                pushArg(args, 'NumRects', 0);
                pushArg(args, 'pRects', 'nullptr', 'nullptr');
                return result(
                    'ClearDepthStencilView',
                    args,
                    [],
                    `ClearDepthStencilView(DepthStencilView:${dsvDisplay}, ClearFlags:D3D12_CLEAR_FLAG_DEPTH|D3D12_CLEAR_FLAG_STENCIL, Depth:0, Stencil:0, NumRects:0, pRects:nullptr)`,
                );
            case 1031:
                addCommonThisArg(args, evt.coreMetaParams || meta, ctx);
                const clearColor = evt.renderTargetClearColor || [0, 0, 0, 0];
                let rtvDisplay = 'nullptr';
                if (evt.depthStencilClear) {
                    const rtvLabel = getDescriptorLabel(ctx, 'rtv', evt.depthStencilClear.depthStencilViewHex, evt.depthStencilClear.descriptorWord);
                    rtvDisplay = rtvLabel || evt.depthStencilClear.depthStencilViewHex;
                    pushArg(args, 'RenderTargetView', rtvDisplay, rtvDisplay);
                }
                pushArg(args, 'ColorRGBA', clearColor, formatPixColorElements(clearColor));
                pushArg(args, 'NumRects', 0);
                pushArg(args, 'pRects', 'nullptr', 'nullptr');
                return result(
                    'ClearRenderTargetView',
                    args,
                    [],
                    `ClearRenderTargetView(RenderTargetView:${rtvDisplay}, ColorRGBA:${formatPixColorElements(clearColor)}, NumRects:0, pRects:nullptr)`,
                );
            case 1035:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'pResource', a, formatObj(a, ctx));
                return result(name, args);
            case 1036:
            case 1037:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'pQueryHeap', a, formatObj(a, ctx));
                pushArg(args, 'Type', b, d3d12QueryTypeName(b));
                pushArg(args, 'Index', c);
                return result(name, args);
            case 1038:
                {
                    const inferred = getResolveQueryInfo(ctx, evt);
                    addCommonThisArg(args, meta, ctx);
                    if (inferred) {
                        if (inferred.queryHeapObjectId != null) pushArg(args, 'pQueryHeap', inferred.queryHeapObjectId, formatObj(inferred.queryHeapObjectId, ctx));
                        if (inferred.typeRaw != null) pushArg(args, 'Type', inferred.typeRaw, d3d12QueryTypeName(inferred.typeRaw));
                        if (inferred.startIndex != null) pushArg(args, 'StartIndex', inferred.startIndex);
                        if (inferred.numQueries != null) pushArg(args, 'NumQueries', inferred.numQueries);
                        if (inferred.destinationBufferObjectId != null) pushArg(args, 'pDestinationBuffer', inferred.destinationBufferObjectId, formatObj(inferred.destinationBufferObjectId, ctx));
                        if (inferred.alignedDestinationBufferOffset != null) pushArg(args, 'AlignedDestinationBufferOffset', inferred.alignedDestinationBufferOffset);
                        return result(name, args, ['ResolveQueryData is inferred from the paired EndQuery payload in this capture; query heap, destination buffer, and aligned offset come from the matching timestamp query record.']);
                    }
                    pushArg(args, 'pQueryHeap', meta[0], formatObj(meta[0], ctx));
                    if (a != null) pushArg(args, 'StartIndex', a);
                    if (b != null) pushArg(args, 'NumQueries', b);
                    if (c != null) pushArg(args, 'pDestinationBuffer', c, formatObj(c, ctx));
                    return result(name, args);
                }
            case 1039:
                addCommonThisArg(args, meta, ctx);
                if (a == null || a === 0) {
                    pushArg(args, 'pBuffer', 'nullptr', 'nullptr');
                } else {
                    pushArg(args, 'pBuffer', a, formatObj(a, ctx));
                }
                if (b != null) pushArg(args, 'AlignedBufferOffset', b);
                if (c != null) pushArg(args, 'Operation', c, `D3D12_PREDICATION_OP_${d3d12PredicationOpName(c)}`);
                return result(name, args);
            case 1040:
            case 1041:
                addCommonThisArg(args, meta, ctx);
                if (evt.userString === 'PreDraw') {
                    return result('PreDraw', args, ['PreDraw is emitted as a PIX marker/event string in this capture.']);
                }
                if (evt.userString === 'PrepareForPresent') {
                    return result('PrepareForPresent', args, ['PrepareForPresent is emitted as a PIX marker/event string in this capture.'], 'PrepareForPresent()');
                }
                if (evt.userString) pushArg(args, 'Text', evt.userString);
                return result(name, args);
            case 1043:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'pCommandSignature', a, formatObj(a, ctx));
                pushArg(args, 'MaxCommandCount', b);
                return result(name, args);
            case 1046:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'Min', a);
                pushArg(args, 'Max', b);
                return result(name, args);
            case 1047:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'NumSamplesPerPixel', a);
                pushArg(args, 'NumPixels', b);
                return result(name, args);
            case 1049:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'Mask', a);
                return result(name, args);
            case 1050:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'Count', a);
                return result(name, args);
            case 1052:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'NumRenderTargets', a);
                return result(name, args);
            case 1061:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'BaseShadingRate', a, `D3D12_SHADING_RATE_${d3d12ShadingRateName(a)}`);
                return result(name, args);
            case 1064:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'NumBarrierGroups', a);
                return result(name, args);
            case 1065:
                addCommonThisArg(args, meta, ctx);
                pushArg(args, 'NumCommandLists', a);
                {
                    const executeInfo = getExecuteBundleInfo(ctx, evt);
                    const submittedCommandLists = executeInfo && executeInfo.commandListIds && executeInfo.commandListIds.length > 0
                        ? executeInfo.commandListIds
                        : (a === 1 && d != null ? [d] : []);
                    if (submittedCommandLists.length > 0) {
                        const display = `{${submittedCommandLists.map((id, index) => `Element_${index}:${formatObj(id, ctx)}`).join(', ')}}`;
                        pushArg(args, 'ppCommandLists', submittedCommandLists, display);
                        const notes = ['This ExecuteCommandLists record stores a compact single-command-list submission; the submitted command-list object id is carried in the final metadata word.'];
                        if (executeInfo && executeInfo.bundleRecordId != null) {
                            notes.push(`This submission immediately follows PIXCmdListBundle RecordId ${executeInfo.bundleRecordId}${executeInfo.resourceObjectId != null ? ` for ${formatObj(executeInfo.resourceObjectId, ctx)}` : ''}.`);
                        }
                        return result(
                            name,
                            args,
                            notes,
                            `ExecuteCommandLists(this=${formatObj(meta[0], ctx)}, NumCommandLists:${a}, ppCommandLists:${display})`,
                        );
                    }
                }
                if (b != null) pushArg(args, 'PackedWord0', b);
                if (c != null) pushArg(args, 'PackedWord1', c);
                if (d != null) pushArg(args, 'PackedWord2', d);
                return result(name, args, ['ExecuteCommandLists is stored in a compact submission form here; the command-list pointer array has not been expanded for this record.']);
            case 1069:
            case 1070:
                addCommonThisArg(args, meta, ctx);
                {
                    const inferredFenceId = (b == null || b === 0) ? getInferredSignalFenceId(ctx, evt) : null;
                    const fenceId = inferredFenceId != null ? inferredFenceId : b;
                    pushArg(args, 'pFence', fenceId, formatObj(fenceId, ctx));
                    pushArg(args, 'Value', c);
                    if (inferredFenceId != null) {
                        return result(name, args, ['Fence object id was inferred from the queue-local signal pattern because this WPIX record stores zero in the fence slot for this value.']);
                    }
                }
                return result(name, args);
            case 1075:
                pushArg(args, 'RecordId', evt.recordId != null ? evt.recordId : evt.param1);
                if (evt.objectId != null) pushArg(args, 'ObjectId', evt.objectId, formatObj(evt.objectId, ctx));
                if (evt.recordVersion != null) pushArg(args, 'Version', evt.recordVersion);
                if (evt.queueTypeRaw != null) {
                    pushArg(args, 'QueueTypeRaw', evt.queueTypeRaw);
                    pushArg(args, 'QueueType', queueTypeName(evt.queueTypeRaw), queueTypeName(evt.queueTypeRaw));
                }
                if (evt.queueField1 != null) {
                    pushArg(args, 'QueuePriorityRaw', evt.queueField1);
                    pushArg(args, 'QueuePriority', evt.queueField1, `D3D12_COMMAND_QUEUE_PRIORITY_${d3d12CommandQueuePriorityName(evt.queueField1)}`);
                }
                if (evt.queueField2 != null) {
                    pushArg(args, 'QueueFlagsRaw', evt.queueField2, `0x${(evt.queueField2 >>> 0).toString(16).padStart(8, '0')}`);
                    pushArg(args, 'QueueFlags', evt.queueField2, `D3D12_COMMAND_QUEUE_FLAG_${d3d12CommandQueueFlagsName(evt.queueField2).replace(/ \| /g, '|D3D12_COMMAND_QUEUE_FLAG_')}`);
                }
                if (evt.queueNodeMaskRaw != null) pushArg(args, 'NodeMaskRaw', evt.queueNodeMaskRaw, `0x${(evt.queueNodeMaskRaw >>> 0).toString(16).padStart(8, '0')}`);
                const normalizedNodeMask = normalizeQueueNodeMask(evt.queueNodeMaskRaw);
                if (normalizedNodeMask != null) pushArg(args, 'NodeMask', normalizedNodeMask, `0x${(normalizedNodeMask >>> 0).toString(16).padStart(8, '0')}`);
                if (evt.objectGuid) pushArg(args, 'InterfaceGuid', evt.objectGuid);
                if (evt.objectGuid) pushArg(args, 'Interface', getInterfaceName(evt.objectGuid), getInterfaceName(evt.objectGuid));
                return result(name, args, ['QueueType, QueuePriority, QueueFlags, and NodeMask are decoded from the WPIX queue record using D3D12_COMMAND_QUEUE_DESC field ordering.']);
            case 1076:
            case 1095:
            case 1103:
            case 1711:
                pushArg(args, 'RecordId', evt.recordId != null ? evt.recordId : evt.param1);
                if (evt.objectId != null) pushArg(args, 'ObjectId', evt.objectId, formatObj(evt.objectId, ctx));
                if (evt.recordVersion != null) pushArg(args, 'Version', evt.recordVersion);
                if (evt.objectGuid) pushArg(args, 'InterfaceGuid', evt.objectGuid);
                if (evt.objectGuid) pushArg(args, 'Interface', getInterfaceName(evt.objectGuid), getInterfaceName(evt.objectGuid));
                if (opcode === 1095) {
                    if (evt.field0 != null) pushArg(args, 'Field0', evt.field0, `0x${(evt.field0 >>> 0).toString(16)}`);
                    if (evt.field1 != null) pushArg(args, 'Field1', evt.field1, `0x${(evt.field1 >>> 0).toString(16)}`);
                    if (evt.field2 != null) pushArg(args, 'Field2', evt.field2, `0x${(evt.field2 >>> 0).toString(16)}`);
                    return result(name, args, ['Heap record field meanings are not fully named yet, but the interface and object id are decoded from WPIX data.']);
                }
                if (opcode === 1103 && evt.fenceValue != null) pushArg(args, 'InitialValue', evt.fenceValue);
                return result(name, args);
            case 1860:
                addCommonThisArg(args, meta, ctx);
                return result(name, args);
            case 1077:
            case 1078:
                pushArg(args, 'ObjectId', evt.param1);
                if (evt.recordVersion != null) pushArg(args, 'Version', evt.recordVersion);
                pushArg(args, 'PayloadSize', evt.dataSize);
                if (evt.blobMagic) pushArg(args, 'BlobMagic', evt.blobMagic);
                if (evt.embeddedStrings && evt.embeddedStrings.length) pushArg(args, 'Strings', evt.embeddedStrings);
                return result(name, args);
            case 1700:
                pushArg(args, 'RecordId', evt.param1);
                if (meta[1] != null) pushArg(args, 'ObjectId', meta[1], formatObj(meta[1], ctx));
                pushArg(args, 'CreationType', 'Committed', 'Committed');
                if (meta[2] != null) {
                    pushArg(args, 'HeapTypeRaw', meta[2]);
                    const heapTypeName = d3d12HeapTypeName(meta[2]);
                    if (heapTypeName) pushArg(args, 'HeapType', meta[2], `D3D12_HEAP_TYPE_${heapTypeName}`);
                }
                if (evt.resourceDesc) {
                    pushArg(args, 'Dimension', evt.resourceDesc.dimensionRaw, d3d12ResourceDimensionName(evt.resourceDesc.dimensionRaw));
                    if (evt.resourceDesc.alignment != null) pushArg(args, 'Alignment', evt.resourceDesc.alignment);
                    if (evt.resourceDesc.width != null) pushArg(args, 'Width', evt.resourceDesc.width);
                    if (evt.resourceDesc.height != null) pushArg(args, 'Height', evt.resourceDesc.height);
                    if (evt.resourceDesc.depthOrArraySize != null) pushArg(args, 'DepthOrArraySize', evt.resourceDesc.depthOrArraySize);
                    if (evt.resourceDesc.mipLevels != null) pushArg(args, 'MipLevels', evt.resourceDesc.mipLevels);
                    if (evt.resourceDesc.formatRaw != null) pushArg(args, 'Format', evt.resourceDesc.formatRaw, dxgiFormatName(evt.resourceDesc.formatRaw));
                    if (evt.resourceDesc.sampleCount != null) pushArg(args, 'SampleCount', evt.resourceDesc.sampleCount);
                    if (evt.resourceDesc.layoutRaw != null) pushArg(args, 'Layout', evt.resourceDesc.layoutRaw, d3d12TextureLayoutName(evt.resourceDesc.layoutRaw));
                    if (evt.resourceDesc.flagsRaw != null) pushArg(args, 'Flags', evt.resourceDesc.flagsRaw, d3d12ResourceFlagsName(evt.resourceDesc.flagsRaw));
                }
                if (meta[3] != null) pushArg(args, 'Meta3', meta[3]);
                if (meta[4] != null) pushArg(args, 'Meta4', meta[4]);
                return result(name, args, ['This WPIX record family appears to describe committed resources. HeapType is decoded when the committed-resource token matches a standard D3D12_HEAP_TYPE value; any remaining committed-resource metadata stays conservative.']);
            case 1566:
                pushArg(args, 'PayloadSize', evt.dataSize);
                if (evt.embeddedStrings && evt.embeddedStrings.length) pushArg(args, 'Strings', evt.embeddedStrings);
                return result(name, args);
            case 1767:
                pushArg(args, 'RecordId', evt.param1);
                if (meta[1] != null) pushArg(args, 'ObjectId', meta[1], formatObj(meta[1], ctx));
                pushArg(args, 'CreationType', 'Placed', 'Placed');
                if (meta[2] != null) pushArg(args, 'Heap', meta[2], formatObj(meta[2], ctx));
                if (meta[3] != null) pushArg(args, 'HeapOffset', meta[3]);
                if (evt.resourceDesc) {
                    pushArg(args, 'Dimension', evt.resourceDesc.dimensionRaw, d3d12ResourceDimensionName(evt.resourceDesc.dimensionRaw));
                    if (evt.resourceDesc.alignment != null) pushArg(args, 'Alignment', evt.resourceDesc.alignment);
                    if (evt.resourceDesc.width != null) pushArg(args, 'Width', evt.resourceDesc.width);
                    if (evt.resourceDesc.height != null) pushArg(args, 'Height', evt.resourceDesc.height);
                    if (evt.resourceDesc.depthOrArraySize != null) pushArg(args, 'DepthOrArraySize', evt.resourceDesc.depthOrArraySize);
                    if (evt.resourceDesc.mipLevels != null) pushArg(args, 'MipLevels', evt.resourceDesc.mipLevels);
                    if (evt.resourceDesc.formatRaw != null) pushArg(args, 'Format', evt.resourceDesc.formatRaw, dxgiFormatName(evt.resourceDesc.formatRaw));
                    if (evt.resourceDesc.sampleCount != null) pushArg(args, 'SampleCount', evt.resourceDesc.sampleCount);
                    if (evt.resourceDesc.layoutRaw != null) pushArg(args, 'Layout', evt.resourceDesc.layoutRaw, d3d12TextureLayoutName(evt.resourceDesc.layoutRaw));
                    if (evt.resourceDesc.flagsRaw != null) pushArg(args, 'Flags', evt.resourceDesc.flagsRaw, d3d12ResourceFlagsName(evt.resourceDesc.flagsRaw));
                }
                return result(name, args, ['This WPIX record family appears to describe placed resources. Heap, HeapOffset, and the resource description are decoded from the binary payload.']);
            case 1885:
                addCommonThisArg(args, meta, ctx);
                if (a != null) pushArg(args, 'pResource', a, formatObj(a, ctx));
                if (b != null) pushArg(args, 'Subresource', b);
                return result(name, args);
            case 2029:
                pushArg(args, 'RecordId', evt.param1);
                pushArg(args, 'PayloadSize', evt.dataSize);
                if (meta[0] != null) pushArg(args, 'StreamId', meta[0]);
                if (meta[1] != null) pushArg(args, 'ChunkIndex', meta[1]);
                if (meta[4] != null) pushArg(args, 'Flags', meta[4]);
                return result(name, args);
            case 2031:
                pushArg(args, 'PresentId', evt.param1);
                pushArg(args, 'PayloadSize', evt.dataSize);
                return result(name, args);
            case 2032:
                pushArg(args, 'ObjectId', evt.param1);
                if (evt.resourceHandle != null) pushArg(args, 'ResourceHandle', evt.resourceHandle);
                if (evt.resourceName) pushArg(args, 'Name', evt.resourceName);
                return result(name, args);
            case 2033:
            case 2034:
                pushArg(args, 'RecordId', evt.param1);
                pushArg(args, 'PayloadSize', evt.dataSize);
                if (meta[0] != null) pushArg(args, 'Info0', meta[0]);
                if (meta[1] != null) pushArg(args, 'Info1', meta[1]);
                if (meta[2] != null) pushArg(args, 'LinkedEventRecordId', meta[2]);
                if (opcode === 2034 && meta[3] != null) {
                    pushArg(args, 'ResourceObjectId', meta[3], formatObj(meta[3], ctx));
                } else if (meta[3] != null) {
                    pushArg(args, 'Info3', meta[3]);
                }
                if (meta[4] != null) pushArg(args, 'Info4', meta[4]);
                if (meta[2] != null) {
                    const linkedEvent = getEventByRecordId(ctx, meta[2]);
                    const linkedCall = getDecodedCall(linkedEvent, ctx);
                    if (linkedCall) pushArg(args, 'LinkedEvent', linkedCall, linkedCall);
                }
                if (opcode === 2034) {
                    const bundleInfo = getPixBundleForEvent(ctx, evt);
                    if (bundleInfo && bundleInfo.executeCommandLists && bundleInfo.executeCommandLists.length > 0) {
                        const commandListIds = bundleInfo.executeCommandLists.flatMap((entry) => entry.commandListIds || []);
                        if (commandListIds.length > 0) {
                            const display = `{${commandListIds.map((id, index) => `Element_${index}:${formatObj(id, ctx)}`).join(', ')}}`;
                            pushArg(args, 'FollowingCommandLists', commandListIds, display);
                        }
                    }
                }
                if (evt.userString) pushArg(args, 'Text', evt.userString);
                if (opcode === 2034) {
                    const notes = ['This internal PIX bundle record appears immediately before one or more ExecuteCommandLists submissions and likely wraps staged command-list-related data for the referenced resource.'];
                    return result(name, args, notes);
                }
                return result(name, args);
            case 2035:
                pushArg(args, 'RecordId', evt.recordId != null ? evt.recordId : evt.param1);
                pushArg(args, 'PayloadSize', evt.dataSize);
                if (evt.objectId != null) pushArg(args, 'ObjectId', evt.objectId, formatObj(evt.objectId, ctx));
                if (meta[1] != null && meta[1] !== evt.objectId) {
                    const interfaceName = evt.objectGuid ? getInterfaceName(evt.objectGuid) : null;
                    const label = interfaceName === 'ID3D12Fence' ? 'OriginalObjectId' : 'LinkedObjectId';
                    pushArg(args, label, meta[1], formatObj(meta[1], ctx));
                }
                if (evt.objectGuid) pushArg(args, 'InterfaceGuid', evt.objectGuid);
                if (evt.objectGuid) pushArg(args, 'Interface', getInterfaceName(evt.objectGuid), getInterfaceName(evt.objectGuid));
                if (meta[1] != null && meta[1] !== evt.objectId && (evt.objectGuid ? getInterfaceName(evt.objectGuid) === 'ID3D12Fence' : false)) {
                    return result(name, args, ['This WPIX record links a shared fence object to its original fence object id.']);
                }
                return result(name, args);
            case 2042:
            case 2043:
            case 2044:
                pushArg(args, 'RecordId', evt.param1);
                pushArg(args, 'PayloadSize', evt.dataSize);
                if (evt.embeddedStrings && evt.embeddedStrings.length) pushArg(args, 'Strings', evt.embeddedStrings);
                if (opcode === 2044 && evt.recordVersion != null) pushArg(args, 'Version', evt.recordVersion);
                return result(name, args);
            default:
                if ((opcode & 0xFFFFFF00) === 0x0D040D00) {
                    pushArg(args, 'RecordId', evt.param1);
                    pushArg(args, 'Param2', evt.param2);
                    pushArg(args, 'PayloadSize', evt.dataSize);
                    meta.forEach((value, index) => {
                        if (value != null) pushArg(args, `Meta${index}`, value);
                    });
                    if (evt.embeddedStrings && evt.embeddedStrings.length) pushArg(args, 'Strings', evt.embeddedStrings);
                    return result(name, args);
                }
        }

        return null;
    }

    function decodeFallback(evt) {
        const args = [];
        pushArg(args, 'Param1', evt.param1);
        if (evt.param2) pushArg(args, 'Param2', evt.param2);
        if (evt.dataSize != null) pushArg(args, 'PayloadSize', evt.dataSize);
        sanitizeMetaParams(evt.metaParams).forEach((value, index) => {
            if (value != null) pushArg(args, `Meta${index}`, value);
        });
        if (evt.userString) pushArg(args, 'Text', evt.userString);
        if (evt.embeddedStrings && evt.embeddedStrings.length) pushArg(args, 'Strings', evt.embeddedStrings);
        return result(getOpcodeName(evt.opcode >>> 0), args);
    }

    function decodeEvent(evt, ctx) {
        return decodeKnownEvent(evt, ctx || {}) || decodeFallback(evt);
    }

    global.WPixEventDecoder = {
        sanitizeMetaParams,
        getOpcodeName,
        getInterfaceName,
        buildObjectInfo,
        buildQueueInfo,
        buildResourceInfo,
        buildResolveQueryInfo,
        buildSignalInfo,
        buildDescriptorInfo,
        buildDescriptorHeapSetInfo,
        buildPixBundleInfo,
        buildRasterStateInfo,
        buildBufferViewInfo,
        classifyPixVisibility,
        decodeEvent,
    };
}(typeof globalThis !== 'undefined' ? globalThis : window));
