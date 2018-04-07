import { IAudioChannel } from "./iaudiochannel";
import { AudioRegister, Audio } from "./audio";
import { Sweep } from "./sweep";
import { Length } from "./length";
import { Envelope } from "./envelope";

export class AudioChannel1 implements IAudioChannel {
    private _NR21: number;
    private _NR22: number;
    private _NR23: number;
    private _NR24: number;

    // NR21
    private _wavePatternDuty: 0 | 1 | 2 | 3;
    private _current: number;

    // NR23
    // NR24
    private _frequency: number;
    private _cycles: number;

    private _audio: Audio;
    private _enabled: number;
    private _patterns: number[][];

    private _length: Length;
    private _envelope: Envelope;
    private _dacEnabled: number;

    public constructor(audio: Audio) {
        this._NR21 = 0;
        this._NR22 = 0;
        this._NR23 = 0;
        this._NR24 = 0;

        // NR21
        this._wavePatternDuty = 2;
        this._current = 0;

        // NR23
        // NR24
        this._frequency = 0x2000;
        this._cycles = 0;

        this._audio = audio;
        this._enabled = 0;

        this._length = new Length(64, this);
        this._dacEnabled = 0;
        this._envelope = new Envelope(this);

        this._patterns = [
            [0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 1, 1, 1],
            [0, 1, 1, 1, 1, 1, 1, 0]
        ];
    }

    readRegister(register: AudioRegister, unmasked: boolean = false): number {
        switch (register) {
            case AudioRegister.NR21:
                if (unmasked) {
                    return this._NR21;
                }

                return this._NR21 | 0x3F;

            case AudioRegister.NR22:
                return this._NR22;

            case AudioRegister.NR23:
                if (unmasked) {
                    return this._NR23;
                }

                return this._NR23 | 0xFF;

            case AudioRegister.NR24:
                if (unmasked) {
                    return this._NR24;
                }

                return this._NR24 | 0xBF;
        }

        return 0xFF;
    }

    writeRegister(register: AudioRegister, value: number): void {
        switch (register) {
            case AudioRegister.NR21:
                this._NR21 = value;

                this._wavePatternDuty = ((value >> 6) & 0x03) as (0 | 1 | 2 | 3);
                this._length.length = 64 - (value & 0b00111111);
                break;

            case AudioRegister.NR22:
                this._NR22 = value;

                this._envelope.reset(value);
                this._dacEnabled = (value & 0b11111000) != 0 ? 1 : 0;
                this._enabled &= this._dacEnabled;
                break;

            case AudioRegister.NR23:
                this._NR23 = value;

                this._frequency = (this._frequency & 0b11100000000) | (value & 0xFF);
                break;

            case AudioRegister.NR24:
                this._NR24 = value;

                this._frequency = ((value & 0x07) << 8) | (this._frequency & 0xFF);
                this._length.trigger(value);

                if (this._length.enabled) {
                    if (this._enabled && this._length.length === 0) {
                        this._enabled = 0;
                    }
                }

                if (value & (1 << 7)) {
                    this.enable();
                    this._envelope.trigger(value);
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
        this._envelope.tick();
    }

    tick(cycles: number): void {
        if (!this._enabled) {
            return;
        }

        const frequency = (2048 - this._frequency) * 4;

        this._cycles += cycles;
        while (this._cycles > frequency) {
            this._cycles -= frequency;
            this._current = (this._current + 1) % 8;
            this._audio.setChannelData(0, this._patterns[this._wavePatternDuty][this._current], this._envelope.volume);
        }
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