import { CPU } from './cpu';

interface IRegister {
    read: () => number;
    write: (value: number) => void;
}

export class Memory {
    private _cpu: CPU;
    private _raw: Uint8Array;
    private _registers: { [key: number]: IRegister };
    private _mappings: [number, Uint8Array][];

    constructor(cpu: CPU) {
        this._cpu = cpu;
        this._raw = new Uint8Array(0xFFFF);
        this._registers = {};
        this._mappings = [];

        this.addRegister(0xFF50, () => 0, x => this.unmap(0));
    }

    public addRegister(position: number, read: () => number, write: (value: number) => void): void {
        this._registers[position] = {
            read,
            write
        };
    }

    public mapBuffer(buffer: Buffer, position: number): boolean {
        if (buffer === null) {
            return false;
        }

        this._mappings.push([position, new Uint8Array(buffer)]);

        return true;
    }

    public unmap(index: number): void {
        this._mappings.splice(index, 1);
    }

    public read8(position: number): number {
        if (this._registers[position] !== undefined) {
            return this._registers[position].read();
        }

        for(const mapping of this._mappings) {
            if(position >= mapping[0] && position < mapping[0] + mapping[1].length) {
                return mapping[1][position - mapping[0]];
            }
        }

        return this._raw[position];
    }

    public write8(position: number, data: number): void {
        if (this._registers[position] !== undefined) {
            this._registers[position].write(data);
            return;
        }

        if(position >= 0x6000 && position < 0x7FFF) {
            console.log("MBC1 MODE");
        } else if(position >= 0x2000 && position < 0x3FFF) {
            console.log("MBC1 ROM BANK");
        }

        for(const mapping of this._mappings) {
            if(position >= mapping[0] && position < mapping[0] + mapping[1].length) {
                mapping[1][position - mapping[0]] = data;
                return;
            }
        }
        
        this._raw[position] = data;
    }
}
