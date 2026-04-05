/**
 * Microsoft XPRESS (Plain LZ77) Decompression
 * Based on MS-XCA specification and libfwnt documentation.
 *
 * Key format details:
 * - 32-bit indicator bitmask, read MSB-first
 * - Bit 0 = literal byte, Bit 1 = match reference (offset+length)
 * - Match: 16-bit word, low 3 bits = length-3, upper 13 bits = offset-1
 * - Extended length via shared nibble bytes, then byte, then u16
 */

/**
 * Decompress XPRESS Plain LZ77 compressed data.
 * @param {Uint8Array} input - Compressed data
 * @param {number} uncompressedSize - Expected decompressed size
 * @returns {Uint8Array} Decompressed data
 */
function xpressDecompress(input, uncompressedSize) {
    const output = new Uint8Array(uncompressedSize);
    let iPos = 0;
    let oPos = 0;

    // Nibble tracking: nibbles are packed in bytes (low nibble first, then high)
    let nibbleIdx = 0;   // 0 = need to read a new byte, use low nibble; 1 = use high nibble of cached byte
    let nibbleByte = 0;

    function readNibble() {
        if (nibbleIdx === 0) {
            nibbleByte = input[iPos++];
            nibbleIdx = 1;
            return nibbleByte & 0x0F;
        } else {
            nibbleIdx = 0;
            return (nibbleByte >> 4) & 0x0F;
        }
    }

    while (oPos < uncompressedSize && iPos + 4 <= input.length) {
        // Read 32-bit indicator (little-endian)
        const indicator = (
            input[iPos] |
            (input[iPos + 1] << 8) |
            (input[iPos + 2] << 16) |
            ((input[iPos + 3] << 24) >>> 0)
        ) >>> 0;
        iPos += 4;

        // Process 32 bits, MSB first (bit 31 down to bit 0)
        for (let bitIndex = 31; bitIndex >= 0 && oPos < uncompressedSize; bitIndex--) {
            const bit = (indicator >>> bitIndex) & 1;

            if (bit === 0) {
                // Literal byte
                if (iPos >= input.length) return output.subarray(0, oPos);
                output[oPos++] = input[iPos++];
            } else {
                // Match reference
                if (iPos + 2 > input.length) return output.subarray(0, oPos);

                const matchWord = input[iPos] | (input[iPos + 1] << 8);
                iPos += 2;

                const matchOffset = (matchWord >>> 3) + 1;
                let lengthField = matchWord & 0x07;
                let matchLength = lengthField + 3;

                if (lengthField === 7) {
                    // Extended length: read nibble
                    const nibble = readNibble();
                    matchLength += nibble;

                    if (nibble === 15) {
                        // Further extension: read byte
                        if (iPos >= input.length) return output.subarray(0, oPos);
                        const extraByte = input[iPos++];
                        matchLength += extraByte;

                        if (extraByte === 255) {
                            // Even further: read u16 LE as absolute length
                            if (iPos + 2 > input.length) return output.subarray(0, oPos);
                            const fullLen = input[iPos] | (input[iPos + 1] << 8);
                            iPos += 2;

                            if (fullLen === 0) {
                                // Read u32 LE
                                if (iPos + 4 > input.length) return output.subarray(0, oPos);
                                matchLength = (
                                    input[iPos] |
                                    (input[iPos + 1] << 8) |
                                    (input[iPos + 2] << 16) |
                                    ((input[iPos + 3] << 24) >>> 0)
                                ) >>> 0;
                                iPos += 4;
                            } else {
                                matchLength = fullLen;
                            }
                        }
                    }
                }

                // Copy match from output (may overlap for RLE patterns)
                const matchStart = oPos - matchOffset;
                if (matchStart < 0) {
                    // Invalid offset, fill with zeros
                    for (let i = 0; i < matchLength && oPos < uncompressedSize; i++) {
                        output[oPos++] = 0;
                    }
                } else {
                    for (let i = 0; i < matchLength && oPos < uncompressedSize; i++) {
                        output[oPos++] = output[matchStart + i];
                    }
                }
            }
        }
    }

    // Handle remaining data as literals (if indicator couldn't be read)
    while (oPos < uncompressedSize && iPos < input.length) {
        output[oPos++] = input[iPos++];
    }

    return output.subarray(0, oPos);
}
