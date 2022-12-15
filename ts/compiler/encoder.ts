const Encoder = Object.freeze({
    ieee754(n: number){
        const res = new Uint8Array(4);
        const buf = new DataView(res);
        buf.setFloat32(0, n);
        return res;
    },
    encodeString(str: string){
        return [str.length, ...[...str].map(s => s.charCodeAt(0))]
    },
    signedLEB128 (n: number) {
        const buffer = [];
        let more = true;
        const isNegative = n < 0;
        const bitCount = Math.ceil(Math.log2(Math.abs(n))) + 1;
        while (more) {
            let byte = n & 0x7f;
            n >>= 7;
            if (isNegative)
                n |= -(1 << (bitCount - 8));
            if ((n === 0 && (byte & 0x40) === 0) || (n === -1 && (byte & 0x40) !== 0x40))
                more = false;
            else
                byte |= 0x80;
            buffer.push(byte);
        }
        return buffer;
    },
    unsignedLEB128(n: number) {
        const buffer = [];
        do {
            let byte = n & 0x7f;
            n >>>= 7;
            if (n !== 0) byte |= 0x80;
            buffer.push(byte);
        } while (n !== 0);
        return buffer;
    }
})