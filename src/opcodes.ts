import { CPU, Flags } from "./cpu";

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

const debug = (name: string, args: { [key: string]: number }, values: { [key: string]: number }, cpu: CPU): void => {
    let minus = 1;
    let tmp = [];

    for (let key in args) {
        minus += args[key];

        if (values[key] === undefined) {
            tmp.push(key);
        } else {
            let value = values[key].toString(16);

            while (value.length < 4) {
                value = "0" + value;
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
        while (registers[key].length < 4) {
            registers[key] = "0" + registers[key];
        }

        regs.push(`${key}=${registers[key]}`);
    }

    console.log(name, tmp.join(", "), "[" + regs.join(", ") + "]");
};

function XOR(num: number, cpu: CPU): void {
    cpu.A = cpu.A ^ num;
}

function RL(val: number, zeroCheck: boolean, cpu: CPU): number {
    const carry = cpu.isFlagSet(Flags.CarryFlag) ? 1 : 0;
    let result = val;

    if ((result & 0x80) != 0) {
        cpu.enableFlag(Flags.CarryFlag);
    } else {
        cpu.clearFlags();
    }

    result <<= 1;
    result |= carry;

    if (zeroCheck && result === 0) {
        cpu.enableFlag(Flags.ZeroFlag);
    }

    return result;
}

function DEC(val: number, cpu: CPU): number {
    val--;

    if (val === 0) {
        cpu.enableFlag(Flags.ZeroFlag);
    } else {
        cpu.disableFlag(Flags.ZeroFlag);
    }

    cpu.enableFlag(Flags.AddSubFlag);

    //todo: H: set if no borrow from bit 4 (??)
    return val;
}

export class Opcodes {
    @Opcode(0x00)
    public static NOP(cpu: CPU): void {
        // empty

        debug("NOP", {}, {}, cpu);
    }

    @Opcode(0x04)
    public static INC_0x04(cpu: CPU): void {
        debug("INC", { "B": 0 }, {}, cpu);

        cpu.C++;
    }

    @Opcode(0x05)
    public static DEC_0x05(cpu: CPU): void {
        debug("DEC", { "B": 0 }, {}, cpu);

        cpu.B = DEC(cpu.B, cpu);
    }

    @Opcode(0x06)
    public static LD_0x06(cpu: CPU): void {
        const val = cpu.readUint8();

        debug("LD", { "B": 0, "n": 1 }, { "n": val }, cpu);
        
        cpu.B = val;
    }

    @Opcode(0x0C)
    public static INC_0x0C(cpu: CPU): void {
        debug("INC", { "C": 0 }, {}, cpu);

        cpu.C++;
    }

    @Opcode(0x0D)
    public static DEC_0x0D(cpu: CPU): void {
        debug("DEC", { "C": 0 }, {}, cpu);

        cpu.C = DEC(cpu.C, cpu);
    }

    @Opcode(0x0E)
    public static LD_0x0E(cpu: CPU): void {
        const lo = cpu.readUint8();

        debug("LD", { "C": 0, "n": 1 }, { "n": lo }, cpu);

        cpu.C = lo;
    }

    @Opcode(0x11)
    public static LD_0x11(cpu: CPU): void {
        const lo = cpu.readUint8();
        const hi = cpu.readUint8();

        debug("LD", { "DE": 0, "nn": 2 }, { "nn": (hi << 8) | lo }, cpu);

        cpu.D = hi;
        cpu.E = lo;
    }

    @Opcode(0x13)
    public static INC_0x13(cpu: CPU): void {
        debug("INC", { "DE": 0 }, {}, cpu);

        cpu.DE++;
    }

    @Opcode(0x17)
    public static RLA_0x17(cpu: CPU): void {
        debug("RLA", {}, {}, cpu);

        cpu.A = RL(cpu.A, false, cpu);
    }

    @Opcode(0x18)
    public static JR_0x18(cpu: CPU): void {
        const relative = cpu.readInt8();

        debug("JR", { "n": 1 }, { "n": relative }, cpu);

        cpu.PC += relative;
    }

    @Opcode(0x1a)
    public static LD_0x1A(cpu: CPU): void {
        debug("LD", { "A": 0, "(DE)": 0 }, { "(DE)": cpu.DE }, cpu);

        cpu.A = cpu.MMU.readUint8(cpu.DE);
    }

    @Opcode(0x1E)
    public static LD_0x1E(cpu: CPU): void {
        const val = cpu.readUint8();

        debug("LD", { "E": 0, "n": 1 }, { "n": val }, cpu);

        cpu.E = val;
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
        debug("INC", { "HL": 0 }, {}, cpu);

        cpu.HL++;
    }

    @Opcode(0x28)
    public static JR_0x28(cpu: CPU): void {
        const relative = cpu.readInt8();

        debug("JR", { "Z": 0, "n": 1 }, { "n": relative }, cpu);

        if (cpu.isFlagSet(Flags.ZeroFlag)) {
            cpu.PC += relative;
        }
    }

    @Opcode(0x2E)
    public static LD_0x2E(cpu: CPU): void {
        const lo = cpu.readUint8();

        debug("LD", { "L": 0, "n": 1 }, { "n": lo }, cpu);

        cpu.L = lo;
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

    @Opcode(0x3D)
    public static DEC_0x3D(cpu: CPU): void {
        debug("DEC", { "A": 0 }, {}, cpu);

        cpu.A = DEC(cpu.A, cpu);
    }

    @Opcode(0x3E)
    public static LD_0x3E(cpu: CPU): void {
        const lo = cpu.readUint8();

        debug("LD", { "A": 0, "n": 1 }, { "n": lo }, cpu);

        cpu.A = lo;
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

    @Opcode(0x7B)
    public static LD_0x7B(cpu: CPU): void {
        debug("LD", { "A": 0, "E": 0 }, { "E": cpu.E }, cpu);

        cpu.A = cpu.E;
    }

    @Opcode(0x7C)
    public static LD_0x7C(cpu: CPU): void {
        debug("LD", { "A": 0, "H": 0 }, { "H": cpu.H }, cpu);

        cpu.A = cpu.H;
    }

    @Opcode(0xAF)
    public static XOR_0xAF(cpu: CPU): void {
        debug("XOR", { "A": 0 }, { "A": cpu.A }, cpu);

        XOR(cpu.A, cpu);
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
        let val = cpu.readInt8();

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

        cpu.C = RL(cpu.C, true, cpu);
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