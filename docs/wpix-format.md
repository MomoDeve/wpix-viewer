# WPIX Format

This document summarizes the file structure and record families currently identified in WPIX files.

## Status And Confidence

`wpix-viewer` does not fully decode WPIX. These notes describe the current working model used by the parser and viewer.

Important caveats:

- some record families are only partially understood
- some command decodes rely on compact PIX-specific payload patterns
- some values are inferred from surrounding state instead of being proven from one record alone
- different captures may contain forms the current parser still does not handle

The viewer is useful, but it is still incomplete and may contain mistakes.

## 1. File Layout

Known top-level structure:

```text
0x000  GFXA
0x004  0xFFFFFFFF
0x008  GFXB
...
0x400  capture data
...
DIR3 / DIR2 / DIR1 / DIR0
...
GFXB
GFXA
```

The footer mirrors the header markers.

## 2. Blocks

Capture content is stored in `BLOK` chunks.

### `BLOKCOMP`

- compressed with Microsoft XPRESS plain LZ77
- contains a `CBLK DATA` sub-header with decompressed size

### `BLOKDATA`

- raw uncompressed block

## 3. Directory

The directory near the end of the file enumerates the blocks in the capture.

Most useful entry type:

- `DIR3`
  - block type
  - block file offset
  - block size

## 4. Event Envelope

Many block families contain records with the same outer structure:

```text
<EVT
opcode
param1
param2 / reserved
dataSize
...
META
...
```

## 5. Important Block Types

The following block families are especially important for D3D12 capture content:

| Type | Hex     | Meaning                      |
| ---- | ------- | ---------------------------- |
| 2    | `0x02`  | capture metadata             |
| 3    | `0x03`  | object table                 |
| 100  | `0x64`  | command-list related records |
| 300  | `0x12C` | resource debug names         |
| 1000 | `0x3E8` | Event Index                  |
| 1001 | `0x3E9` | Event Details                |

## 6. Opcode Model

Many D3D12 API opcodes follow COM vtable indexing with interface-specific bases.

Examples:

- `ID3D12CommandQueue`
  - `1065` = `ExecuteCommandLists`
  - `1069` = `Signal`
  - `1070` = `Wait`

- `ID3D12GraphicsCommandList`
  - many methods appear in the `99x` through `10xx` range
  - some payloads use compact PIX-specific layouts

## 7. Current Decode Coverage

This is the current practical support status of the viewer, not a guarantee that every capture will decode the same way.

### Parsed Reliably Enough To Be Useful

- file header / footer markers
- block directory
- `BLOKCOMP` and `BLOKDATA`
- event envelopes and metadata words
- capture metadata strings
- object records with interface GUID typing
- resource debug-name records
- queue records
- committed and placed resource records
- binary-derived resource table
- PIX-style GPU-visible ordering used by the app

### D3D12 Commands With Meaningful Decode Coverage

Commonly useful decode coverage exists for many events in tested captures, including:

- `GetType`
- `Close`
- `Reset`
- `DrawInstanced`
- `DrawIndexedInstanced`
- `Dispatch`
- `CopyBufferRegion`
- `CopyTextureRegion`
- `CopyResource`
- `IASetPrimitiveTopology`
- `RSSetScissorRects`
- `RSSetViewports`
- `OMSetBlendFactor` common forms
- `SetPipelineState`
- `ResourceBarrier` compact transition form
- `ExecuteBundle`
- `SetDescriptorHeaps`
- root signature / root table / root constant / root descriptor bindings
- `IASetIndexBuffer`
- `IASetVertexBuffers`
- `OMSetRenderTargets` common compact forms
- `ClearDepthStencilView`
- `ClearRenderTargetView`
- `BeginQuery`
- `EndQuery`
- inferred `ResolveQueryData`
- `SetPredication`
- marker / begin-event string records including `PrepareForPresent`
- `ExecuteIndirect` partial surface decode
- `OMSetDepthBounds`
- `SetSamplePositions` partial surface decode
- `SetViewInstanceMask`
- `WriteBufferImmediate` partial surface decode
- `BeginRenderPass` partial surface decode
- `RSSetShadingRate`
- `ExecuteCommandLists`
- `Signal`
- `Wait`
- `Present`
- PIX internal command-list bundle records used by the app

### Partial / Heuristic Areas

These are recognized, but not fully decoded:

- compact viewport and scissor encodings outside the proven forms
- compact descriptor payloads
- compact render-target binding payloads
- non-zero `OMSetBlendFactor` forms outside the known form
- PIX internal marker payloads
- some object / heap / resource metadata fields still exposed conservatively
- synthetic or inferred helper events, such as the app's current `PrepareForPresent` insertion for known present patterns

## 8. Object and Name Records

Object typing is associated with:

- object-table records with COM interface GUIDs
- resource-name records from block type `0x12C`

Examples of object labels:

- `obj#8 <ID3D12GraphicsCommandList4>`
- `obj#110 <ID3D12Heap>`

## 9. Resource Record Families

Two record families are currently associated with resource creation data.

### `1700` - committed resource

Current interpretation:

- `meta[1]` = object id
- `meta[2]` = heap-type token, often decodable to a standard `D3D12_HEAP_TYPE`
- resource description starts 12 bytes into the payload

Fields identified in the payload:

- dimension
- alignment
- width
- height
- depth/array size
- mip levels
- format
- sample count
- layout
- flags

### `1767` - placed resource

Current interpretation:

- `meta[1]` = object id
- `meta[2]` = heap object id
- `meta[3]` = heap offset
- resource description starts at payload offset 0

Fields identified in the payload:

- dimension
- alignment
- width
- height
- depth/array size
- mip levels
- format
- sample count
- layout
- flags
- heap object
- heap offset

## 10. Resource Data Used by the App

The application resource table is populated from WPIX content, including:

- object typing
- resource names
- `1700` / `1767` resource creation records
- compact `CopyTextureRegion` footprint data where applicable

## 11. Missing Or Incomplete D3D12 Coverage

The following areas are still missing dedicated support or are not decoded deeply enough yet.

### Missing Dedicated Coverage

- `1002` - `CopyTiles`
- `1032` - `ClearUnorderedAccessViewUint`
- `1033` - `ClearUnorderedAccessViewUint`
- `1034` - `ClearUnorderedAccessViewFloat`
- `1044` - `AtomicCopyBufferUINT`
- `1045` - `AtomicCopyBufferUINT64`
- `1048` - `ResolveSubresourceRegion`
- `1053` - `EndRenderPass`
- `1056` - `BuildRaytracingAS`
- `1057` - `EmitRaytracingASPostbuildInfo`
- `1058` - `CopyRaytracingAS`
- `1066` - `CmdQueueSetMarker`
- `1067` - `CmdQueueBeginEvent`
- `1068` - `CmdQueueEndEvent`
- `1071` - `GetTimestampFrequency`
- `1072` - `GetClockCalibration`

### Still Partial In Current Builds

- compact `OMSetRenderTargets`
- compact `SOSetTargets`
- compact `IASetIndexBuffer` / `IASetVertexBuffers` variants not seen in tested captures
- compact marker / event payload forms
- some queue / object / heap / resource record metadata fields
- uncommon PIX internal record families
