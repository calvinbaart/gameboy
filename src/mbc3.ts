import { MemoryController, Memory } from "./memory";

export class MBC3 implements MemoryController {
    private _mmu: Memory;
    private _romBankNumber: number;
    private _ramBankNumber: number;
    private _ramEnabled: boolean;

    constructor(mmu: Memory) {
        this._mmu = mmu;
        this._romBankNumber = 1;
        this._ramBankNumber = 1;
        this._ramEnabled = false;
    }

    read(position: number): number {
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
                    return this._mmu.readRam8((position - 0xA000) + (this._ramBankNumber * 0x2000));
                }
                return 0xFF;

            default:
                return this._mmu.readInternal8(position);
        }
    }

    write(position: number, value: number): void {
        switch (position & 0xF000) {
            case 0x0000:
            case 0x1000:
                if (this._ramEnabled && (value & 0x0F) !== 0x0A) {
                    this._mmu.saveRam();
                } else if (!this._ramEnabled && (value & 0x0F) === 0x0A) {
                    this._mmu.loadRam();
                }

                this._ramEnabled = (value & 0x0F) === 0x0A;
                return;

            case 0x2000:
            case 0x3000:
                this._romBankNumber = value;
                return;

            case 0x4000:
            case 0x5000:
                if (value <= 0x03) {
                    this._ramBankNumber = value & 0x03;
                } else {
                    console.log(`CLOCK REGISTER SELECT: ${value.toString(16)}`);
                }
                return;

            case 0x6000:
            case 0x7000:
                console.log(`LATCH CLOCK DATA = ${value.toString(16)}`);
                return;

            case 0xA000:
            case 0xB000:
                if (this._ramEnabled) {
                    this._mmu.writeRam8((position - 0xA000) + (this._ramBankNumber * 0x2000), value);
                }
                return;

            default:
                this._mmu.writeInternal8(position, value);
        }
    }
}