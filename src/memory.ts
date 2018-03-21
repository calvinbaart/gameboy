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

    private _bios: Buffer;
    public _rom: Buffer;
    private _biosEnabled: Boolean;

    private _vram: Uint8Array;
    private _hram: Uint8Array;
    private _wram: Uint8Array;
    private _oamram: Uint8Array;
    private _ram: Uint8Array;
    private _type: RomType;

    private _oamDMATransferInProgress: boolean;
    private _oamDMACycles: number;

    constructor(cpu: CPU)
    {
        this._cpu = cpu;
        this._registers = {};
        this._bios = null;
        this._rom = null;
        this._biosEnabled = true;
        this._wram = new Uint8Array(0x2000);
        this._vram = new Uint8Array(0x2000);
        this._hram = new Uint8Array(127);
        this._oamram = new Uint8Array(0x100);
        this._ram = new Uint8Array(0x8000);

        this._oamDMATransferInProgress = false;
        this._oamDMACycles = 0;

        for (let i in this._ram) {
            this._ram[i] = 0xFF;
        }

        for (let i in this._wram) {
            this._wram[i] = 0xFF;
        }

        for (let i in this._vram) {
            this._vram[i] = 0xFF;
        }

        for (let i in this._hram) {
            this._hram[i] = 0xFF;
        }

        for (let i in this._oamram) {
            this._oamram[i] = 0xFF;
        }

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

        this._bios = buffer;
        return true;
    }

    public setRom(buffer: Buffer): boolean
    {
        if (buffer === null) {
            return false;
        }

        this._rom = buffer;
        return true;
    }

    public read8(position: number): number
    {
        if (position >= 0xFF80 && position <= 0xFFFE) {
            return this._hram[position - 0xFF80];
        }

        if (this._oamDMATransferInProgress) {
            return 0xFF;
        }

        if (this._registers[position] !== undefined) {
            return this._registers[position].read();
        }

        if (position >= 0x8000 && position <= 0x9FFF) {
            return this._vram[position - 0x8000];
        }

        if (position >= 0xC000 && position <= 0xDFFF) {
            return this._wram[position - 0xC000];
        }

        if (position >= 0xFE00 && position <= 0xFE9F) {
            return this._oamram[position - 0xFE00];
        }

        return this._controller.read(position);
    }

    public write8(position: number, data: number): void
    {
        if (position >= 0xFF80 && position <= 0xFFFE) {
            this._hram[position - 0xFF80] = data;
            return;
        }

        if (this._oamDMATransferInProgress) {
            return;
        }

        if (this._registers[position] !== undefined) {
            this._registers[position].write(data);
            return;
        }

        if (position >= 0x8000 && position <= 0x9FFF) {
            this._vram[position - 0x8000] = data;
            return;
        }

        if (position >= 0xC000 && position <= 0xDFFF) {
            this._wram[position - 0xC000] = data;
            return;
        }

        if (position >= 0xFE00 && position <= 0xFE9F) {
            this._oamram[position - 0xFE00] = data;
            return;
        }

        this._controller.write(position, data);
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
            this._bios[position] = data;
            return;
        }

        this._rom[position] = data;
    }

    public readRam8(position: number): number
    {
        return this._ram[position];
    }

    public writeRam8(position: number, data: number): void
    {
        this._ram[position] = data;
    }

    public performOAMDMATransfer(position: number): void
    {
        if (this._oamDMATransferInProgress) {
            return;
        }

        console.log(`performing OAM DMA transfer ${position.toString(16)}-${(position + 0x9F).toString(16)} -> FE00-FE9F`);

        this._oamDMATransferInProgress = true;
        this._oamDMACycles = 0;

        for (let i = 0; i <= 0x9F; i++) {
            this._oamram[i] = this._controller.read(position + i);
        }
    }

    public tick(cycles: number): void
    {
        if (!this._oamDMATransferInProgress) {
            return;
        }

        this._oamDMACycles += cycles;

        if (this._oamDMACycles >= 12) {
            this._oamDMATransferInProgress = false;
            console.log("OAM DMA transfer done.");
        }
    }
}
