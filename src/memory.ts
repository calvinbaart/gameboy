import { CPU, RomType } from './cpu';
import { RomOnlyMemoryController } from './romonly';
import { MBC1 } from './mbc1';
import { MBC3 } from './mbc3';

interface IRegister
{
    read: () => number;
    write: (value: number) => void;
}

export interface MemoryController
{
    read(position: number): number;
    write(position: number, value: number): void;
}

export class Memory
{
    private _cpu: CPU;
    private _registers: { [key: number]: IRegister };
    private _controller: MemoryController;

    private _bios: number[];
    public _rom: number[];
    private _biosEnabled: Boolean;

    private _vram: number[];
    private _hram: number[];
    private _wram: number[];
    private _oamram: number[];
    private _ram: number[];
    private _type: RomType;

    constructor(cpu: CPU)
    {
        this._cpu = cpu;
        this._registers = {};
        this._bios = null;
        this._rom = null;
        this._biosEnabled = true;
        this._wram = Array(0x2000).fill(0xFF);
        this._vram = Array(0x2000).fill(0xFF);
        this._hram = Array(127).fill(0xFF);
        this._oamram = Array(0x100).fill(0xFF);
        this._ram = Array(0x8000).fill(0xFF);

        this.addRegister(0xFF50, () => 0, (x) => {
            this._biosEnabled = x !== 1;
        });
    }

    public createController(romType: RomType): void
    {
        this._type = romType;

        switch (romType) {
            case RomType.MBC1:
            case RomType.MBC1RAM:
            case RomType.MBC1RAMBATTERY:
                this._controller = new MBC1(this);
                break;
            
            case RomType.MBC3:
            case RomType.MBC3RAM:
            case RomType.MBC3RAMBATTERY:
            case RomType.MBC3TIMERBATTERY:
            case RomType.MBC3TIMERRAMBATTERY:
                this._controller = new MBC3(this);
                break;
            
            case RomType.UNKNOWN:
            case RomType.ROMONLY:
                this._controller = new RomOnlyMemoryController(this);
                break;
            
            default:
                console.log("UNKNOWN ROM TYPE: " + romType.toString(16));
                this._controller = new RomOnlyMemoryController(this);
                break;
        }
    }

    public addRegister(position: number, read: () => number, write: (value: number) => void): void
    {
        this._registers[position] = {
            read,
            write
        };
    }

    public setBios(buffer: Buffer): boolean
    {
        if (buffer === null) {
            return false;
        }

        this._bios = [...buffer];
        return true;
    }

    public setRom(buffer: Buffer): boolean
    {
        if (buffer === null) {
            return false;
        }

        this._rom = [...buffer];
        return true;
    }

    public read8(position: number): number
    {
        if (this._registers[position] !== undefined) {
            return this._registers[position].read();
        }

        switch (position & 0xF000) {
            case 0x8000:
            case 0x9000:
                return this._vram[position - 0x8000];
            
            case 0xC000:
            case 0xD000:
                return this._wram[position - 0xC000];
            
            case 0xF000:
                if (position >= 0xFF80 && position <= 0xFFFE) {
                    return this._hram[position - 0xFF80];
                } else if (position >= 0xFE00 && position <= 0xFE9F) {
                    return this._oamram[position - 0xFE00];
                }
            
            default:
                return this._controller.read(position);
        }
    }

    public write8(position: number, data: number): void
    {
        if (this._registers[position] !== undefined) {
            this._registers[position].write(data);
            return;
        }

        switch (position & 0xF000) {
            case 0x8000:
            case 0x9000:
                this._vram[position - 0x8000] = data & 0xFF;
                break;

            case 0xC000:
            case 0xD000:
                this._wram[position - 0xC000] = data & 0xFF;
                break;

            case 0xF000:
                if (position >= 0xFF80 && position <= 0xFFFE) {
                    this._hram[position - 0xFF80] = data & 0xFF;
                    break;
                } else if (position >= 0xFE00 && position <= 0xFE9F) {
                    this._oamram[position - 0xFE00] = data & 0xFF;
                    break;
                }

            default:
                this._controller.write(position, data & 0xFF);
        }
    }

    public readInternal8(position: number): number
    {
        if (position <= 0xFF && this._biosEnabled) {
            return this._bios[position];
        }

        return this._rom[position];
    }

    public writeInternal8(position: number, data: number): void
    {
        if (position <= 0xFF && this._biosEnabled) {
            this._bios[position] = data & 0xFF;
            return;
        }

        this._rom[position] = data & 0xFF;
    }

    public readRam8(position: number): number
    {
        return this._ram[position];
    }

    public writeRam8(position: number, data: number): void
    {
        this._ram[position] = data & 0xFF;
    }

    public performOAMDMATransfer(position: number): void
    {
        for (let i = 0; i <= 0x9F; i++) {
            this._oamram[i] = this._controller.read(position + i);
        }
    }

    public tick(cycles: number): void
    {
    }
}
