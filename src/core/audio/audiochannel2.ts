import { IAudioChannel } from "./iaudiochannel";
import { AudioRegister, Audio } from "./audio";
import { Length } from "./length";

export class AudioChannel2 implements IAudioChannel {
    private _NR30: number;
    private _NR31: number;
    private _NR32: number;
    private _NR33: number;
    private _NR34: number;
    private _audio: Audio;
    private _enabled: number;
    private _dacEnabled: number;

    private _length: Length;

    public constructor(audio: Audio) {
        this._audio = audio;
        this._NR30 = 0;
        this._NR31 = 0;
        this._NR32 = 0;
        this._NR33 = 0;
        this._NR34 = 0;
        this._enabled = 0;
        this._dacEnabled = 0;

        this._length = new Length(256, this);
    }

    readRegister(register: AudioRegister, unmasked: boolean = false): number {
        switch (register) {
            case AudioRegister.NR30:
                if (unmasked) {
                    return this._NR30;
                }

                return this._NR30 | 0x7F;
            
            case AudioRegister.NR31:
                if (unmasked) {
                    return this._NR31;
                }

                return this._NR31 | 0xFF;

            case AudioRegister.NR32:
                if (unmasked) {
                    return this._NR32;
                }

                return this._NR32 | 0x9F;

            case AudioRegister.NR33:
                if (unmasked) {
                    return this._NR33;
                }

                return this._NR33 | 0xFF;

            case AudioRegister.NR34:
                if (unmasked) {
                    return this._NR34;
                }

                return this._NR34 | 0xBF;
        }

        return 0xFF;
    }

    writeRegister(register: AudioRegister, value: number): void {
        switch (register) {
            case AudioRegister.NR30:
                this._NR30 = value;
                this._dacEnabled = (value & (1 << 7)) != 0 ? 1 : 0;
                this._enabled &= this._dacEnabled;
                break;

            case AudioRegister.NR31:
                this._NR31 = value;
                this._length.length = 256 - value;
                break;

            case AudioRegister.NR32:
                this._NR32 = value;
                break;

            case AudioRegister.NR33:
                this._NR33 = value;
                break;

            case AudioRegister.NR34:
                this._NR34 = value;
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