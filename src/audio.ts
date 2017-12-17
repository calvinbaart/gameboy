import { CPU } from "./cpu";

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
    private _cpu: CPU;
    private _registers: Uint8Array;

    constructor(cpu: CPU) {
        this._cpu = cpu;
        this._registers = new Uint8Array(37);

        this._cpu.MMU.addRegister(0xFF10, this._readRegister.bind(this, AudioRegister.NR10), this._writeRegister.bind(this, AudioRegister.NR10));
        this._cpu.MMU.addRegister(0xFF11, this._readRegister.bind(this, AudioRegister.NR11), this._writeRegister.bind(this, AudioRegister.NR11));
        this._cpu.MMU.addRegister(0xFF12, this._readRegister.bind(this, AudioRegister.NR12), this._writeRegister.bind(this, AudioRegister.NR12));
        this._cpu.MMU.addRegister(0xFF13, this._readRegister.bind(this, AudioRegister.NR13), this._writeRegister.bind(this, AudioRegister.NR13));
        this._cpu.MMU.addRegister(0xFF14, this._readRegister.bind(this, AudioRegister.NR14), this._writeRegister.bind(this, AudioRegister.NR14));
        this._cpu.MMU.addRegister(0xFF16, this._readRegister.bind(this, AudioRegister.NR21), this._writeRegister.bind(this, AudioRegister.NR21));
        this._cpu.MMU.addRegister(0xFF17, this._readRegister.bind(this, AudioRegister.NR22), this._writeRegister.bind(this, AudioRegister.NR22));
        this._cpu.MMU.addRegister(0xFF18, this._readRegister.bind(this, AudioRegister.NR23), this._writeRegister.bind(this, AudioRegister.NR23));
        this._cpu.MMU.addRegister(0xFF19, this._readRegister.bind(this, AudioRegister.NR24), this._writeRegister.bind(this, AudioRegister.NR24));
        this._cpu.MMU.addRegister(0xFF1A, this._readRegister.bind(this, AudioRegister.NR30), this._writeRegister.bind(this, AudioRegister.NR30));
        this._cpu.MMU.addRegister(0xFF1B, this._readRegister.bind(this, AudioRegister.NR31), this._writeRegister.bind(this, AudioRegister.NR31));
        this._cpu.MMU.addRegister(0xFF1C, this._readRegister.bind(this, AudioRegister.NR32), this._writeRegister.bind(this, AudioRegister.NR32));
        this._cpu.MMU.addRegister(0xFF1D, this._readRegister.bind(this, AudioRegister.NR33), this._writeRegister.bind(this, AudioRegister.NR33));
        this._cpu.MMU.addRegister(0xFF1E, this._readRegister.bind(this, AudioRegister.NR34), this._writeRegister.bind(this, AudioRegister.NR34));
        this._cpu.MMU.addRegister(0xFF20, this._readRegister.bind(this, AudioRegister.NR41), this._writeRegister.bind(this, AudioRegister.NR41));
        this._cpu.MMU.addRegister(0xFF21, this._readRegister.bind(this, AudioRegister.NR42), this._writeRegister.bind(this, AudioRegister.NR42));
        this._cpu.MMU.addRegister(0xFF22, this._readRegister.bind(this, AudioRegister.NR43), this._writeRegister.bind(this, AudioRegister.NR43));
        this._cpu.MMU.addRegister(0xFF23, this._readRegister.bind(this, AudioRegister.NR44), this._writeRegister.bind(this, AudioRegister.NR44));
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
        // todo
    }

    private _readRegister(register: AudioRegister): number {
        // console.log(`read ${register}`);
        return this._registers[register];
    }

    private _writeRegister(register: AudioRegister, value: number): void {
        // console.log(`write ${register}: ${value.toString(16)}`);
        this._registers[register] = value;
    }
}
