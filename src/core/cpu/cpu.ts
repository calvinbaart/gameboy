import { Memory } from "../memory/memory";
import { Opcodes, OpcodesCB, _opcodes, _cbopcodes } from "./opcodes";
import { Video } from "../video/video";
import { Audio } from "../audio/audio";
import { Timer } from "./timer";
import { RomType } from "./romtype";
import { Instruction } from "./instruction";
import { SpecialRegister, Register } from "./register";
import { Flags } from "./flags";
import { Interrupt } from "./interrupt";
import { Key } from "./key";

export type RegisterType = "A" | "B" | "C" | "D" | "E" | "F" | "H" | "L" | "AF" | "SP" | "PC" | "BC" | "DE" | "HL";

export class CPU {
    private _display: Video;
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

    private _registerMap: { [key: number]: RegisterType };
    private _byteRegisterMap: { [key: number]: RegisterType };

    private _romType: RomType;
    private _romName: string;
    private _romHeaderChecksum: number;
    private _romGlobalChecksum: number;

    // Input
    private _joypadState: number;

    // Other
    private _gbcModeRaw: number;
    private _gbcMode: boolean;
    public _inBootstrap: boolean;
    public _collectTrace: boolean;
    
    public static onInstruction: (cpu: CPU, instruction: Instruction) => void;

    constructor() {
        new Opcodes();
        new OpcodesCB();

        this._memory = new Memory(this);
        this._display = new Video(this);
        this._audio = new Audio(this);
        this._timer = new Timer(this);
        this._waitForInterrupt = false;

        this._specialRegisters = new Uint8Array(9);
        this._registers = new Uint8Array(8);
        this._registers16 = new Uint16Array(3);
        this._collectTrace = false;

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
        this._gbcMode = false;
        this._gbcModeRaw = 0x00;
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
        this._romHeaderChecksum = 0;
        this._romGlobalChecksum = 0;
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
        }
    }

    public setBios(buffer: Buffer): boolean {
        return this._memory.setBios(buffer);
    }

    public setRom(buffer: Buffer): boolean {
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

    public fetchAndDecode(): Instruction {
        let instruction: Instruction = {
            isCB: false,
            pc: this.get("PC"),
            opcode: 0,
            ticks: 0,
            cpu: this,

            registers: null,
            registers16: null,
            opcodeName: "",

            exec: null
        };

        instruction.opcode = this.readu8();

        if (instruction.opcode === 0xCB) {
            instruction.isCB = true;
            instruction.opcode = this.readu8();
            instruction.ticks = _cbopcodes[instruction.opcode][0];
            instruction.exec = _cbopcodes[instruction.opcode][1];
            instruction.opcodeName = _cbopcodes[instruction.opcode][2];
        } else {
            instruction.isCB = false;
            instruction.ticks = _opcodes[instruction.opcode][0];
            instruction.exec = _opcodes[instruction.opcode][1];
            instruction.opcodeName = _opcodes[instruction.opcode][2];
        }

        if (this._collectTrace) {
            instruction.registers = new Uint8Array(this._registers);
            instruction.registers16 = new Uint16Array(this._registers16);
        }

        return instruction;
    }

    public step(): boolean {
        if (this._waitForInterrupt) {
            this._cycles += 4;
            this._tickInternal(4);

            if (this._waitForInterrupt) {
                return true;
            }
        }

        const instruction = this.fetchAndDecode();

        if (instruction.exec !== null) {
            instruction.exec(instruction);
        }

        if (CPU.onInstruction) {
            CPU.onInstruction(this, instruction);
        }

        if (instruction.ticks !== 0) {
            this._tickInternal(instruction.ticks);
        }
        
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
        let pc = this.get("PC");

        const result = this.MMU.read8(pc);
        pc++;

        this.set("PC", pc);

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
        this.set("F", this.get("F") | flag);
    }

    public disableFlag(flag: Flags): void {
        this.set("F", this.get("F") & ~flag);
    }

    public isFlagSet(flag: Flags): boolean {
        return (this.get("F") & flag) !== 0;
    }

    public clearFlags(): void {
        this.set("F", 0);
    }

    public pushStack(val: number): void {
        let sp = this.get("SP");

        sp--;
        this.MMU.write8(sp, val >> 8);
        sp--;
        this.MMU.write8(sp, val & 0xFF);

        this.set("SP", sp);
    }

    public popStack(): number {
        let sp = this.get("SP");

        const val1 = this.MMU.read8(sp);
        sp++;
        const val2 = this.MMU.read8(sp);
        sp++;

        this.set("SP", sp);

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

    public readRegisterType(val: number, useAF: boolean): RegisterType {
        if ((val & 0x03) == 0x03) {
            return useAF ? "AF" : this._registerMap[0x03];
        } else {
            return this._registerMap[val & 0x03];
        }
    }

    public readByteRegisterType(val: number): RegisterType {
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

        this.pushStack(this.get("PC"));
        this.set("PC", 0x0040 + (interrupt * 8));
    }

    public get(register: RegisterType): number {
        switch (register) {
            case "A":
                return this._registers[Register.A];
            
            case "B":
                return this._registers[Register.B];

            case "C":
                return this._registers[Register.C];

            case "D":
                return this._registers[Register.D];

            case "E":
                return this._registers[Register.E];

            case "H":
                return this._registers[Register.H];

            case "L":
                return this._registers[Register.L];

            case "F":
                return this._registers[Register.F];
            
            case "AF":
                return (this._registers[Register.A] << 8) | this._registers[Register.F];

            case "SP":
                return this._registers16[0];
            
            case "PC":
                return this._registers16[1];
            
            case "BC":
                return (this._registers[Register.B] << 8) | this._registers[Register.C];

            case "DE":
                return (this._registers[Register.D] << 8) | this._registers[Register.E];

            case "HL":
                return (this._registers[Register.H] << 8) | this._registers[Register.L];
        }
    }

    public set(register: RegisterType, value: number): number {
        switch (register) {
            case "A":
                this._registers[Register.A] = value;
                return this._registers[Register.A];

            case "B":
                this._registers[Register.B] = value;
                return this._registers[Register.B];

            case "C":
                this._registers[Register.C] = value;
                return this._registers[Register.C];

            case "D":
                this._registers[Register.D] = value;
                return this._registers[Register.D];

            case "E":
                this._registers[Register.E] = value;
                return this._registers[Register.E];

            case "H":
                this._registers[Register.H] = value;
                return this._registers[Register.H];

            case "L":
                this._registers[Register.L] = value;
                return this._registers[Register.L];

            case "F":
                this._registers[Register.F] = value;
                return this._registers[Register.F];

            case "AF":
                this._registers16[2] = value;

                this._registers[Register.A] = this._registers16[2] >> 8;
                this._registers[Register.F] = this._registers16[2] & 0xFF;
                
                return this._registers16[2];

            case "SP":
                this._registers16[0] = value;
                return this._registers16[0];

            case "PC":
                this._registers16[1] = value;
                return this._registers16[1];

            case "BC":
                this._registers16[2] = value;

                this._registers[Register.B] = this._registers16[2] >> 8;
                this._registers[Register.C] = this._registers16[2] & 0xFF;

                return this._registers16[2];

            case "DE":
                this._registers16[2] = value;

                this._registers[Register.D] = this._registers16[2] >> 8;
                this._registers[Register.E] = this._registers16[2] & 0xFF;

                return this._registers16[2];

            case "HL":
                this._registers16[2] = value;

                this._registers[Register.H] = this._registers16[2] >> 8;
                this._registers[Register.L] = this._registers16[2] & 0xFF;

                return this._registers16[2];
        }
    }

    public increment(register: RegisterType, num: number = 1): number {
        let tmp = this.get(register);
        tmp += num;

        return this.set(register, tmp);
    }

    public decrement(register: RegisterType, num: number = 1): number {
        let tmp = this.get(register);
        tmp -= num;

        return this.set(register, tmp);
    }

    public cycle(numCycles: number): void {
        this._tickInternal(numCycles);
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

    get saveIdentifier(): string {
        let identifier = this.romName.trim() + this.romHeaderChecksum + this.romGlobalChecksum;
        identifier = identifier.replace(/\s/g, "");

        return identifier;
    }
}