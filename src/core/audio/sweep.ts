import { IAudioChannel } from "./iaudiochannel";

export class Sweep {
    private _channel: IAudioChannel;
    private _shadowFrequency: number;

    private _timer: number;
    private _shift: number;
    private _period: number;
    private _type: number;

    private _overflow: boolean;
    private _enabled: boolean;
    private _negging: boolean;

    public constructor(channel: IAudioChannel) {
        this._channel = channel;
        this._shadowFrequency = 0;

        this._timer = 0;
        this._shift = 0;
        this._period = 0;
        this._type = 0;

        this._overflow = false;
        this._enabled = false;
        this._negging = false;
    }

    public tick() {
        if (!this._enabled) {
            return;
        }

        this._timer--;

        if (this._timer === 0) {
            this._timer = this._period === 0 ? 8 : this._period;

            if (this._period !== 0) {
                const newFrequency = this.calculate();

                if (!this._overflow && this._shift !== 0) {
                    this._shadowFrequency = newFrequency;
                    this.calculate();
                }
            }
        }
    }

    public control(control: number) {
        this._period = (control >> 4) & 0b111;
        this._shift = control & 0b111;
        this._type = (control & (1 << 3)) ? 1 : 0;

        if (this._negging && this._type === 0) {
            this._overflow = true;
        }
    }

    public trigger(frequency1: number, frequency2: number) {
        this._negging = false;
        this._overflow = false;

        this._shadowFrequency = frequency1 | ((frequency2 & 0b111) << 8);
        this._timer = this._period === 0 ? 8 : this._period;
        this._enabled = this._period !== 0 || this._shift !== 0;

        if (this._shift > 0) {
            this.calculate();
        }
    }

    private calculate(): number {
        let freq = this._shadowFrequency >> this._shift;

        if (this._type === 1) {
            freq = this._shadowFrequency - freq;
            this._negging = true;
        } else {
            freq = this._shadowFrequency + freq;
        }

        if (freq > 2047) {
            this._overflow = true;
        }

        return freq;
    }

    public isEnabled(): boolean {
        return !this._overflow;
    }

    get frequency(): number {
        return this._shadowFrequency;
    }
}