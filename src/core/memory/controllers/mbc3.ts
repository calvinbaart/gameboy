import { MemoryController, Memory } from "../memory";

enum TimeKey {
    Second = 0x08,
    Minute = 0x09,
    Hour = 0x0A,
    DayLower = 0x0B,
    DayUpper = 0x0C
}

export class MBC3 implements MemoryController {
    private _mmu: Memory;
    private _romBankNumber: number;
    private _ramBankNumber: number;
    private _ramEnabled: boolean;
    private _clockRegister: number;
    private _latchedTime: { [key: number]: number };

    private _latchClockData: number;

    constructor(mmu: Memory) {
        this._mmu = mmu;
        this._romBankNumber = 1;
        this._ramBankNumber = 1;
        this._ramEnabled = false;
        this._clockRegister = 0;

        this._latchedTime = [];
        this.latchClock();

        this._latchClockData = -1;
    }

    private latchClock(): void {
        const time = new Date();

        this._latchedTime[TimeKey.Second] = (time.getSeconds() + 40) % 0x3C;
        this._latchedTime[TimeKey.Minute] = (time.getMinutes() + 40) % 0x3C;
        this._latchedTime[TimeKey.Hour] = (time.getHours() + 12) % 0x18;
        this._latchedTime[TimeKey.DayLower] = 0;
        this._latchedTime[TimeKey.DayUpper] &= ~0x1;
        this._latchedTime[TimeKey.DayUpper] &= ~(1 << 7);
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
                if (this._ramEnabled && this._clockRegister === 0) {
                    return this._mmu.readRam8((position - 0xA000) + (this._ramBankNumber * 0x2000));
                } else if (this._clockRegister !== 0) {
                    return this._latchedTime[this._clockRegister];
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
                    this._clockRegister = 0;
                } else {
                    this._clockRegister = value;
                }
                return;

            case 0x6000:
            case 0x7000:
                if (value === 1 && this._latchClockData === 0) {
                    this.latchClock();
                }

                this._latchClockData = value;
                return;

            case 0xA000:
            case 0xB000:
                if (this._ramEnabled && this._clockRegister === 0) {
                    this._mmu.writeRam8((position - 0xA000) + (this._ramBankNumber * 0x2000), value);
                } else if (this._clockRegister !== 0) {
                    this._latchedTime[this._clockRegister] = value;
                }
                return;

            default:
                this._mmu.writeInternal8(position, value);
        }
    }
}