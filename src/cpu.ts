import { Memory } from "./memory";
import { Opcodes, OpcodesCB, _opcodes, _cbopcodes } from "./opcodes";
import { Display } from "./display";
import { Audio } from "./audio";
import { Timer } from "./timer";

export enum Key {
    A = 4,
    B = 5,
    Start = 7,
    Select = 6,
    Up = 2,
    Down = 3,
    Left = 1,
    Right = 0
}

export enum SpecialRegister {
    P1,
    SB,
    SC,
    IF,
    IE
}

export enum Interrupt {
    VBlank,
    LCDStat,
    Timer,
    Serial,
    Joypad
}

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

export enum RomType {
    UNKNOWN = -1,
    ROMONLY = 0x00,
    MBC1 = 0x01,
    MBC1RAM = 0x02,
    MBC1RAMBATTERY = 0x03,
    MBC2 = 0x05,
    MBC2BATTERY = 0x06,
    ROMRAM = 0x08,
    ROMRAMBATTERY = 0x09,
    MMMO1 = 0xB,
    MMMO1RAM = 0xC,
    MMMO1RAMBATTERY = 0xD,
    MBC3TIMERBATTERY = 0xF,
    MBC3TIMERRAMBATTERY = 0x10,
    MBC3 = 0x11,
    MBC3RAM = 0x12,
    MBC3RAMBATTERY = 0x13,
    MBC5 = 0x19,
    MBC5RAM = 0x1A,
    MBC5RAMBATTERY = 0x1B,
    MBC5RUMBLE = 0x1C,
    MBC5RUMBLERAM = 0x1D,
    MBC5RUMBLERAMBATTERY = 0x1E,
    MBC6 = 0x20,
    MBC7SENSORRUMBLERAMBATTERY = 0x22,
    POCKETCAMERA = 0xFC,
    BANDAITAMA5 = 0xFD,
    HUC3 = 0xFE,
    HUC1RAMBATTERY = 0xFF
}

export class CPU {
    private _display: Display;
    private _audio: Audio;
    private _timer: Timer;
    
    private _memory: Memory;
    private _registers: Uint8Array;
    private _registers16: Uint16Array;
    private _cycles: number;
    private _enableInterrupts: boolean;

    private _specialRegisters: Uint8Array;
    private _debugString: string;
    private _waitForInterrupt: boolean;

    private _registerMap: { [key: number]: string };
    private _byteRegisterMap: { [key: number]: string };

    private _romType: RomType;
    private _romName: string;
    private _romHeaderChecksum: number;
    private _romGlobalChecksum: number;
    private _halt: boolean;
    
    private _currentOpcode: number;
    private _currentOpcodePC: number;
    private _currentOpcodeTicks: number;

    // Input
    private _joypadState: number;

    // Other
    private _gbcModeRaw: number;
    private _gbcMode: boolean;
    public _inBootstrap: boolean;

    constructor() {
        new Opcodes();
        new OpcodesCB();

        this._memory = new Memory(this);
        this._display = new Display(this);
        this._audio = new Audio(this);
        this._timer = new Timer(this);
        this._waitForInterrupt = false;
        this._halt = false;

        this._specialRegisters = new Uint8Array(9);
        this._registers = new Uint8Array(8);
        this._registers16 = new Uint16Array(3);

        this._enableInterrupts = true;
        this._debugString = "";
        this._cycles = 0;
        this._romName = "";

        this._memory.addRegister(0xFF00, this._registerRead.bind(this, SpecialRegister.P1),    this._registerWrite.bind(this, SpecialRegister.P1));
        this._memory.addRegister(0xFF01, this._registerRead.bind(this, SpecialRegister.SB),    this._registerWrite.bind(this, SpecialRegister.SB));
        this._memory.addRegister(0xFF02, this._registerRead.bind(this, SpecialRegister.SC),    this._registerWrite.bind(this, SpecialRegister.SC));
        this._memory.addRegister(0xFF0F, this._registerRead.bind(this, SpecialRegister.IF),    this._registerWrite.bind(this, SpecialRegister.IF));
        this._memory.addRegister(0xFFFF, this._registerRead.bind(this, SpecialRegister.IE), this._registerWrite.bind(this, SpecialRegister.IE));

        // Undocumented register
        this._memory.addRegister(0xFF4C, () => this._gbcModeRaw, (x) => {
            this._gbcModeRaw = x;
            this._gbcMode = (x & 0x80) == 0x80;

            console.log(`GBCMODE = ${this._gbcMode ? "true" : "false"}`);
        });

        // this._memory.addRegister(0xFF74, () => 0xFE, (x) => { });
        this._inBootstrap = true;

        this._registerMap = {
            0: "BC",
            1: "DE",
            2: "HL",
            3: "SP"
        };

        this._byteRegisterMap = {
            0: "B",
            1: "C",
            2: "D",
            3: "E",
            4: "H",
            5: "L",
            6: "F",
            7: "A"
        };

        this._romType = RomType.UNKNOWN;
        this._joypadState = 0xFF;

        this.P1 = 0xFF;
    }

    private _registerRead(register: SpecialRegister): number {
        let val = this._specialRegisters[register];

        switch (register) {
            case SpecialRegister.P1:
                val |= 0xC0;
                break;
            
            case SpecialRegister.SB:
                val = 0xFF;
                break;
            
            case SpecialRegister.SC:
                val = 0xFE;
                break;
            
            case SpecialRegister.IF:
                val |= 0xE0;
                break;
        }

        return val;
    }

    private _registerWrite(register: SpecialRegister, val: number): void {
        this._specialRegisters[register] = val;

        switch (register) {
            case SpecialRegister.SC:
                if (val === 0x81) {
                    if (this._specialRegisters[SpecialRegister.SB] === 10) {
                        if (this._debugString.trim().length > 0) {
                            console.log(this._debugString);
                        }

                        this._debugString = "";
                    } else {
                        this._debugString += String.fromCharCode(this._specialRegisters[SpecialRegister.SB]);
                    }
                }
                break;
            
            case SpecialRegister.IF:
                // console.log(`IFW = ${val.toString(16)}`);
                break;
        }
    }

    public loadBios(): boolean {
        let buffer: Buffer = null;

        if (process.env.APP_ENV === "browser") {
            buffer = require("../file-loader.js!../dist/bios/gbc_bios.bin");
        } else {
            let fs = "fs";
            buffer = require(fs).readFileSync("bios/bios.bin");
        }

        return this._memory.setBios(buffer);
    }

    public loadRom(): boolean {
        let buffer: Buffer = null;

        if (process.env.APP_ENV === "browser") {
            buffer = require("../file-loader.js!../dist/roms/pokemongold.gbc");
        } else {
            let fs = "fs";
            buffer = require(fs).readFileSync("roms/interrupt_time.gb");
        }

        this._romType = buffer[0x147];
        this._romName = "";

        for (let i = 0x134; i <= 0x143; i++) {
            if (buffer[i] === 0) {
                break;
            }

            this._romName += String.fromCharCode(buffer[i]);
        }
        
        this._romHeaderChecksum = buffer[0x14D];
        this._romGlobalChecksum = (buffer[0x14E] << 8) | buffer[0x14F];
        this._memory.createController(this._romType);

        return this._memory.setRom(buffer);
    }

    public step(): boolean {
        if (this._halt) {
            return false;
        }

        if (this._waitForInterrupt) {
            this._cycles += 4;
            this._tickInternal(4);

            if (this._waitForInterrupt) {
                return true;
            }
        }

        this._currentOpcodePC = this.PC;
        const opcode = this.readu8();
        this._currentOpcode = opcode;

        if (opcode === 0xCB) {
            const opcode2 = this.readu8();

            if (_cbopcodes[opcode2] === undefined) {
                this._log(opcode2, true);
                return false;
            }

            this._currentOpcodeTicks = _cbopcodes[opcode2][0];
            _cbopcodes[opcode2][1](opcode2, this);

            // console.log(_cbopcodes[opcode2][2]);
            this._tickInternal(this._currentOpcodeTicks);
            return true;
        }

        if (_opcodes[opcode] === undefined) {
            this._log(opcode);
            return false;
        }

        this._currentOpcodeTicks = _opcodes[opcode][0];
        _opcodes[opcode][1](opcode, this);

        // console.log(_opcodes[opcode][2]);
        this._tickInternal(this._currentOpcodeTicks);
        return true;
    }

    private _tickInternal(cycles: number): void {
        this._cycles += cycles;
        this._display.tick(cycles);
        this._audio.tick(cycles);
        this._memory.tick(cycles);
        this._timer.tick(cycles);
        this._tickInput(cycles);
        this.checkInterrupt();
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
        this.SP--;
        this.MMU.write8(this.SP, val >> 8);
        this.SP--;
        this.MMU.write8(this.SP, val & 0xFF);
    }

    public popStack(): number {
        const val1 = this.MMU.read8(this.SP);
        this.SP++;
        const val2 = this.MMU.read8(this.SP);
        this.SP++;

        return (val2 << 8) | val1;
    }

    public isInterruptEnabled(interrupt: Interrupt): boolean {
        return (this._specialRegisters[SpecialRegister.IE] & (1 << interrupt)) !== 0;
    }
    
    public checkInterrupt(): void {
        if (!this._enableInterrupts) {
            return;
        }

        const interruptFlag = this._specialRegisters[SpecialRegister.IF] & this._specialRegisters[SpecialRegister.IE];

        if (interruptFlag & (1 << Interrupt.VBlank)) {
            this._fireInterrupt(Interrupt.VBlank);
            this._specialRegisters[SpecialRegister.IF] &= ~(1 << Interrupt.VBlank);
        } else if (interruptFlag & (1 << Interrupt.LCDStat)) {
            this._fireInterrupt(Interrupt.LCDStat);
            this._specialRegisters[SpecialRegister.IF] &= ~(1 << Interrupt.LCDStat);
        } else if (interruptFlag & (1 << Interrupt.Timer)) {
            this._fireInterrupt(Interrupt.Timer);
            this._specialRegisters[SpecialRegister.IF] &= ~(1 << Interrupt.Timer);
        } else if (interruptFlag & (1 << Interrupt.Serial)) {
            this._fireInterrupt(Interrupt.Serial);
            this._specialRegisters[SpecialRegister.IF] &= ~(1 << Interrupt.Serial);
        } else if (interruptFlag & (1 << Interrupt.Joypad)) {
            this._fireInterrupt(Interrupt.Joypad);
            this._specialRegisters[SpecialRegister.IF] &= ~(1 << Interrupt.Joypad);
        }
    }

    public readRegisterType(val: number, useAF: boolean): string {
        if ((val & 0x03) == 0x03) {
            return useAF ? "AF" : this._registerMap[0x03];
        } else {
            return this._registerMap[val & 0x03];
        }
    }

    public readByteRegisterType(val: number): string {
        return this._byteRegisterMap[val & 0x07];
    }

    public requestInterrupt(interrupt: Interrupt): void {
        const mask = 1 << interrupt;

        if (mask & this._specialRegisters[SpecialRegister.IE]) {
            this.waitForInterrupt = false;
        }

        this._specialRegisters[SpecialRegister.IF] |= mask;
    }

    public keyPressed(key: Key): void {
        this._joypadState &= ~(1 << key);
    }

    public keyReleased(key: Key): void {
        this._joypadState |= 1 << key;
    }

    private _tickInput(cycles: number): void {
        let current = this.P1 & 0xF0;

        switch (current & 0x30) {
            case 0x10:
                let topJoypad = (this._joypadState >> 4) & 0x0F;
                current |= topJoypad;
                break;
            
            case 0x20:
                let bottomJoypad = this._joypadState & 0x0F;
                current |= bottomJoypad;
                break;
            
            case 0x30:
                current |= 0x0F;
                break;
        }

        if ((this.P1 & ~current & 0x0F) != 0) {
            this.requestInterrupt(Interrupt.Joypad);
        }

        this.P1 = current;
    }

    private _fireInterrupt(interrupt: Interrupt): void {
        this.enableInterrupts = false;

        this.pushStack(this.PC);
        this.PC = 0x0040 + (interrupt * 8);
    }

    private _log(opcode: number, isCB: boolean = false): void {
        if (isCB) {
            console.log(`Unknown cb opcode 0x${opcode.toString(16)}`);
        } else {
            console.log(`Unknown opcode 0x${opcode.toString(16)}`);
        }
    }

    get enableInterrupts() {
        return this._enableInterrupts;
    }

    set enableInterrupts(val: boolean) {
        this._enableInterrupts = val;
    }

    get waitForInterrupt() {
        return this._waitForInterrupt;
    }

    set waitForInterrupt(val: boolean) {
        this._waitForInterrupt = val;
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
        return this._registers16[0];
    }

    get PC() {
        return this._registers16[1];
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

    get cycles() {
        return this._cycles;
    }

    get IF() {
        return this._registerRead(SpecialRegister.IF);
    }

    get P1() {
        return this._registerRead(SpecialRegister.P1);
    }

    set P1(val: number) {
        this._registerWrite(SpecialRegister.P1, val);
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
        this._registers16[2] = val;

        this._registers[Register.A] = this._registers16[2] >> 8;
        this._registers[Register.F] = this._registers16[2] & 0xFF;
    }

    set BC(val: number) {
        this._registers16[2] = val;

        this._registers[Register.B] = this._registers16[2] >> 8;
        this._registers[Register.C] = this._registers16[2] & 0xFF;
    }

    set DE(val: number) {
        this._registers16[2] = val;

        this._registers[Register.D] = this._registers16[2] >> 8;
        this._registers[Register.E] = this._registers16[2] & 0xFF;
    }

    set HL(val: number) {
        this._registers16[2] = val;

        this._registers[Register.H] = this._registers16[2] >> 8;
        this._registers[Register.L] = this._registers16[2] & 0xFF;
    }

    set SP(val: number) {
        this._registers16[0] = val;
    }

    set PC(val: number) {
        this._registers16[1] = val;
    }

    get halt(): boolean {
        return this._halt;
    }

    set halt(val: boolean) {
        this._halt = val;
    }

    get opcode(): number {
        return this._currentOpcode;
    }

    get opcodePC(): number {
        return this._currentOpcodePC;
    }

    get opcodeTicks(): number {
        return this._currentOpcodeTicks;
    }

    set opcodeTicks(val: number) {
        this._currentOpcodeTicks = val;
    }

    get romName(): string {
        return this._romName;
    }

    get romHeaderChecksum(): number {
        return this._romHeaderChecksum;
    }

    get romGlobalChecksum(): number {
        return this._romGlobalChecksum;
    }

    get gbcMode(): boolean {
        return this._gbcMode;
    }
}