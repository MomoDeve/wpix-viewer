# WPIX Format

This document summarizes the file structure and record families currently identified in WPIX files.

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

## 7. Object and Name Records

Object typing is associated with:

- object-table records with COM interface GUIDs
- resource-name records from block type `0x12C`

Examples of object labels:

- `obj#8 <ID3D12GraphicsCommandList4>`
- `obj#110 <ID3D12Heap>`

## 8. Resource Record Families

Two record families are currently associated with resource creation data.

### `1700` - committed resource

Current interpretation:

- `meta[1]` = object id
- `meta[2]` = heap-type token
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

## 9. Resource Data Used by the App

The application resource table is populated from WPIX content, including:

- object typing
- resource names
- `1700` / `1767` resource creation records
- compact `CopyTextureRegion` footprint data where applicable

## 10. Missing D3D12 Command Coverage Status

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
