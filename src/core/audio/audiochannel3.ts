import { IAudioChannel } from "./iaudiochannel";
import { AudioRegister, Audio } from "./audio";
import { Length } from "./length";

export class AudioChannel3 implements IAudioChannel {
    private _NR41: number;
    private _NR42: number;
    private _NR43: number;
    private _NR44: number;
    private _audio: Audio;
    private _enabled: number;
    private _dacEnabled: number;

    private _length: Length;

    public constructor(audio: Audio) {
        this._audio = audio;
        this._NR41 = 0;
        this._NR42 = 0;
        this._NR43 = 0;
        this._NR44 = 0;
        this._enabled = 0;
        this._dacEnabled = 0;

        this._length = new Length(64, this);
    }

    readRegister(register: AudioRegister, unmasked: boolean = false): number {
        switch (register) {
            case AudioRegister.NR41:
                if (unmasked) {
                    return this._NR41;
                }

                return this._NR41 | 0xFF;

            case AudioRegister.NR42:
                return this._NR42;

            case AudioRegister.NR43:
                return this._NR43;

            case AudioRegister.NR44:
                if (unmasked) {
                    return this._NR44;
                }

                return this._NR44 | 0xBF;
        }

        return 0xFF;
    }

    writeRegister(register: AudioRegister, value: number): void {
        switch (register) {
            case AudioRegister.NR41:
                this._NR41 = value;
                this._length.length = 64 - (value & 0b00111111);
                break;

            case AudioRegister.NR42:
                this._NR42 = value;

                this._dacEnabled = (value & 0b11111000) != 0 ? 1 : 0;
                this._enabled &= this._dacEnabled;
                break;

            case AudioRegister.NR43:
                this._NR43 = value;
                break;

            case AudioRegister.NR44:
                this._NR44 = value;
                this._length.trigger(value);

                if (this._length.enabled) {
                    if (this._enabled && this._length.length === 0) {
                        this._enabled = 0;
                    }
                }

                if (value & (1 << 7)) {
                    this.enable();
                }
                break;
        }
    }

    tickLength(): void {
        this._length.tick();

        if (!this._length.enabled) {
            return;
        }

        if (this._enabled && this._length.length === 0) {
            this._enabled = 0;
        }
    }

    tickEnvelope(): void {
        // todo
    }

    tick(cycles: number): void {
        // todo
    }

    public isEnabled(): boolean {
        return this._enabled !== 0 && this._dacEnabled !== 0;
    }

    public enable(): void {
        this._enabled = 1;
    }

    public disable(): void {
        this._enabled = 0;
    }

    public getAudio(): Audio {
        return this._audio;
    }
}