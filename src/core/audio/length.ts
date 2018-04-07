import { IAudioChannel } from "./iaudiochannel";

export class Length {
    private _fullLength: number;
    private _length: number;
    private _enabled: boolean;
    private _channel: IAudioChannel;

    public constructor(length: number, channel: IAudioChannel) {
        this._fullLength = length;
        this._length = 0;
        this._enabled = false;
        this._channel = channel;
    }

    public tick(): void {
        if (!this._enabled) {
            return;
        }

        if (this._length > 0) {
            this._length--;
        }
    }

    public trigger(val: number): void {
        const enable = (val & (1 << 6)) !== 0;
        const trigger = (val & (1 << 7)) !== 0;

        if (this._enabled) {
            if (this._length === 0 && trigger) {
                if (enable && this._channel.getAudio().frameSequencerPosition % 2 === 0) {
                    this._length = this._fullLength - 1;
                } else {
                    this._length = this._fullLength;
                }
            }
        } else if (enable) {
            if (this._length > 0 && this._channel.getAudio().frameSequencerPosition % 2 === 0) {
                this._length--;
            }
            if (this._length == 0 && trigger && this._channel.getAudio().frameSequencerPosition % 2 === 0) {
                this._length = this._fullLength - 1;
            }
        } else {
            if (this._length === 0 && trigger) {
                this._length = this._fullLength;
            }
        }

        this._enabled = enable;
    }

    get enabled(): boolean {
        return this._enabled;
    }

    get length(): number {
        return this._length;
    }

    set length(val: number) {
        if (val === 0) {
            this._length = this._fullLength;
        } else {
            this._length = val;
        }
    }
}