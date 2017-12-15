import { CPU } from './cpu';

interface IRegister {
    read: () => number;
    write: (value: number) => void;
}

export class Memory {
    private _cpu: CPU;
    private _raw: Uint8Array;
    private _registers: { [key: number]: IRegister };

    constructor(cpu: CPU) {
        this._cpu = cpu;
        this._raw = new Uint8Array(0xFFFF);
        this._registers = {};
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

        for (let i = 0; i < buffer.length; i++) {
            this._raw[position + i] = buffer.readUInt8(i);
        }

        return true;
    }

    public read8(position: number): number {
        if (this._registers[position] !== undefined) {
            return this._registers[position].read();
        }

        return this._raw[position];
    }

    public write8(position: number, data: number): void {
        if (this._registers[position] !== undefined) {
            this._registers[position].write(data);
            return;
        }

        this._raw[position] = data;
    }
}
