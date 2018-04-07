import { CPU } from "../cpu/cpu";
import { IAudioChannel } from "./iaudiochannel";
import { AudioChannel0 } from "./audiochannel0";
import { AudioChannel1 } from "./audiochannel1";
import { AudioChannel2 } from "./audiochannel2";
import { AudioChannel3 } from "./audiochannel3";

export enum AudioRegister {
    NR10,
    NR11,
    NR12,
    NR13,
    NR14,
    NR21,
    NR22,
    NR23,
    NR24,
    NR30,
    NR31,
    NR32,
    NR33,
    NR34,
    NR41,
    NR42,
    NR43,
    NR44,
    NR50,
    NR51,
    NR52,

    W0,
    W1,
    W2,
    W3,
    W4,
    W5,
    W6,
    W7,
    W8,
    W9,
    WA,
    WB,
    WC,
    WD,
    WE,
    WF
}

export class Audio
{
    public static onBufferReady: (buffer: number[]) => void;

    private _cpu: CPU;
    private _registers: Uint8Array;
    private _cycles: number;

    private _channel0: AudioChannel0 | null;
    private _channel1: AudioChannel1 | null;
    private _channel2: AudioChannel2 | null;
    private _channel3: AudioChannel3 | null;

    private _buffer: number[];
    private _sampleRate: number;
    private _channelData: number[];

    private _frameSequencerPeriod: number;
    private _frameSequencerTimer: number;
    private _frameSequencerPosition: number;

    constructor(cpu: CPU) {
        this._cpu = cpu;
        this._registers = new Uint8Array(0x30);
        this._channel0 = new AudioChannel0(this);
        this._channel1 = new AudioChannel1(this);
        this._channel2 = new AudioChannel2(this);
        this._channel3 = new AudioChannel3(this);
        this._channelData = [0, 0, 0, 0];
        this._buffer = [];
        this._sampleRate = 44100;
        this._cycles = 0;

        this._frameSequencerPeriod = 8192;
        this._frameSequencerTimer = 0;
        this._frameSequencerPosition = 7;

        this._cpu.MMU.addRegister(0xFF10, this._readRegister0.bind(this, AudioRegister.NR10), this._writeRegister0.bind(this, AudioRegister.NR10));
        this._cpu.MMU.addRegister(0xFF11, this._readRegister0.bind(this, AudioRegister.NR11), this._writeRegister0.bind(this, AudioRegister.NR11));
        this._cpu.MMU.addRegister(0xFF12, this._readRegister0.bind(this, AudioRegister.NR12), this._writeRegister0.bind(this, AudioRegister.NR12));
        this._cpu.MMU.addRegister(0xFF13, this._readRegister0.bind(this, AudioRegister.NR13), this._writeRegister0.bind(this, AudioRegister.NR13));
        this._cpu.MMU.addRegister(0xFF14, this._readRegister0.bind(this, AudioRegister.NR14), this._writeRegister0.bind(this, AudioRegister.NR14));
        this._cpu.MMU.addRegister(0xFF16, this._readRegister1.bind(this, AudioRegister.NR21), this._writeRegister1.bind(this, AudioRegister.NR21));
        this._cpu.MMU.addRegister(0xFF17, this._readRegister1.bind(this, AudioRegister.NR22), this._writeRegister1.bind(this, AudioRegister.NR22));
        this._cpu.MMU.addRegister(0xFF18, this._readRegister1.bind(this, AudioRegister.NR23), this._writeRegister1.bind(this, AudioRegister.NR23));
        this._cpu.MMU.addRegister(0xFF19, this._readRegister1.bind(this, AudioRegister.NR24), this._writeRegister1.bind(this, AudioRegister.NR24));
        this._cpu.MMU.addRegister(0xFF1A, this._readRegister2.bind(this, AudioRegister.NR30), this._writeRegister2.bind(this, AudioRegister.NR30));
        this._cpu.MMU.addRegister(0xFF1B, this._readRegister2.bind(this, AudioRegister.NR31), this._writeRegister2.bind(this, AudioRegister.NR31));
        this._cpu.MMU.addRegister(0xFF1C, this._readRegister2.bind(this, AudioRegister.NR32), this._writeRegister2.bind(this, AudioRegister.NR32));
        this._cpu.MMU.addRegister(0xFF1D, this._readRegister2.bind(this, AudioRegister.NR33), this._writeRegister2.bind(this, AudioRegister.NR33));
        this._cpu.MMU.addRegister(0xFF1E, this._readRegister2.bind(this, AudioRegister.NR34), this._writeRegister2.bind(this, AudioRegister.NR34));
        this._cpu.MMU.addRegister(0xFF20, this._readRegister3.bind(this, AudioRegister.NR41), this._writeRegister3.bind(this, AudioRegister.NR41));
        this._cpu.MMU.addRegister(0xFF21, this._readRegister3.bind(this, AudioRegister.NR42), this._writeRegister3.bind(this, AudioRegister.NR42));
        this._cpu.MMU.addRegister(0xFF22, this._readRegister3.bind(this, AudioRegister.NR43), this._writeRegister3.bind(this, AudioRegister.NR43));
        this._cpu.MMU.addRegister(0xFF23, this._readRegister3.bind(this, AudioRegister.NR44), this._writeRegister3.bind(this, AudioRegister.NR44));
        this._cpu.MMU.addRegister(0xFF24, this._readRegister.bind(this, AudioRegister.NR50), this._writeRegister.bind(this, AudioRegister.NR50));
        this._cpu.MMU.addRegister(0xFF25, this._readRegister.bind(this, AudioRegister.NR51), this._writeRegister.bind(this, AudioRegister.NR51));
        this._cpu.MMU.addRegister(0xFF26, this._readRegister.bind(this, AudioRegister.NR52), this._writeRegister.bind(this, AudioRegister.NR52));

        this._cpu.MMU.addRegister(0xFF30, this._readRegister.bind(this, AudioRegister.W0), this._writeRegister.bind(this, AudioRegister.W0));
        this._cpu.MMU.addRegister(0xFF31, this._readRegister.bind(this, AudioRegister.W1), this._writeRegister.bind(this, AudioRegister.W1));
        this._cpu.MMU.addRegister(0xFF32, this._readRegister.bind(this, AudioRegister.W2), this._writeRegister.bind(this, AudioRegister.W2));
        this._cpu.MMU.addRegister(0xFF33, this._readRegister.bind(this, AudioRegister.W3), this._writeRegister.bind(this, AudioRegister.W3));
        this._cpu.MMU.addRegister(0xFF34, this._readRegister.bind(this, AudioRegister.W4), this._writeRegister.bind(this, AudioRegister.W4));
        this._cpu.MMU.addRegister(0xFF35, this._readRegister.bind(this, AudioRegister.W5), this._writeRegister.bind(this, AudioRegister.W5));
        this._cpu.MMU.addRegister(0xFF36, this._readRegister.bind(this, AudioRegister.W6), this._writeRegister.bind(this, AudioRegister.W6));
        this._cpu.MMU.addRegister(0xFF37, this._readRegister.bind(this, AudioRegister.W7), this._writeRegister.bind(this, AudioRegister.W7));
        this._cpu.MMU.addRegister(0xFF38, this._readRegister.bind(this, AudioRegister.W8), this._writeRegister.bind(this, AudioRegister.W8));
        this._cpu.MMU.addRegister(0xFF39, this._readRegister.bind(this, AudioRegister.W9), this._writeRegister.bind(this, AudioRegister.W9));
        this._cpu.MMU.addRegister(0xFF3A, this._readRegister.bind(this, AudioRegister.WA), this._writeRegister.bind(this, AudioRegister.WA));
        this._cpu.MMU.addRegister(0xFF3B, this._readRegister.bind(this, AudioRegister.WB), this._writeRegister.bind(this, AudioRegister.WB));
        this._cpu.MMU.addRegister(0xFF3C, this._readRegister.bind(this, AudioRegister.WC), this._writeRegister.bind(this, AudioRegister.WC));
        this._cpu.MMU.addRegister(0xFF3D, this._readRegister.bind(this, AudioRegister.WD), this._writeRegister.bind(this, AudioRegister.WD));
        this._cpu.MMU.addRegister(0xFF3E, this._readRegister.bind(this, AudioRegister.WE), this._writeRegister.bind(this, AudioRegister.WE));
        this._cpu.MMU.addRegister(0xFF3F, this._readRegister.bind(this, AudioRegister.WF), this._writeRegister.bind(this, AudioRegister.WF));
    }

    public tick(delta: number) {
        this._cycles += delta;

        this._frameSequencerTimer += delta;
        while (this._frameSequencerTimer >= this._frameSequencerPeriod) {
            this._frameSequencerTimer -= this._frameSequencerPeriod;

            this._frameSequencerPosition = (this._frameSequencerPosition + 1) % 8;

            if (this._frameSequencerPosition === 0 || this._frameSequencerPosition === 2 || this._frameSequencerPosition === 4 || this._frameSequencerPosition === 6) {
                if (this._channel0 !== null) {
                    this._channel0.tickLength();
                }

                if (this._channel1 !== null) {
                    this._channel1.tickLength();
                }

                if (this._channel2 !== null) {
                    this._channel2.tickLength();
                }

                if (this._channel3 !== null) {
                    this._channel3.tickLength();
                }
            }

            if (this._frameSequencerPosition === 2 || this._frameSequencerPosition === 6) {
                if (this._channel0 !== null) {
                    this._channel0.tickSweep();
                }
            }

            if (this._frameSequencerPosition === 7) {
                if (this._channel0 !== null) {
                    this._channel0.tickEnvelope();
                }

                if (this._channel1 !== null) {
                    this._channel1.tickEnvelope();
                }

                if (this._channel3 !== null) {
                    this._channel3.tickEnvelope();
                }
            }
        }

        if (this._channel0 !== null) {
            this._channel0.tick(delta);
        }

        if (this._channel1 !== null) {
            this._channel1.tick(delta);
        }

        if (this._channel2 !== null) {
            this._channel2.tick(delta);
        }

        if (this._channel3 !== null) {
            this._channel3.tick(delta);
        }

        if (this._sampleRate === 0) {
            return;
        }

        const ticksPerSample = Math.floor(4194304 / this._sampleRate);
        if (this._cycles >= 93) {
            this._cycles -= 93;

            const sample0 = this._channel0 !== null && this._channel0.isEnabled() ? this._channelData[0] : 0;
            const sample1 = this._channel1 !== null && this._channel1.isEnabled() ? this._channelData[1] : 0;
            const sample2 = this._channel2 !== null && this._channel2.isEnabled() ? this._channelData[2] : 0;
            const sample3 = this._channel3 !== null && this._channel3.isEnabled() ? this._channelData[3] : 0;

            let sample = sample0 + sample1 + sample2 + sample3;
            sample /= 4;

            this._buffer.push(sample);

            if (this._buffer.length > 750) {
                if (Audio.onBufferReady) {
                    Audio.onBufferReady(this._buffer);
                }

                this._buffer = [];
            }
        }
    }

    public setChannelData(channel: number, data: number, volume: number): void {
        volume /= 0xF;
        data *= volume;

        this._channelData[channel] = data;
    }

    private _readRegister0(register: AudioRegister, unmasked: boolean = false): number {
        const channel = this._channel0;

        if (channel === null) {
            return 0xFF;
        }

        const val = channel.readRegister(register, unmasked);
        return val;
    }

    private _readRegister1(register: AudioRegister, unmasked: boolean = false): number {
        const channel = this._channel1;

        if (channel === null) {
            return 0xFF;
        }

        const val = channel.readRegister(register, unmasked);
        return val;
    }

    private _readRegister2(register: AudioRegister, unmasked: boolean = false): number {
        const channel = this._channel2;

        if (channel === null) {
            return 0xFF;
        }

        const val = channel.readRegister(register, unmasked);
        return val;
    }

    private _readRegister3(register: AudioRegister, unmasked: boolean = false): number {
        const channel = this._channel3;

        if (channel === null) {
            return 0xFF;
        }

        const val = channel.readRegister(register, unmasked);
        return val;
    }

    private _writeRegister0(register: AudioRegister, value: number): void {
        if (register <= AudioRegister.NR51 && (this._registers[AudioRegister.NR52] & (1 << 7)) === 0) {
            // NR10-NR51

            return;
        }
        
        this._registers[register] = value;
        const channel = this._channel0;

        if (channel === null) {
            return;
        }

        channel.writeRegister(register, value);
    }

    private _writeRegister1(register: AudioRegister, value: number): void {
        if (register <= AudioRegister.NR51 && (this._registers[AudioRegister.NR52] & (1 << 7)) === 0) {
            // NR10-NR51

            return;
        }

        this._registers[register] = value;
        const channel = this._channel1;

        if (channel === null) {
            return;
        }

        channel.writeRegister(register, value);
    }

    private _writeRegister2(register: AudioRegister, value: number): void {
        if (register <= AudioRegister.NR51 && (this._registers[AudioRegister.NR52] & (1 << 7)) === 0) {
            // NR10-NR51

            return;
        }

        this._registers[register] = value;
        const channel = this._channel2;

        if (channel === null) {
            return;
        }

        channel.writeRegister(register, value);
    }

    private _writeRegister3(register: AudioRegister, value: number): void {
        if (register !== AudioRegister.NR41 || this._cpu.gbcMode) {
            if (register <= AudioRegister.NR51 && (this._registers[AudioRegister.NR52] & (1 << 7)) === 0) {
                // NR10-NR51

                return;
            }
        }    

        this._registers[register] = value;
        const channel = this._channel3;

        if (channel === null) {
            return;
        }

        channel.writeRegister(register, value);
    }


    private _readRegister(register: AudioRegister): number {
        let val = this._registers[register];

        switch (register) {
            case AudioRegister.NR52:
                val = (val & (1 << 7)) ? (1 << 7) : 0;

                if (this._channel0 !== null && this._channel0.isEnabled()) {
                    val |= (1 << 0);
                }

                if (this._channel1 !== null && this._channel1.isEnabled()) {
                    val |= (1 << 1);
                }

                if (this._channel2 !== null && this._channel2.isEnabled()) {
                    val |= (1 << 2);
                }

                if (this._channel3 !== null && this._channel3.isEnabled()) {
                    val |= (1 << 3);
                }

                val |= 0x70;
                // console.log(`NR52 = ${val.toString(2)}`);
                break;
            
            case AudioRegister.NR50:
            case AudioRegister.NR51:
                if ((this._registers[AudioRegister.NR52] & (1 << 7)) === 0) {
                    val = 0;
                }
                break;

        }

        // console.log(`rreg: ${register}, ${val.toString(2)}`);

        return val;
    }

    private _writeRegister(register: AudioRegister, value: number): void {
        if (register <= AudioRegister.NR51 && (this._registers[AudioRegister.NR52] & (1 << 7)) === 0) {
            // NR10-NR51

            return;
        }

        switch (register) {
            case AudioRegister.NR52:
                if ((value & (1 << 7)) === 0 && (this._registers[AudioRegister.NR52] & (1 << 7)) !== 0) {
                    console.log("disabled");
                    this._writeRegister0(AudioRegister.NR10, 0);
                    this._writeRegister0(AudioRegister.NR11, 0);
                    this._writeRegister0(AudioRegister.NR12, 0);
                    this._writeRegister0(AudioRegister.NR13, 0);
                    this._writeRegister0(AudioRegister.NR14, 0);

                    this._writeRegister1(AudioRegister.NR21, 0);
                    this._writeRegister1(AudioRegister.NR22, 0);
                    this._writeRegister1(AudioRegister.NR23, 0);
                    this._writeRegister1(AudioRegister.NR24, 0);

                    this._writeRegister2(AudioRegister.NR30, 0);
                    this._writeRegister2(AudioRegister.NR31, 0);
                    this._writeRegister2(AudioRegister.NR32, 0);
                    this._writeRegister2(AudioRegister.NR33, 0);
                    this._writeRegister2(AudioRegister.NR34, 0);

                    if (!this._cpu.gbcMode) {
                        this._writeRegister3(AudioRegister.NR41, 0);
                    }
                    
                    this._writeRegister3(AudioRegister.NR42, 0);
                    this._writeRegister3(AudioRegister.NR43, 0);
                    this._writeRegister3(AudioRegister.NR44, 0);

                    this._writeRegister(AudioRegister.NR50, 0);
                    this._writeRegister(AudioRegister.NR51, 0);

                    if (this._channel0 !== null) {
                        this._channel0.disable();
                    }

                    if (this._channel1 !== null) {
                        this._channel1.disable();
                    }

                    if (this._channel2 !== null) {
                        this._channel2.disable();
                    }

                    if (this._channel3 !== null) {
                        this._channel3.disable();
                    }
                } else if ((value & (1 << 7)) !== 0 && (this._registers[AudioRegister.NR52] & (1 << 7)) === 0) {
                    console.log("enabled");
                    this._frameSequencerPosition = 0;
                    this._frameSequencerTimer = 0;
                }
                break;
        }

        this._registers[register] = value;
    }

    get buffer(): number[] {
        return this._buffer;
    }

    get sampleRate(): number {
        return this._sampleRate;
    }

    get frameSequencerPosition(): number {
        return this._frameSequencerPosition;
    }

    get enabled(): boolean {
        return (this._registers[AudioRegister.NR52] & (1 << 7)) !== 0;
    }

    set sampleRate(val: number) {
        this._sampleRate = val;
    }
}
