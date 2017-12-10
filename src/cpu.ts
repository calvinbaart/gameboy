import { Memory } from "./memory";
import { Opcodes, OpcodesCB, _opcodes, _cbopcodes } from "./opcodes";
import { Display } from "./display";

export enum Flags {
    ZeroFlag = 0b10000000,
    AddSubFlag = 0b01000000,
    HalfCarryFlag = 0b00100000,
    CarryFlag = 0b00010000,
    Unused = 0b00001111
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
    private _memory: Memory;
    private _registers: Uint8Array;
    private _pc: number;
    private _sp: number;

    constructor() {
        new Opcodes();
        new OpcodesCB();

        this._memory = new Memory(this);
        this._display = new Display(this);
        
        this._registers = new Uint8Array(8);
        this._pc = 0;
        this._sp = 0;
    }

    public loadBios(): boolean {
        return this._memory.mapFile("bios/bios.bin", 0x0000);
    }

    public step(): boolean {
        const opcode = this.readUint8();

        if (opcode === 0xCB) {
            const opcode2 = this.readUint8();

            if (_cbopcodes[opcode2] === undefined) {
                this._log(opcode2, true);
                return false;
            }

            _cbopcodes[opcode2](this);
            return true;
        }

        if (_opcodes[opcode] === undefined) {
            this._log(opcode);
            return false;
        }

        _opcodes[opcode](this);

        return true;
    }

    public readUint8(): number {
        const result = this.MMU.readUint8(this.PC);
        this.PC++;

        return result;
    }

    public readInt8(): number {
        const result = this.MMU.readInt8(this.PC);
        this.PC++;

        return result;
    }

    public readUint16(): number {
        const result = this.MMU.readUint16(this.PC);
        this.PC += 2;

        return result;
    }

    public readInt16(): number {
        const result = this.MMU.readInt16(this.PC);
        this.PC += 2;

        return result;
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
        this.SP -= 2;
        this.MMU.writeInt16(this.SP, val);
    }

    public popStack(): number {
        const val = this.MMU.readInt16(this.SP);
        this.SP += 2;

        return val;
    }

    private _log(opcode: number, isCB: boolean = false): void {
        if (isCB) {
            console.log(`Unknown cb opcode 0x${opcode.toString(16)}`);
        } else {
            console.log(`Unknown opcode 0x${opcode.toString(16)}`);
        }
    }

    get A() {
        return this._registers[Register.A];
    }

    get B() {
        return this._registers[Register.B]
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

    set A(val: number) {
        this._registers[Register.A] = val;
    }

    set F(val: number) {
        this._registers[Register.F] = val;
    }

    set B(val: number) {
        this._registers[Register.B] = val;
    }

    set C(val: number) {
        this._registers[Register.C] = val;
    }

    set D(val: number) {
        this._registers[Register.D] = val;
    }

    set E(val: number) {
        this._registers[Register.E] = val;
    }
    
    set H(val: number) {
        this._registers[Register.H] = val;
    }

    set L(val: number) {
        this._registers[Register.L] = val;
    }

    set AF(val: number) {
        this._registers[Register.A] = val >> 8;
        this._registers[Register.F] = val & 0xFF;
    }

    set BC(val: number) {
        this._registers[Register.B] = val >> 8;
        this._registers[Register.C] = val & 0xFF;
    }

    set DE(val: number) {
        this._registers[Register.B] = val >> 8;
        this._registers[Register.E] = val & 0xFF;
    }

    set HL(val: number) {
        this._registers[Register.H] = val >> 8;
        this._registers[Register.L] = val & 0xFF;
    }

    set SP(val: number) {
        this._sp = val;
    }

    set PC(val: number) {
        this._pc = val;
    }
}