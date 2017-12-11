import { CPU } from './cpu';

interface IRegister {
    read: () => number;
    write: (value: number) => void;
}

export class Memory {
    private _cpu: CPU;
    private _raw: Buffer;
    private _registers: { [key: number]: IRegister };

    constructor(cpu: CPU) {
        this._cpu = cpu;
        this._raw = new Buffer(0xFFFF);
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

        buffer.copy(this._raw, position, 0, buffer.length);

        return true;
    }

    public readInt8(position: number): number {
        if (this._registers[position] !== undefined) {
            return this._registers[position].read();
        }

        return this._raw.readInt8(position);
    }

    public readUint8(position: number): number {
        if (this._registers[position] !== undefined) {
            return this._registers[position].read();
        }

        return this._raw.readUInt8(position);
    }

    public readInt16(position: number): number {
        if (this._registers[position] !== undefined) {
            return this._registers[position].read();
        }

        return this._raw.readInt16LE(position);
    }

    public readUint16(position: number): number {
        if (this._registers[position] !== undefined) {
            return this._registers[position].read();
        }

        return this._raw.readUInt16LE(position);
    }

    public writeInt8(position: number, data: number): void {
        if (this._registers[position] !== undefined) {
            this._registers[position].write(data);
            return;
        }

        this._raw.writeInt8(data, position);
    }

    public writeUint8(position: number, data: number): void {
        if (this._registers[position] !== undefined) {
            this._registers[position].write(data);
            return;
        }

        this._raw.writeUInt8(data, position);
    }

    public writeInt16(position: number, data: number): void {
        if (this._registers[position] !== undefined) {
            this._registers[position].write(data);
            return;
        }

        this._raw.writeInt16LE(data, position);
    }

    public writeUint16(position: number, data: number): void {
        if (this._registers[position] !== undefined) {
            this._registers[position].write(data);
            return;
        }

        this._raw.writeUInt16LE(data, position);
    }

    public readBuffer(position: number, length: number): Buffer {
        return this._raw.slice(position, position + length);
    }

    public writeBuffer(position: number, buffer: Buffer) {
        buffer.copy(this._raw, position, 0, buffer.length);
    }
}