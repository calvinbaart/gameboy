import { IAudioChannel } from "./iaudiochannel";
import { AudioRegister, Audio } from "./audio";
import { Sweep } from "./sweep";
import { Length } from "./length";
import { Envelope } from "./envelope";

export class AudioChannel0 implements IAudioChannel {
    private _NR10: number;
    private _NR11: number;
    private _NR12: number;
    private _NR13: number;
    private _NR14: number;

    // NR11
    private _wavePatternDuty: 0 | 1 | 2 | 3;
    private _current: number;

    // NR13
    // NR14
    private _frequencyDivider: number;

    private _audio: Audio;
    private _enabled: number;
    private _patterns: number[][];

    private _sweep: Sweep;
    private _length: Length;
    private _envelope: Envelope;
    private _dacEnabled: number;
    
    public constructor(audio: Audio) {
        this._NR10 = 0;
        this._NR11 = 0;
        this._NR12 = 0;
        this._NR13 = 0;
        this._NR14 = 0;

        // NR11
        this._wavePatternDuty = 2;
        this._current = 0;
        
        // NR13
        // NR14
        this._frequencyDivider = 0;

        this._audio = audio;
        this._enabled = 0;

        this._sweep = new Sweep(this);
        this._length = new Length(64, this);
        this._envelope = new Envelope(this);
        this._dacEnabled = 0;

        this._patterns = [
            [0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 1, 1, 1],
            [0, 1, 1, 1, 1, 1, 1, 0]
        ];
    }

    readRegister(register: AudioRegister, unmasked: boolean = false): number {
        switch (register) {
            case AudioRegister.NR10:
                if (unmasked) {
                    return this._NR10;
                }

                return this._NR10 | 0x80;
            
            case AudioRegister.NR11:
                if (unmasked) {
                    return this._NR11;
                }

                return this._NR11 | 0x3F;
            
            case AudioRegister.NR12:
                return this._NR12;

            case AudioRegister.NR13:
                if (unmasked) {
                    return this.getNr13();
                }

                return this.getNr13() | 0xFF;

            case AudioRegister.NR14:
                if (unmasked) {
                    return this.getNr14();
                }

                return this.getNr14() | 0xBF;
        }

        return 0xFF;
    }

    writeRegister(register: AudioRegister, value: number): void {
        switch (register) {
            case AudioRegister.NR10:
                this._NR10 = value;
                this._sweep.control(value);

                if (!this._sweep.isEnabled()) {
                    this._enabled = 0;
                }
                break;
            
            case AudioRegister.NR11:
                this._NR11 = value;

                this._wavePatternDuty = ((value >> 6) & 0x03) as (0 | 1 | 2 | 3);
                this._length.length = 64 - (value & 0b00111111);
                break;
            
            case AudioRegister.NR12:
                this._NR12 = value;

                this._envelope.reset(value);
                this._dacEnabled = (value & 0b11111000) != 0 ? 1 : 0;
                this._enabled &= this._dacEnabled;
                break;
            
            case AudioRegister.NR13:
                this._NR13 = value;
                break;
            
            case AudioRegister.NR14:
                this._NR14 = value;
                this._length.trigger(value);

                if (this._length.enabled) {
                    if (this._enabled && this._length.length === 0) {
                        this._enabled = 0;
                    }
                }
                
                if ((value & (1 << 7)) !== 0) {
                    this.enable();
                    this._sweep.trigger(this._NR13, this._NR14);
                    this._envelope.trigger(this._NR14);
                    this.setFrequency();

                    if (!this._sweep.isEnabled()) {
                        this._enabled = 0;
                    }
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

    tickSweep(): void {
        this._sweep.tick();

        if (!this._sweep.isEnabled()) {
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
        
        this._frequencyDivider -= cycles;
        while (this._frequencyDivider < 0) {
            const div = Math.abs(this._frequencyDivider);
            this.setFrequency();

            this._frequencyDivider -= div;
            this._current = (this._current + 1) % 8;
            this._audio.setChannelData(0, this._patterns[this._wavePatternDuty][this._current], this._envelope.volume);
        }
    }

    private setFrequency(): void {
        this._frequencyDivider = (2048 - (this.getNr13() | ((this.getNr14() & 0b111) << 8))) * 4;
    }

    private getNr13(): number {
        this._NR13 = this._sweep.frequency & 0xFF;
        return this._NR13;
    }

    private getNr14(): number {
        this._NR14 = (this._NR14 & 0b11111000) | (((this._sweep.frequency & 0x700) >> 8) & 0b00000111);
        return this._NR14;
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