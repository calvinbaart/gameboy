import { MemoryController, Memory } from "./memory";

export class MBC1 implements MemoryController
{
    private _mmu: Memory;
    private _romBankNumber: number;
    private _ramBankNumber: number;
    private _ramBanking: boolean;
    private _ramEnabled: boolean;

    constructor(mmu: Memory)
    {
        this._mmu = mmu;
        this._romBankNumber = 1;
        this._ramBankNumber = 1;
        this._ramBanking = false;
        this._ramEnabled = false;
    }

    read(position: number): number
    {
        switch (position & 0xF000) {
            case 0x4000:
            case 0x5000:
            case 0x6000:
            case 0x7000:
                position += (this._romBankNumber - 1) * 0x4000;

                return this._mmu.readInternal8(position);
            
            case 0xA000:
            case 0xB000:
                if (this._ramEnabled) {
                    if (!this._ramBanking) {
                        return this._mmu.readRam8(position - 0xA000);
                    } else {
                        return this._mmu.readRam8((position - 0xA000) + (this._ramBankNumber * 0x2000));
                    }
                }
                return 0xFF;
            
            default:
                return this._mmu.readInternal8(position);
        }
    }

    write(position: number, value: number): void
    {
        switch (position & 0xF000) {
            case 0x0000:
            case 0x1000:
                this._ramEnabled = (value & 0x0F) === 0x0A;
                return;
            
            case 0x2000:
            case 0x3000:
                if (!this._ramBanking) {
                    this._romBankNumber = (this._romBankNumber & 0xE0) | (value & 0x1F);
                } else {
                    this._romBankNumber = value & 0x1F;
                }

                if (this._romBankNumber === 0x00 || this._romBankNumber === 0x20 || this._romBankNumber === 0x40 || this._romBankNumber === 0x60) {
                    this._romBankNumber++;
                }
                return;
            
            case 0x4000:
            case 0x5000:
                if (this._ramBanking) {
                    this._ramBankNumber = value & 0x03;
                } else {
                    this._romBankNumber = (this._romBankNumber & 0xCF) | (value << 4);

                    if (this._romBankNumber === 0x00 || this._romBankNumber === 0x20 || this._romBankNumber === 0x40 || this._romBankNumber === 0x60) {
                        this._romBankNumber++;
                    }
                }
                return;
            
            case 0x6000:
            case 0x7000:
                this._ramBanking = value === 0x01;
                return;
            
            case 0xA000:
            case 0xB000:
                if (this._ramEnabled) {
                    if (!this._ramBanking) {
                        this._mmu.writeRam8(position - 0xA000, value);
                    } else {
                        this._mmu.writeRam8((position - 0xA000) + (this._ramBankNumber * 0x2000), value);
                    }
                }
                return;
            
            default:
                this._mmu.writeInternal8(position, value);
        }
    }
}