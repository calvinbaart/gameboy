import { IAudioChannel } from "./iaudiochannel";

export class Envelope {
    private _channel: IAudioChannel;
    private _finished: boolean;
    private _initialVolume: number;
    private _sweep: number;
    private _volume: number;
    private _envelopeDirection: number;

    public constructor(channel: IAudioChannel) {
        this._channel = channel;
        this._finished = false;

        this._initialVolume = 0;
        this._sweep = 0;
        this._volume = 0;
        this._envelopeDirection = 0;
    }

    public reset(val: number): void {
        this._finished = false;
        this._initialVolume = val >> 4;
        this._envelopeDirection = (val & (1 << 3)) == 0 ? -1 : 1;
        this._sweep = val & 0b111;
    }

    public tick(): void {
        if (this._finished) {
            return;
        }

        if ((this._volume == 0 && this._envelopeDirection == -1) || (this._volume == 15 && this._envelopeDirection == 1)) {
            this._finished = true;
            return;
        }

        this._volume += this._envelopeDirection;
    }

    public trigger(val: number): void {
        this._volume = val;
    }

    get enabled(): boolean {
        return this._sweep > 0;
    }

    get volume(): number {
        if (this.enabled) {
            return this._volume;
        }

        return 1;
    }
}