import { Memory } from "./memory";
import { Opcodes, OpcodesCB, _opcodes, _cbopcodes } from "./opcodes";
import { Display } from "./display";
import { Audio } from "./audio";
import { Debug } from "./debug";

export enum Flags {
    ZeroFlag = 0b10000000,
    AddSubFlag = 0b01000000,
    HalfCarryFlag = 0b00100000,
    CarryFlag = 0b00010000,
    Unused = 0b00001111
}

export enum InterruptType {
    VBlank
}

export enum Register {
    A = 0,
    B = 2,
    C = 3,
    D = 4,
    E = 5,
    H = 6,
    L = 7,
    F = 1
}

export class CPU {
    private _display: Display;
    private _audio: Audio;
    private _debug: Debug;
    
    private _memory: Memory;
    private _registers: Uint8Array;
    private _pc: number;
    private _sp: number;
    private _cycles: number;
    private _checkZero: boolean;
    private _enableInterrupts: boolean;

    private _specialRegisters: Uint8Array;
    private _debugString: string;

    constructor() {
        new Opcodes();
        new OpcodesCB();

        this._memory = new Memory(this);
        this._display = new Display(this);
        this._audio = new Audio(this);
        this._debug = new Debug(this);

        this._specialRegisters = new Uint8Array(8);
        this._registers = new Uint8Array(8);
        this._pc = 0;
        this._sp = 0;
        this._cycles = 0;

        this._checkZero = true;
        this._enableInterrupts = true;
        this._debugString = "";

        this._memory.addRegister(0xFF00, this._registerRead.bind(this, "FF00", "P1"), this._registerWrite.bind(this, "FF00", "P1"));
        this._memory.addRegister(0xFF01, this._registerRead.bind(this, "FF01", "SB"), this._registerWrite.bind(this, "FF01", "SB"));
        this._memory.addRegister(0xFF02, this._registerRead.bind(this, "FF02", "SC"), this._registerWrite.bind(this, "FF02", "SC"));
        this._memory.addRegister(0xFF04, this._registerRead.bind(this, "FF04", "DIV"), this._registerWrite.bind(this, "FF04", "DIV"));
        this._memory.addRegister(0xFF05, this._registerRead.bind(this, "FF05", "TIMA"), this._registerWrite.bind(this, "FF05", "TIMA"));
        this._memory.addRegister(0xFF06, this._registerRead.bind(this, "FF06", "TMA"), this._registerWrite.bind(this, "FF06", "TMA"));
        this._memory.addRegister(0xFF07, this._registerRead.bind(this, "FF07", "TAC"), this._registerWrite.bind(this, "FF07", "TAC"));
        this._memory.addRegister(0xFF0F, this._registerRead.bind(this, "FF0F", "IF"), this._registerWrite.bind(this, "FF0F", "IF"));
    }

    private _registerRead(addr: string, register: string): number {
        // console.log(`read register: 0x${addr}, ${register}`);
        return 0;
    }

    private _registerWrite(addr: string, register: string, val: number): void {
        if (register === "SB") {
            this._specialRegisters[0] = val;
        } else if (register === "SC") {
            this._specialRegisters[1] = val;

            if (val === 0x81) {
                if (this._specialRegisters[0] === 10) {
                    if (this._debugString.trim().length > 0) {
                        console.log(this._debugString);
                    }
                    
                    this._debugString = "";
                } else {
                    this._debugString += String.fromCharCode(this._specialRegisters[0]);
                }
            }
        }

        // console.log(`write register: 0x${addr}, ${register}, ${val.toString(16)}`);
    }

    public loadBios(): boolean {
        if (process.env.APP_ENV === "browser") {
            return this._memory.mapBuffer(require("../file-loader.js!../dist/bios/bios.bin"), 0x0000);
        }

        let fs = "fs";
        return this._memory.mapBuffer(require(fs).readFileSync("bios/bios.bin"), 0x0000);
    }

    public loadRom(): boolean {
        if (process.env.APP_ENV === "browser") {
            return this._memory.mapBuffer(require("../file-loader.js!../dist/roms/03-op sp,hl.gb"), 0x0000);
        }

        let fs = "fs";
        return this._memory.mapBuffer(require(fs).readFileSync("roms/03-op sp,hl.gb"), 0x0000);
    }

    public step(): boolean {
        const opcode = this.readu8();

        if (opcode === 0xCB) {
            const opcode2 = this.readu8();

            if (_cbopcodes[opcode2] === undefined) {
                this._log(opcode2, true);
                return false;
            }

            this._debug.instruction(opcode, opcode2);

            _cbopcodes[opcode2][1](this);

            this._cycles += _cbopcodes[opcode2][0];
            this._display.tick(_cbopcodes[opcode2][0]);
            this._audio.tick(_cbopcodes[opcode2][0]);
            this.checkInterrupt();
            return true;
        }

        if (_opcodes[opcode] === undefined) {
            this._log(opcode);
            return false;
        }

        this._debug.instruction(opcode);
        _opcodes[opcode][1](this);

        this._cycles += _opcodes[opcode][0];
        this._display.tick(_opcodes[opcode][0]);
        this._audio.tick(_opcodes[opcode][0]);
        this.checkInterrupt();
        return true;
    }

    public readu8(): number {
        const result = this.MMU.read8(this.PC);
        this.PC++;

        return result;
    }

    public reads8(): number {
        let num_unsigned = this.readu8();
        let msb_mask = 1 << (8 - 1);

        return (num_unsigned ^ msb_mask) - msb_mask;
    }

    public readu16(): number {
        const result1 = this.readu8();
        const result2 = this.readu8();

        return ((result2 & 0xFF) << 8) | (result1 & 0xFF);
    }

    public reads16(): number {
        let num_unsigned = this.readu16();
        let msb_mask = 1 << (16 - 1);

        return (num_unsigned ^ msb_mask) - msb_mask;
    }

    public enableFlag(flag: Flags): void {
        this.F |= flag;
    }

    public disableFlag(flag: Flags): void {
        this.F &= ~flag;
    }

    public isFlagSet(flag: Flags): boolean {
        return (this.F & flag) !== 0;
    }

    public clearFlags(): void {
        this.F = 0;
    }

    public pushStack(val: number): void {
        this.MMU.write8(this.SP, val & 0xFF);
        this.SP -= 1;
        this.MMU.write8(this.SP, val >> 8);
        this.SP -= 1;
    }

    public popStack(): number {
        this.SP++;
        const val1 = this.MMU.read8(this.SP);
        this.SP++;
        const val2 = this.MMU.read8(this.SP);

        return (val1 << 8) | val2;
    }

    public checkInterrupt(): void {
        // todo
    }

    public triggerInterrupt(interrupt: InterruptType): void {
        // todo
    }

    private _log(opcode: number, isCB: boolean = false): void {
        if (isCB) {
            console.log(`Unknown cb opcode 0x${opcode.toString(16)}`);
        } else {
            console.log(`Unknown opcode 0x${opcode.toString(16)}`);
        }
    }

    get checkZero() {
        return this._checkZero;
    }

    set checkZero(val: boolean) {
        this._checkZero = val;
    }

    get enableInterrupts() {
        return this._enableInterrupts;
    }

    set enableInterrupts(val: boolean) {
        this._enableInterrupts = val;
    }

    get A() {
        return this._registers[Register.A];
    }

    get B() {
        return this._registers[Register.B];
    }

    get C() {
        return this._registers[Register.C];
    }

    get D() {
        return this._registers[Register.D];
    }

    get E() {
        return this._registers[Register.E];
    }

    get H() {
        return this._registers[Register.H];
    }

    get L() {
        return this._registers[Register.L];
    }

    get F() {
        return this._registers[Register.F];
    }

    get SP() {
        return this._sp;
    }

    get PC() {
        return this._pc;
    }

    get AF() {
        return (this.A << 8) | this.F;
    }

    get BC() {
        return (this.B << 8) | this.C;
    }

    get DE() {
        return (this.D << 8) | this.E;
    }

    get HL() {
        return (this.H << 8) | this.L;
    }

    get MMU() {
        return this._memory;
    }

    get Display() {
        return this._display;
    }

    get debug() {
        return this._debug;
    }

    get cycles() {
        return this._cycles;
    }

    set cycles(val: number) {
        this._cycles = val;
    }

    set A(val: number) {
        this._registers[Register.A] = val;

        if (this.checkZero) {
            if (this._registers[Register.A] === 0) {
                this.enableFlag(Flags.ZeroFlag);
            } else {
                this.disableFlag(Flags.ZeroFlag);
            }
        }
    }

    set F(val: number) {
        this._registers[Register.F] = val;
    }

    set B(val: number) {
        this._registers[Register.B] = val;

        if (this.checkZero) {
            if (this._registers[Register.B] === 0) {
                this.enableFlag(Flags.ZeroFlag);
            } else {
                this.disableFlag(Flags.ZeroFlag);
            }
        }
    }

    set C(val: number) {
        this._registers[Register.C] = val;

        if (this.checkZero) {
            if (this._registers[Register.C] === 0) {
                this.enableFlag(Flags.ZeroFlag);
            } else {
                this.disableFlag(Flags.ZeroFlag);
            }
        }
    }

    set D(val: number) {
        this._registers[Register.D] = val;

        if (this.checkZero) {
            if (this._registers[Register.D] === 0) {
                this.enableFlag(Flags.ZeroFlag);
            } else {
                this.disableFlag(Flags.ZeroFlag);
            }
        }
    }

    set E(val: number) {
        this._registers[Register.E] = val;

        if (this.checkZero) {
            if (this._registers[Register.E] === 0) {
                this.enableFlag(Flags.ZeroFlag);
            } else {
                this.disableFlag(Flags.ZeroFlag);
            }
        }
    }
    
    set H(val: number) {
        this._registers[Register.H] = val;

        if (this.checkZero) {
            if (this._registers[Register.H] === 0) {
                this.enableFlag(Flags.ZeroFlag);
            } else {
                this.disableFlag(Flags.ZeroFlag);
            }
        }
    }

    set L(val: number) {
        this._registers[Register.L] = val;

        if (this.checkZero) {
            if (this._registers[Register.L] === 0) {
                this.enableFlag(Flags.ZeroFlag);
            } else {
                this.disableFlag(Flags.ZeroFlag);
            }
        }
    }

    set AF(val: number) {
        val = val & 0xFFFF;

        this._registers[Register.A] = val >> 8;
        this._registers[Register.F] = val & 0xFF;
    }

    set BC(val: number) {
        val = val & 0xFFFF;

        this._registers[Register.B] = val >> 8;
        this._registers[Register.C] = val & 0xFF;
    }

    set DE(val: number) {
        val = val & 0xFFFF;

        this._registers[Register.D] = val >> 8;
        this._registers[Register.E] = val & 0xFF;
    }

    set HL(val: number) {
        val = val & 0xFFFF;

        this._registers[Register.H] = val >> 8;
        this._registers[Register.L] = val & 0xFF;
    }

    set SP(val: number) {
        this._sp = val & 0xFFFF;
    }

    set PC(val: number) {
        this._pc = val & 0xFFFF;
    }
}