import { CPU } from './cpu';

interface IRegister {
    read: () => number;
    write: (value: number) => void;
}

interface IMapping {
    active: boolean;
    data: Uint8Array;
    position: number;
}

export class Memory {
    private _cpu: CPU;
    private _raw: Uint8Array;
    private _registers: { [key: number]: IRegister };
    private _mappings: IMapping[];

    constructor(cpu: CPU) {
        this._cpu = cpu;
        this._raw = new Uint8Array(0xFFFF);
        this._registers = {};
        this._mappings = [];

        this.addRegister(0xFF50, () => 0, x => x === 1 ? this.unmap(0) : this.remap(0));
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

        this._mappings.push({
            position,
            data: new Uint8Array(buffer),
            active: true
        });

        return true;
    }

    public remap(index: number): void {
        this._mappings[index].active = true;
    }

    public unmap(index: number): void {
        this._mappings[index].active = false;
    }

    public read8(position: number): number {
        if (this._registers[position] !== undefined) {
            return this._registers[position].read();
        }

        for (const mapping of this._mappings) {
            if (!mapping.active) {
                continue;
            }

            if(position >= mapping.position && position < mapping.position + mapping.data.length) {
                return mapping.data[position - mapping.position];
            }
        }

        return this._raw[position];
    }

    public write8(position: number, data: number): void {
        if (this._registers[position] !== undefined) {
            this._registers[position].write(data);
            return;
        }

        // if(position >= 0x6000 && position < 0x7FFF) {
        //     console.log("MBC1 MODE");
        // } else if(position >= 0x2000 && position < 0x3FFF) {
        //     console.log("MBC1 ROM BANK");
        // }

        for (const mapping of this._mappings) {
            if (!mapping.active) {
                continue;
            }

            if (position >= mapping.position && position < mapping.position + mapping.data.length) {
                mapping.data[position - mapping.position] = data;
                return;
            }
        }
        
        this._raw[position] = data;
    }
}
