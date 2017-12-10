import * as fs from 'fs';
import { CPU } from './cpu';

interface MemoryMap {
    start: number;
    end: number;
    read: (position: number, length: number) => Buffer;
    write: (position: number, buffer: Buffer) => void;
}

export class Memory {
    private _cpu: CPU;
    private _raw: Buffer;
    private _map: Array<MemoryMap>;

    constructor(cpu: CPU) {
        this._cpu = cpu;
        this._raw = new Buffer(65536);
        this._map = [];
    }

    public mapMemory(start: number, end: number, read: (position: number, length: number) => Buffer, write: (position: number, buffer: Buffer) => void): void {
        this._map.push({
            start,
            end,
            read,
            write
        });
    }

    public mapFile(path: string, position: number): boolean {
        const buffer = fs.readFileSync(path);
        
        if (buffer === null) {
            return false;
        }

        buffer.copy(this._raw, position, 0, buffer.length);

        return true;
    }

    public readInt8(position: number, skip: boolean = false): number {
        if (!skip) {
            for (let map of this._map) {
                if (position >= map.start && position < map.end) {
                    const val = map.read(position - map.start, 1);
                    if (val !== null) {
                        return val.readInt8(0);
                    }

                    break;
                }
            }
        }

        return this._raw.readInt8(position);
    }

    public readUint8(position: number, skip: boolean = false): number {
        if (!skip) {
            for (let map of this._map) {
                if (position >= map.start && position < map.end) {
                    const val = map.read(position - map.start, 1);
                    if (val !== null) {
                        return val.readUInt8(0);
                    }

                    break;
                }
            }
        }

        return this._raw.readUInt8(position);
    }

    public readInt16(position: number, skip: boolean = false): number {
        if (!skip) {
            for (let map of this._map) {
                if (position >= map.start && position < map.end) {
                    const val = map.read(position - map.start, 1);
                    if (val !== null) {
                        return val.readInt16LE(0);
                    }

                    break;
                }
            }
        }

        return this._raw.readInt16LE(position);
    }

    public readUint16(position: number, skip: boolean = false): number {
        if (!skip) {
            for (let map of this._map) {
                if (position >= map.start && position < map.end) {
                    const val = map.read(position - map.start, 1);
                    if (val !== null) {
                        return val.readUInt16LE(0);
                    }

                    break;
                }
            }
        }

        return this._raw.readUInt16LE(position);
    }

    public writeInt8(position: number, data: number, skip: boolean = false): void {
        if (!skip) {
            for (let map of this._map) {
                if (position >= map.start && position < map.end) {
                    const buffer = new Buffer(1);
                    buffer.writeInt8(data, 0);

                    map.write(position - map.start, buffer);
                    return;
                }
            }
        }

        this._raw.writeInt8(data, position);
    }

    public writeUint8(position: number, data: number, skip: boolean = false): void {
        if (!skip) {
            for (let map of this._map) {
                if (position >= map.start && position < map.end) {
                    const buffer = new Buffer(1);
                    buffer.writeUInt8(data, 0);

                    map.write(position - map.start, buffer);
                    return;
                }
            }
        }

        this._raw.writeUInt8(data, position);
    }

    public writeInt16(position: number, data: number, skip: boolean = false): void {
        if (!skip) {
            for (let map of this._map) {
                if (position >= map.start && position < map.end) {
                    const buffer = new Buffer(2);
                    buffer.writeInt16LE(data, 0);

                    map.write(position - map.start, buffer);
                    return;
                }
            }
        }

        this._raw.writeInt16LE(data, position);
    }

    public writeUint16(position: number, data: number, skip: boolean = false): void {
        if (!skip) {
            for (let map of this._map) {
                if (position >= map.start && position < map.end) {
                    const buffer = new Buffer(2);
                    buffer.writeUInt16LE(data, 0);

                    map.write(position - map.start, buffer);
                    return;
                }
            }
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