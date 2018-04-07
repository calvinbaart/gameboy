import { CPU } from '../cpu/cpu';
import { RomOnlyMemoryController } from './controllers/romonly';
import { MBC1 } from './controllers/mbc1';
import { MBC3 } from './controllers/mbc3';
import { RomType } from '../cpu/romtype';
import { MBC5 } from './controllers/mbc5';

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
    private _controller: MemoryController | null;

    private _bios: number[] | null;
    private _rom: number[] | null;
    private _biosEnabled: boolean;

    private _vram: number[][];
    private _hram: number[];
    private _wram: number[][];
    private _oamram: number[];
    private _ram: number[];
    private _type: RomType;
    private _wramBank: number;
    private _vramBank: number;

    private _loaded: boolean;

    public static save: (memory: Memory, identifier: string, data: string) => void;
    public static load: (memory: Memory, identifier: string) => string | null;

    constructor(cpu: CPU)
    {
        this._cpu = cpu;
        this._registers = {};
        this._bios = null;
        this._rom = null;
        this._biosEnabled = true;
        this._type = RomType.UNKNOWN;
        this._loaded = false;
        this._wram = [
            Array(0x1000).fill(0xFF),
            Array(0x1000).fill(0xFF),
            Array(0x1000).fill(0xFF),
            Array(0x1000).fill(0xFF),
            Array(0x1000).fill(0xFF),
            Array(0x1000).fill(0xFF),
            Array(0x1000).fill(0xFF),
            Array(0x1000).fill(0xFF)
        ];
        this._vram = [
            Array(0x2000).fill(0xFF),
            Array(0x2000).fill(0xFF)
        ];
        this._hram = Array(127).fill(0xFF);
        this._oamram = Array(0xA0).fill(0xFF);
        this._ram = Array(0x8000).fill(0xFF);
        this._wramBank = 1;
        this._vramBank = 0;
        this._controller = null;

        this.addRegister(0xFF50, () => 0xFF, (x) => {
            this._biosEnabled = false;
            this._cpu._inBootstrap = false;
        });

        this.addRegister(0xFF70, () => {
            if (!this._cpu.gbcMode) {
                return 0xFF;
            }

            return 0x40 | (this._wramBank & 0x07);
        }, (x) => {
            this._wramBank = x & 0x07;

            if (this._wramBank === 0) {
                this._wramBank = 1;
            }
        });

        this.addRegister(0xFF4F, () => {
            if (!this._cpu.gbcMode) {
                return 0xFF;
            }

            return this._vramBank & 0x1;
        }, (x) => {
            this._vramBank = x & 0x01;
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
            
            case RomType.MBC5:
            case RomType.MBC5RAM:
            case RomType.MBC5RAMBATTERY:
            case RomType.MBC5RUMBLE:
            case RomType.MBC5RUMBLERAM:
            case RomType.MBC5RUMBLERAMBATTERY:
                this._controller = new MBC5(this);
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

    public readVideoRam(position: number, bank: number): number {
        if (!this._biosEnabled && !this._cpu.gbcMode) {
            return this._vram[0][position - 0x8000];
        }

        return this._vram[bank][position - 0x8000];
    }

    public readWorkRam(position: number, bank: number): number {
        switch (position & 0xF000) {
            default:
            case 0xC000:
                return this._wram[0][position - 0xC000];
            
            case 0xD000:
                if (this._cpu.gbcMode) {
                    return this._wram[bank][position - 0xD000];
                } else {
                    return this._wram[1][position - 0xD000];
                }
        }
    }

    public writeVideoRam(position: number, bank: number, data: number): void {
        if (!this._biosEnabled && !this._cpu.gbcMode) {
            this._vram[0][position - 0x8000] = data & 0xFF;
            return;
        }

        this._vram[bank][position - 0x8000] = data & 0xFF;
    }

    public writeWorkRam(position: number, bank: number, data: number): void {
        switch (position & 0xF000) {
            default:
            case 0xC000:
                this._wram[0][position - 0xC000] = data & 0xFF;
                break;

            case 0xD000:
                if (this._cpu.gbcMode) {
                    this._wram[bank][position - 0xD000] = data & 0xFF;
                } else {
                    this._wram[1][position - 0xD000] = data & 0xFF;
                }
                break;
        }
    }

    public read8(position: number): number
    {
        if (this._bios !== null && this._biosEnabled) {
            if (position < this._bios.length && (position < 0x100 || position >= 0x200)) {
                return this._bios[position];
            }
        }    
        
        if (this._registers[position] !== undefined) {
            return this._registers[position].read();
        }

        switch (position & 0xF000) {
            case 0x8000:
            case 0x9000:
                return this.readVideoRam(position, this._vramBank);
            
            case 0xC000:
                return this.readWorkRam(position, 1);
            
            case 0xD000:
                return this.readWorkRam(position, this._wramBank);
            
            case 0xF000:
                if (position >= 0xFF80 && position <= 0xFFFE) {
                    return this._hram[position - 0xFF80];
                } else if (position >= 0xFE00 && position <= 0xFE9F) {
                    return this._oamram[position - 0xFE00];
                }
            
            default:
                if (this._controller) {
                    return this._controller.read(position);
                } else {
                    return this.readInternal8(position);
                }
        }
    }

    public write8(position: number, data: number): void
    {
        if (this._bios !== null && this._biosEnabled) {
            if (position < this._bios.length && (position < 0x100 || position >= 0x200)) {
                this._bios[position] = data & 0xFF;
                return;
            }
        }    

        if (this._registers[position] !== undefined) {
            this._registers[position].write(data);
            return;
        }

        switch (position & 0xF000) {
            case 0x8000:
            case 0x9000:
                this.writeVideoRam(position, this._vramBank, data);
                break;

            case 0xC000:
            case 0xD000:
                this.writeWorkRam(position, this._wramBank, data);
                break;

            case 0xF000:
                if (position >= 0xFF80 && position <= 0xFFFE) {
                    this._hram[position - 0xFF80] = data & 0xFF;
                    break;
                } else if (position >= 0xFE00 && position <= 0xFE9F) {
                    this._oamram[position - 0xFE00] = data & 0xFF;
                    this._cpu.Display.oamWrite(position - 0xFE00, data & 0xFF);
                    break;
                }

            default:
                if (this._controller) {
                    this._controller.write(position, data & 0xFF);
                } else {
                    this.writeInternal8(position, data & 0xFF);
                }
        }
    }

    public readInternal8(position: number): number
    {
        if (!this._rom || position >= this._rom.length) {
            return 0xFF;
        }

        return this._rom[position];
    }

    public writeInternal8(position: number, data: number): void
    {
        if (!this._rom) {
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
            this._oamram[i] = this.read8(position + i);
            this._cpu.Display.oamWrite(i, this._oamram[i]);
        }
    }

    public tick(cycles: number): void
    {
    }

    public saveRam(): void
    {
        Memory.save(this, this._cpu.saveIdentifier, JSON.stringify(this._ram));
    }

    public loadRam(): void
    {
        if (this._loaded) {
            return;
        }

        this._loaded = true;
        const data = Memory.load(this, this._cpu.saveIdentifier);

        if (!data) {
            return;
        }

        this._ram = JSON.parse(data);
    }
}
