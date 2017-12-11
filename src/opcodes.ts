import { CPU, Flags } from "./cpu";
// import * as fs from "fs";

enum OpcodeType {
    Default,
    CB
}

interface Descriptor extends PropertyDescriptor {
    value?: (cpu: CPU) => void;
}

export const _opcodes: { [key: number]: (cpu: CPU) => void } = { };
export const _cbopcodes: { [key: number]: (cpu: CPU) => void } = { };
export function Opcode(opcode: number, type: OpcodeType = OpcodeType.Default) {
    return (target: any, property: string, descriptor: Descriptor) => {
        if (type === OpcodeType.Default) {
            _opcodes[opcode] = descriptor.value;
        } else {
            _cbopcodes[opcode] = descriptor.value;
        }
    };
}

// const debugFile = fs.openSync("./disassembly.txt", "w+");
const debug = (name: string, args: { [key: string]: number }, values: { [key: string]: number }, cpu: CPU): void => {
    if (process.env.APP_ENV === "browser") {
        return;
    }
    
    let minus = 1;
    let tmp = [];

    for (let key in args) {
        minus += args[key];

        if (values[key] === undefined) {
            tmp.push(key);
        } else {
            let value = values[key].toString(16);

            if (values[key] < 0) {
                value = value.substr(1);

                while (value.length < 4) {
                    value = "0" + value;
                }

                value = "-" + value;
            } else {
                while (value.length < 4) {
                    value = "0" + value;
                }
            }    

            tmp.push(`${key}=${value}`);
        }
    }

    const registers = {
        "A": cpu.A.toString(16),
        "B": cpu.B.toString(16),
        "C": cpu.C.toString(16),
        "D": cpu.D.toString(16),
        "E": cpu.E.toString(16),
        "H": cpu.H.toString(16),
        "L": cpu.L.toString(16),
        "F": cpu.F.toString(16),
        "BC": cpu.BC.toString(16),
        "DE": cpu.DE.toString(16),
        "HL": cpu.HL.toString(16),
        "SP": cpu.SP.toString(16),
        "PC": (cpu.PC - minus).toString(16)
    };

    let regs = [];
    for (const key in registers) {
        if (parseInt(registers[key], 16) < 0) {
            registers[key] = registers[key].substr(1);

            while (registers[key].length < 4) {
                registers[key] = "0" + registers[key];
            }

            registers[key] = "-" + registers[key];
        } else {
            while (registers[key].length < 4) {
                registers[key] = "0" + registers[key];
            }
        }

        regs.push(`${key}=${registers[key]}`);
    }

    const log = `${name} ${tmp.join(", ")} [${regs.join(", ")}]`;
    // fs.writeSync(debugFile, log + "\n");

    console.log(log);
};

function XOR(num: number, cpu: CPU): void {
    cpu.A = cpu.A ^ num;
    cpu.machine_cycle();
}

function RL(register: string, zeroCheck: boolean, cpu: CPU): void {
    const carry = cpu.isFlagSet(Flags.CarryFlag) ? 1 : 0;
    let result = cpu[register];

    if ((result & 0x80) != 0) {
        cpu.enableFlag(Flags.CarryFlag);
    } else {
        cpu.clearFlags();
    }

    result <<= 1;
    cpu.machine_cycle();

    result |= carry;
    cpu.machine_cycle();

    if (zeroCheck && result === 0) {
        cpu.enableFlag(Flags.ZeroFlag);
    }

    cpu[register] = result;
}

function INC(register: string, cpu: CPU): void {
    if (register === null) {
        debug("INC", { "(HL)": 0 }, {}, cpu);

        let val = cpu.MMU.readInt8(cpu.HL);
        cpu.machine_cycle();

        val++;
        cpu.machine_cycle();

        cpu.MMU.writeInt8(cpu.HL, val);
        cpu.machine_cycle();

        return;
    }

    debug("INC", { register: 0 }, { register: cpu[register] }, cpu);

    cpu[register]++;
    cpu.machine_cycle();

    cpu.disableFlag(Flags.AddSubFlag);

    // todo: H - Set if carry from bit 3.
}

function INC_16(register: string, cpu: CPU): void {
    debug("INC", { register: 0 }, { register: cpu[register] }, cpu);

    cpu[register]++;
    cpu.machine_cycle();
    cpu.machine_cycle();
}

function DEC(register: string, cpu: CPU): void {
    if (register === null) {
        debug("DEC", { "(HL)": 0 }, { }, cpu);

        let val = cpu.MMU.readInt8(cpu.HL);
        cpu.machine_cycle();

        val--;
        cpu.machine_cycle();

        cpu.MMU.writeInt8(cpu.HL, val);
        cpu.machine_cycle();

        return;
    }

    debug("DEC", { register: 0 }, { register: cpu[register] }, cpu);

    cpu[register]--;
    cpu.machine_cycle();

    cpu.enableFlag(Flags.AddSubFlag);

    //todo: H: set if no borrow from bit 4 (??)
}

function LD_8(register: string, cpu: CPU): void {
    const val = cpu.readUint8();
    cpu.machine_cycle();

    debug("LD", { register: 0, "n": 1 }, { register: cpu[register], "n": val }, cpu);

    cpu[register] = val;
    cpu.machine_cycle();
}

function LD_8_r2_r1(r1: string, r2: string, cpu: CPU): void {
    if (r1 === null) {
        debug("LD", { "(HL)": 0, r2: 0 }, { r2: cpu[r2] }, cpu);

        cpu.MMU.writeInt8(cpu.HL, cpu[r2]);
        cpu.machine_cycle();
        cpu.machine_cycle();

        return;
    } else if (r2 === null) {
        let val = cpu.MMU.readInt8(cpu.HL);
        cpu.machine_cycle();

        debug("LD", { r1: 0, "(HL)": 0 }, { r1: cpu[r1], "(HL)": val }, cpu);

        cpu[r1] = val;
        cpu.machine_cycle();

        return;
    }

    debug("LD", { r1: 0, r2: 0 }, { r1: cpu[r1], r2: cpu[r2] }, cpu);

    cpu[r1] = cpu[r2];
    cpu.machine_cycle();
}

function SUB(register: string, cpu: CPU): void {
    if (register === null) {
        let tmp = cpu.MMU.readUint8(cpu.HL);
        cpu.machine_cycle();

        debug("SUB", { "(HL)": 0 }, { "(HL)": tmp }, cpu);

        cpu.A -= tmp;
        cpu.machine_cycle();

        return;
    }

    debug("SUB", { "n": 0 }, { "n": cpu[register] }, cpu);

    cpu.A -= cpu[register];
    cpu.machine_cycle();

    // todo:   H - Set if no borrow from bit 4.
    //         C - Set if no borrow
}

export class Opcodes {
    @Opcode(0x04)
    public static INC_0x04(cpu: CPU): void {
        INC("B", cpu);
    }

    @Opcode(0x05)
    public static DEC_0x05(cpu: CPU): void {
        DEC("B", cpu);
    }

    @Opcode(0x06)
    public static LD_0x06(cpu: CPU): void {
        LD_8("B", cpu);
    }

    @Opcode(0x0C)
    public static INC_0x0C(cpu: CPU): void {
        INC("C", cpu);
    }

    @Opcode(0x0D)
    public static DEC_0x0D(cpu: CPU): void {
        DEC("C", cpu);
    }

    @Opcode(0x0E)
    public static LD_0x0E(cpu: CPU): void {
        LD_8("C", cpu);
    }

    @Opcode(0x11)
    public static LD_0x11(cpu: CPU): void {
        const lo = cpu.readUint8();
        cpu.machine_cycle();

        const hi = cpu.readUint8();
        cpu.machine_cycle();

        debug("LD", { "DE": 0, "nn": 2 }, { "nn": (hi << 8) | lo }, cpu);

        cpu.D = hi;
        cpu.E = lo;
    }

    @Opcode(0x13)
    public static INC_0x13(cpu: CPU): void {
        INC_16("DE", cpu);
    }

    @Opcode(0x14)
    public static INC_0x14(cpu: CPU): void {
        INC("D", cpu);
    }

    @Opcode(0x15)
    public static DEC_0x15(cpu: CPU): void {
        DEC("D", cpu);
    }

    @Opcode(0x16)
    public static LD_0x16(cpu: CPU): void {
        LD_8("D", cpu);
    }

    @Opcode(0x17)
    public static RLA_0x17(cpu: CPU): void {
        debug("RLA", {}, {}, cpu);

        cpu.machine_cycle();
        RL("A", false, cpu);
        cpu.machine_cycle();
    }

    @Opcode(0x18)
    public static JR_0x18(cpu: CPU): void {
        const relative = cpu.readInt8();

        debug("JR", { "n": 1 }, { "n": relative }, cpu);

        cpu.PC += relative;
    }

    @Opcode(0x1A)
    public static LD_0x1A(cpu: CPU): void {
        debug("LD", { "A": 0, "(DE)": 0 }, { "(DE)": cpu.DE }, cpu);

        cpu.A = cpu.MMU.readUint8(cpu.DE);
    }

    @Opcode(0x1C)
    public static INC_0x1C(cpu: CPU): void {
        INC("E", cpu);
    }

    @Opcode(0x1D)
    public static DEC_0x1D(cpu: CPU): void {
        DEC("E", cpu);
    }

    @Opcode(0x1E)
    public static LD_0x1E(cpu: CPU): void {
        LD_8("E", cpu);
    }

    @Opcode(0x20)
    public static JR_0x20(cpu: CPU): void {
        const relative = cpu.readInt8();

        debug("JR", { "NZ": 0, "n": 1 }, { "n": relative }, cpu);

        if (!cpu.isFlagSet(Flags.ZeroFlag)) {
            cpu.PC += relative;
        }
    }

    @Opcode(0x21)
    public static LD_0x21(cpu: CPU): void {
        const val = cpu.readUint16();

        debug("LD", { "HL": 0, "nn": 2 }, { "nn": val }, cpu);

        cpu.HL = val;
    }

    @Opcode(0x22)
    public static LD_0x22(cpu: CPU): void {
        debug("LD", { "(HL+)": 0, "A": 0 }, {}, cpu);

        cpu.MMU.writeUint8(cpu.HL, cpu.A);
        cpu.HL++;
    }

    @Opcode(0x23)
    public static INC_0x23(cpu: CPU): void {
        INC_16("HL", cpu);
    }

    @Opcode(0x24)
    public static INC_0x24(cpu: CPU): void {
        INC("H", cpu);
    }

    @Opcode(0x25)
    public static DEC_0x25(cpu: CPU): void {
        DEC("H", cpu);
    }

    @Opcode(0x26)
    public static LD_0x26(cpu: CPU): void {
        LD_8("H", cpu);
    }

    @Opcode(0x28)
    public static JR_0x28(cpu: CPU): void {
        const relative = cpu.readInt8();

        debug("JR", { "Z": 0, "n": 1 }, { "n": relative }, cpu);

        if (cpu.isFlagSet(Flags.ZeroFlag)) {
            cpu.PC += relative;
        }
    }

    @Opcode(0x2C)
    public static INC_0x2C(cpu: CPU): void {
        INC("L", cpu);
    }

    @Opcode(0x2D)
    public static DEC_0x2D(cpu: CPU): void {
        DEC("L", cpu);
    }

    @Opcode(0x2E)
    public static LD_0x2E(cpu: CPU): void {
        LD_8("L", cpu);
    }

    @Opcode(0x31)
    public static LD_0x31(cpu: CPU): void {
        const val = cpu.readUint16();

        debug("LD", { "SP": 0, "nn": 2 }, { "nn": val }, cpu);

        cpu.SP = val;
    }

    @Opcode(0x32)
    public static LD_0x32(cpu: CPU): void {
        debug("LD", { "(HL-)": 0, "A": 0 }, {}, cpu);

        cpu.MMU.writeUint8(cpu.HL, cpu.A);
        cpu.HL--;
    }

    @Opcode(0x34)
    public static INC_0x34(cpu: CPU): void {
        INC(null, cpu);
    }

    @Opcode(0x35)
    public static DEC_0x35(cpu: CPU): void {
        DEC(null, cpu);
    }

    @Opcode(0x3C)
    public static INC_0x3C(cpu: CPU): void {
        INC("A", cpu);
    }

    @Opcode(0x3D)
    public static DEC_0x3D(cpu: CPU): void {
        DEC("A", cpu);
    }

    @Opcode(0x3E)
    public static LD_0x3E(cpu: CPU): void {
        const lo = cpu.readUint8();

        debug("LD", { "A": 0, "n": 1 }, { "n": lo }, cpu);

        cpu.A = lo;
    }

    @Opcode(0x42)
    public static LD_0x42(cpu: CPU): void {
        LD_8_r2_r1("B", "D", cpu);
    }

    @Opcode(0x4F)
    public static LD_0x4F(cpu: CPU): void {
        debug("LD", { "C": 0, "A": 0 }, { "A": cpu.A }, cpu);

        cpu.C = cpu.A;
    }

    @Opcode(0x57)
    public static LD_0x57(cpu: CPU): void {
        debug("LD", { "D": 0, "A": 0 }, { "A": cpu.A }, cpu);

        cpu.D = cpu.A;
    }

    @Opcode(0x67)
    public static LD_0x67(cpu: CPU): void {
        debug("LD", { "H": 0, "A": 0 }, { "A": cpu.A }, cpu);

        cpu.H = cpu.A;
    }

    @Opcode(0x77)
    public static LD_0x77(cpu: CPU): void {
        debug("LD", { "(HL)": 0, "A": 0 }, { "A": cpu.A }, cpu);

        cpu.MMU.writeUint8(cpu.HL, cpu.A);
    }

    @Opcode(0x78)
    public static LD_0x78(cpu: CPU): void {
        LD_8_r2_r1("A", "E", cpu);
    }

    @Opcode(0x79)
    public static LD_0x79(cpu: CPU): void {
        LD_8_r2_r1("A", "C", cpu);
    }

    @Opcode(0x7A)
    public static LD_0x7A(cpu: CPU): void {
        LD_8_r2_r1("A", "D", cpu);
    }

    @Opcode(0x7B)
    public static LD_0x7B(cpu: CPU): void {
        debug("LD", { "A": 0, "E": 0 }, { "E": cpu.E }, cpu);

        cpu.A = cpu.E;
    }

    @Opcode(0x7C)
    public static LD_0x7C(cpu: CPU): void {
        LD_8_r2_r1("A", "H", cpu);
    }

    @Opcode(0x7D)
    public static LD_0x7D(cpu: CPU): void {
        LD_8_r2_r1("A", "L", cpu);
    }

    @Opcode(0x7E)
    public static LD_0x7E(cpu: CPU): void {
        LD_8_r2_r1("A", null, cpu);
    }

    @Opcode(0x7F)
    public static LD_0x7F(cpu: CPU): void {
        LD_8_r2_r1("A", "A", cpu);
    }

    @Opcode(0x90)
    public static SUB_0x90(cpu: CPU): void {
        SUB("B", cpu);
    }

    @Opcode(0x91)
    public static SUB_0x91(cpu: CPU): void {
        SUB("C", cpu);
    }

    @Opcode(0x92)
    public static SUB_0x92(cpu: CPU): void {
        SUB("D", cpu);
    }

    @Opcode(0x93)
    public static SUB_0x93(cpu: CPU): void {
        SUB("E", cpu);
    }

    @Opcode(0x94)
    public static SUB_0x94(cpu: CPU): void {
        SUB("H", cpu);
    }

    @Opcode(0x95)
    public static SUB_0x95(cpu: CPU): void {
        SUB("L", cpu);
    }

    @Opcode(0x96)
    public static SUB_0x96(cpu: CPU): void {
        SUB(null, cpu);
    }

    @Opcode(0x96)
    public static SUB_0x97(cpu: CPU): void {
        SUB("A", cpu);
    }

    @Opcode(0xAF)
    public static XOR_0xAF(cpu: CPU): void {
        debug("XOR", { "A": 0 }, { "A": cpu.A }, cpu);

        XOR(cpu.A, cpu);
    }

    @Opcode(0xBE)
    public static CP_0xBE(cpu: CPU): void {
        let val = cpu.MMU.readUint8(cpu.HL);
        cpu.machine_cycle();

        debug("CP", { "(HL)": 1 }, { "(HL)": val }, cpu);

        if (val === cpu.A) {
            cpu.enableFlag(Flags.ZeroFlag);
        } else {
            cpu.disableFlag(Flags.ZeroFlag);
        }

        cpu.enableFlag(Flags.AddSubFlag);
        // todo: H - Set if no borrow from bit 4. (??)

        if (cpu.A < val) {
            cpu.enableFlag(Flags.CarryFlag);
        } else {
            cpu.disableFlag(Flags.CarryFlag);
        }
    }

    @Opcode(0xC1)
    public static POP_0xC1(cpu: CPU): void {
        debug("POP", { "BC": 0 }, {}, cpu);

        cpu.BC = cpu.popStack();
    }

    @Opcode(0xC5)
    public static PUSH_0xC5(cpu: CPU): void {
        debug("PUSH", { "BC": 0 }, {}, cpu);

        cpu.pushStack(cpu.BC);
    }

    @Opcode(0xC9)
    public static RET_0xC9(cpu: CPU): void {
        debug("RET", {}, {}, cpu);

        cpu.PC = cpu.popStack();
    }

    @Opcode(0xCD)
    public static CALL_0xCD(cpu: CPU): void {
        const addr = cpu.readUint16();

        debug("CALL", { "nn": 2 }, { "nn": addr }, cpu);

        cpu.pushStack(cpu.PC);
        cpu.PC = addr;
    }

    @Opcode(0xE0)
    public static LDH_0xE0(cpu: CPU): void {
        const pos = 0xFF00 + cpu.readUint8();

        debug("LDH", { "(0xFF00 + n)": 1, "A": 0 }, { "(0xFF00 + n)": pos }, cpu);

        cpu.MMU.writeUint8(pos, cpu.A);
    }

    @Opcode(0xE2)
    public static LD_0xE2(cpu: CPU): void {
        debug("LD", { "(0xFF00 + C)": 0, "A": 0 }, { "(0xFF00 + C)": 0xFF00 + cpu.C, "A": cpu.A }, cpu);

        cpu.MMU.writeUint8(0xFF00 + cpu.C, cpu.A);
    }

    @Opcode(0xEA)
    public static LD_0xEA(cpu: CPU): void {
        const addr = cpu.readUint16();

        debug("LD", { "(nn)": 2, "A": 0 }, { "(nn)": addr, "A": cpu.A }, cpu);

        cpu.MMU.writeUint8(addr, cpu.A);
    }

    @Opcode(0xF0)
    public static LDH_0xF0(cpu: CPU): void {
        const pos = 0xFF00 + cpu.readUint8();

        debug("LDH", { "A": 1, "(0xFF00 + n)": 0 }, { "(0xFF00 + n)": pos }, cpu);

        cpu.A = cpu.MMU.readUint8(pos);
    }

    @Opcode(0xFE)
    public static CP_0xFE(cpu: CPU): void {
        let val = cpu.readUint8();

        debug("CP", { "n": 1 }, { "n": val }, cpu);

        if (val === cpu.A) {
            cpu.enableFlag(Flags.ZeroFlag);
        } else {
            cpu.disableFlag(Flags.ZeroFlag);
        }

        cpu.enableFlag(Flags.AddSubFlag);
        // todo: H - Set if no borrow from bit 4. (??)

        if (cpu.A < val) {
            cpu.enableFlag(Flags.CarryFlag);
        } else {
            cpu.disableFlag(Flags.CarryFlag);
        }
    }
}

export class OpcodesCB {
    @Opcode(0x11, OpcodeType.CB)
    public static RL_0x11(cpu: CPU): void {
        debug("RL", { "C": 0 }, { "C": cpu.C }, cpu);

        cpu.machine_cycle();
        RL("C", true, cpu);
        cpu.machine_cycle();
    }

    @Opcode(0x7C, OpcodeType.CB)
    public static BIT_0x7C(cpu: CPU): void {
        debug("BIT", { "7": 0, "H": 0 }, { "H": cpu.H }, cpu);

        const value = cpu.H & 0b10000000;

        if (value === 0) {
            cpu.enableFlag(Flags.ZeroFlag);
        } else {
            cpu.disableFlag(Flags.ZeroFlag);
        }

        cpu.enableFlag(Flags.HalfCarryFlag);
        cpu.disableFlag(Flags.AddSubFlag);
    }
}