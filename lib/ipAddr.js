class IpAddr {
    constructor(addr) {
        if (addr instanceof Array || addr instanceof Uint8Array) {
            this.address = Uint8Array.from(addr);
        } else {
            const match = addr.match(/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/);
            this.address = Uint8Array.from([parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), parseInt(match[4])]);
        }
    }

    and(otherIpAddr) {
        return new IpAddr(this.address.map((byte, index) => {
            return byte & otherIpAddr.address[index];
        }));
    }

    or(otherIpAddr) {
        return new IpAddr(this.address.map((byte, index) => {
            return byte | otherIpAddr.address[index];
        }));
    }

    not() {
        return new IpAddr(this.address.map(byte => {
            return ~byte;
        }));
    }

    toString() {
        return this.address.join(".");
    }

    next() {
        const newAddr = new IpAddr(this.address);
        newAddr.address.reverse();
        const uint32 = new Uint32Array(newAddr.address.buffer);
        uint32[0] = uint32[0] + 1;
        newAddr.address.reverse();
        return newAddr;
    }

    compare(otherIpAddr) {
        for (let i = 0; i < this.address.length; i++) {
            if (this.address[i] > otherIpAddr.address[i])
                return 1;
            else if (this.address[i] < otherIpAddr.address[i])
                return -1;
        }
        return 0;
    }
}

module.exports = IpAddr;
