import { CPU, Flags } from "./cpu";

enum OpcodeType {
    Default,
    CB
}

interface Descriptor extends PropertyDescriptor {
    value?: (cpu: CPU) => void;
}

export const _opcodes: { [key: number]: [number, (cpu: CPU) => void, string] } = {};
export const _cbopcodes: { [key: number]: [number, (cpu: CPU) => void, string] } = {};

export function Opcode(opcode: number, cycles: number, debug: string, type: OpcodeType = OpcodeType.Default) {
    return (target: any, property: string, descriptor: Descriptor) => {
        if (type === OpcodeType.Default) {
            _opcodes[opcode] = [cycles, descriptor.value, debug];
        } else {
            _cbopcodes[opcode] = [cycles, descriptor.value, debug];
        }
    };
}

function XOR(num: number, cpu: CPU): void {
    cpu.clearFlags();
    cpu.A = cpu.A ^ num;
}

function OR(num: number, cpu: CPU): void {
    cpu.clearFlags();
    cpu.A = cpu.A | num;
}

function AND(num: number | string, cpu: CPU): void {
    cpu.clearFlags();

    if (typeof num === "number") {
        cpu.A = cpu.A & num;
    } else {
        cpu.A = cpu.A & cpu[num];
    }

    cpu.enableFlag(Flags.HalfCarryFlag);
}

function RL(register: string, zeroCheck: boolean, cpu: CPU): void {
    const carry = cpu.isFlagSet(Flags.CarryFlag) ? 1 : 0;
    let result = cpu[register];

    cpu.clearFlags();

    if ((result & 0x80) != 0) {
        cpu.enableFlag(Flags.CarryFlag);
    }

    result <<= 1;

    result |= carry;

    if (!zeroCheck) {
        cpu.checkZero = false;
    }

    cpu[register] = result;

    if (!zeroCheck) {
        cpu.checkZero = true;
    }
}

function RR(register: string, zeroCheck: boolean, cpu: CPU): void {
    const carry = cpu.isFlagSet(Flags.CarryFlag) ? 1 : 0;
    let result = cpu[register];

    cpu.clearFlags();

    if ((result & 0x80) != 0) {
        cpu.enableFlag(Flags.CarryFlag);
    }

    result >>= 1;

    result |= carry;

    if (!zeroCheck) {
        cpu.checkZero = false;
    }

    cpu[register] = result;

    if (!zeroCheck) {
        cpu.checkZero = true;
    }
}

function INC(register: string, cpu: CPU): void {
    cpu.disableFlag(Flags.AddSubFlag);
    cpu.disableFlag(Flags.ZeroFlag);

    if (register === null) {
        let val = cpu.MMU.read8(cpu.HL);

        val++;

        if ((val & 0xFF) === 0) {
            cpu.enableFlag(Flags.ZeroFlag);
        }

        cpu.MMU.write8(cpu.HL, val);

        return;
    }

    cpu[register]++;

    // todo: H - Set if carry from bit 3.
}

function INC_16(register: string, cpu: CPU): void {
    cpu.checkZero = false;
    cpu[register]++;
    cpu.checkZero = true;
}

function DEC(register: string, cpu: CPU): void {
    cpu.enableFlag(Flags.AddSubFlag);
    cpu.disableFlag(Flags.ZeroFlag);

    if (register === null) {
        let val = cpu.MMU.read8(cpu.HL);

        val--;

        if ((val & 0xFF) === 0) {
            cpu.enableFlag(Flags.ZeroFlag);
        }

        cpu.MMU.write8(cpu.HL, val);

        return;
    }

    cpu[register]--;

    //todo: H: set if no borrow from bit 4 (??)
}

function DEC_16(register: string, cpu: CPU): void {
    cpu.checkZero = false;
    cpu[register]--;
    cpu.checkZero = true;
}

function LD_8(register: string, cpu: CPU): void {
    const val = cpu.readu8();

    cpu.checkZero = false;
    cpu[register] = val;
    cpu.checkZero = true;
}

function LD_8_r2_r1(r1: string, r2: string | number, cpu: CPU): void {
    if (r1 === null) {
        cpu.MMU.write8(cpu.HL, typeof r2 === "number" ? r2 : cpu[r2]);

        return;
    } else if (r2 === null) {
        let val = cpu.MMU.read8(cpu.HL);

        cpu.checkZero = false;
        cpu[r1] = val;
        cpu.checkZero = true;

        return;
    }

    cpu.checkZero = false;
    cpu[r1] = cpu[r2];
    cpu.checkZero = true;
}

function LD_16_r2_r1(r1: string, r2: string, cpu: CPU): void {
    cpu.checkZero = false;
    cpu[r1] = cpu[r2];
    cpu.checkZero = true;
}

function SUB(register: string | number, cpu: CPU): void {
    let val = 0;

    cpu.clearFlags();
    cpu.enableFlag(Flags.AddSubFlag);

    if (register === null) {
        let tmp = cpu.MMU.read8(cpu.HL);

        val = tmp;
    } else if (typeof register === "string") {
        val = cpu[register];
    } else {
        val = register as number;
    }

    if ((cpu.A - val) < 0) {
        cpu.enableFlag(Flags.CarryFlag);
    }

    cpu.A -= val;

    //todo: h flag
}

function ADD(register1: string, register2: string | number, cpu: CPU): void {
    cpu.disableFlag(Flags.HalfCarryFlag);
    cpu.disableFlag(Flags.CarryFlag);

    let val = 0;
    if (register2 === null) {
        val = cpu.MMU.read8(cpu.HL);
    } else if (typeof register2 === "string") {
        val = cpu[register2];
    } else {
        val = register2 as number;
    }

    if (((cpu[register1] + val) & 0x80) != 0) {
        cpu.enableFlag(Flags.CarryFlag);
    }

    cpu[register1] += val;

    // todo:   H - Set if carry from bit 3
}

function SRL(register: string, cpu: CPU): void {
    cpu.clearFlags();

    let result = cpu[register];

    if ((result & 0x01) != 0) {
        cpu.enableFlag(Flags.CarryFlag);
    }

    result >>= 1;

    cpu[register] = result;
}

function SWAP(register: string, cpu: CPU): void {
    cpu.clearFlags();
    cpu[register] = ((cpu[register] & 0x0F) << 4) | ((cpu[register] & 0xF0) >> 4);
}

export class Opcodes {
    @Opcode(0x00, 4, "NOP")
    public static NOP_0x00(cpu: CPU): void {
        // empty
    }

    @Opcode(0x01, 12, "LD BC,d16")
    public static LD_0x01(cpu: CPU): void {
        const val = cpu.readu16();

        cpu.checkZero = false;
        cpu.BC = val;
        cpu.checkZero = true;
    }

    @Opcode(0x02, 8, "LD (BC),A")
    public static LD_0x02(cpu: CPU): void {
        cpu.MMU.write8(cpu.BC, cpu.A);
    }

    @Opcode(0x03, 8, "INC BC")
    public static INC_0x03(cpu: CPU): void {
        INC_16("BC", cpu);
    }

    @Opcode(0x04, 4, "INC B")
    public static INC_0x04(cpu: CPU): void {
        INC("B", cpu);
    }

    @Opcode(0x05, 4, "DEC B")
    public static DEC_0x05(cpu: CPU): void {
        DEC("B", cpu);
    }

    @Opcode(0x06, 8, "LD B,d8")
    public static LD_0x06(cpu: CPU): void {
        LD_8("B", cpu);
    }

    @Opcode(0x08, 20, "LD (a16),SP")
    public static LD_0x08(cpu: CPU): void {
        const addr = cpu.readu16();

        cpu.MMU.write8(addr + 0, cpu.SP >> 8);
        cpu.MMU.write8(addr + 1, cpu.SP & 0xFF);
    }

    @Opcode(0x09, 8, "ADD HL,BC")
    public static ADD_0x09(cpu: CPU): void {
        cpu.checkZero = false;
        ADD("HL", "BC", cpu);
        cpu.checkZero = true;
    }

    @Opcode(0x0A, 8, "LD A,(BC)")
    public static LD_0x0A(cpu: CPU): void {
        cpu.checkZero = false;
        cpu.A = cpu.MMU.read8(cpu.BC);
        cpu.checkZero = true;
    }

    @Opcode(0x0B, 8, "DEC BC")
    public static DEC_0x0B(cpu: CPU): void {
        DEC_16("BC", cpu);
    }

    @Opcode(0x0C, 4, "INC C")
    public static INC_0x0C(cpu: CPU): void {
        INC("C", cpu);
    }

    @Opcode(0x0D, 4, "DEC C")
    public static DEC_0x0D(cpu: CPU): void {
        DEC("C", cpu);
    }

    @Opcode(0x0E, 8, "LD C,d8")
    public static LD_0x0E(cpu: CPU): void {
        LD_8("C", cpu);
    }

    @Opcode(0x10, 4, "STOP 0")
    public static STOP_0x10(cpu: CPU): void {
        // todo
    }

    @Opcode(0x11, 12, "LD DE,d16")
    public static LD_0x11(cpu: CPU): void {
        const val = cpu.readu16();

        cpu.checkZero = false;
        cpu.DE = val;
        cpu.checkZero = true;
    }

    @Opcode(0x12, 8, "LD (DE),A")
    public static LD_0x12(cpu: CPU): void {
        cpu.MMU.write8(cpu.DE, cpu.A);
    }

    @Opcode(0x13, 8, "INC DE")
    public static INC_0x13(cpu: CPU): void {
        INC_16("DE", cpu);
    }

    @Opcode(0x14, 4, "INC D")
    public static INC_0x14(cpu: CPU): void {
        INC("D", cpu);
    }

    @Opcode(0x15, 4, "DEC D")
    public static DEC_0x15(cpu: CPU): void {
        DEC("D", cpu);
    }

    @Opcode(0x16, 8, "LD D,d8")
    public static LD_0x16(cpu: CPU): void {
        LD_8("D", cpu);
    }

    @Opcode(0x17, 4, "RLA")
    public static RLA_0x17(cpu: CPU): void {
        RL("A", false, cpu);
    }

    @Opcode(0x18, 8, "JR r8")
    public static JR_0x18(cpu: CPU): void {
        const relative = cpu.reads8();

        cpu.PC += relative;
    }

    @Opcode(0x19, 8, "ADD HL,DE")
    public static ADD_0x19(cpu: CPU): void {
        cpu.checkZero = false;
        ADD("HL", "DE", cpu);
        cpu.checkZero = true;
    }

    @Opcode(0x1A, 8, "LD A,(DE)")
    public static LD_0x1A(cpu: CPU): void {
        cpu.checkZero = false;
        cpu.A = cpu.MMU.read8(cpu.DE);
        cpu.checkZero = true;
    }

    @Opcode(0x1C, 4, "INC E")
    public static INC_0x1C(cpu: CPU): void {
        INC("E", cpu);
    }

    @Opcode(0x1D, 4, "DEC E")
    public static DEC_0x1D(cpu: CPU): void {
        DEC("E", cpu);
    }

    @Opcode(0x1E, 8, "LD E,d8")
    public static LD_0x1E(cpu: CPU): void {
        LD_8("E", cpu);
    }

    @Opcode(0x1F, 4, "RRA")
    public static RRA_0x1F(cpu: CPU): void {
        RR("A", false, cpu);
    }

    @Opcode(0x20, 8, "JR NZ,r8")
    public static JR_0x20(cpu: CPU): void {
        const relative = cpu.reads8();

        if (!cpu.isFlagSet(Flags.ZeroFlag)) {
            cpu.PC += relative;
        }
    }

    @Opcode(0x21, 12, "LD HL,d16")
    public static LD_0x21(cpu: CPU): void {
        const val = cpu.readu16();

        cpu.checkZero = false;
        cpu.HL = val;
        cpu.checkZero = true;
    }

    @Opcode(0x22, 8, "LD (HL+),A")
    public static LD_0x22(cpu: CPU): void {
        cpu.checkZero = false;
        cpu.MMU.write8(cpu.HL, cpu.A);
        cpu.HL++;
        cpu.checkZero = true;
    }

    @Opcode(0x23, 8, "INC HL")
    public static INC_0x23(cpu: CPU): void {
        INC_16("HL", cpu);
    }

    @Opcode(0x24, 4, "INC H")
    public static INC_0x24(cpu: CPU): void {
        INC("H", cpu);
    }

    @Opcode(0x25, 4, "DEC H")
    public static DEC_0x25(cpu: CPU): void {
        DEC("H", cpu);
    }

    @Opcode(0x26, 8, "LD H,d8")
    public static LD_0x26(cpu: CPU): void {
        LD_8("H", cpu);
    }

    @Opcode(0x28, 8, "JR Z,r8")
    public static JR_0x28(cpu: CPU): void {
        const relative = cpu.reads8();

        if (cpu.isFlagSet(Flags.ZeroFlag)) {
            cpu.PC += relative;
        }
    }

    @Opcode(0x29, 8, "ADD HL,HL")
    public static ADD_0x29(cpu: CPU): void {
        cpu.checkZero = false;
        ADD("HL", "HL", cpu);
        cpu.checkZero = true;
    }

    @Opcode(0x2A, 8, "LD A,(HL+)")
    public static LD_0x2A(cpu: CPU): void {
        cpu.checkZero = false;
        cpu.A = cpu.MMU.read8(cpu.HL);
        cpu.HL++;
        cpu.checkZero = true;
    }

    @Opcode(0x2C, 4, "INC L")
    public static INC_0x2C(cpu: CPU): void {
        INC("L", cpu);
    }

    @Opcode(0x2D, 4, "DEC L")
    public static DEC_0x2D(cpu: CPU): void {
        DEC("L", cpu);
    }

    @Opcode(0x2E, 8, "LD L,d8")
    public static LD_0x2E(cpu: CPU): void {
        LD_8("L", cpu);
    }

    @Opcode(0x2F, 4, "CPL")
    public static CPL_0x2F(cpu: CPU): void {
        cpu.checkZero = false;
        cpu.A = ~cpu.A;
        cpu.checkZero = true;

        cpu.enableFlag(Flags.HalfCarryFlag);
        cpu.enableFlag(Flags.AddSubFlag);
    }

    @Opcode(0x30, 8, "JR NC,r8")
    public static JR_0x30(cpu: CPU): void {
        const relative = cpu.reads8();

        if (!cpu.isFlagSet(Flags.CarryFlag)) {
            cpu.PC += relative;
        }
    }

    @Opcode(0x31, 12, "LD SP,d16")
    public static LD_0x31(cpu: CPU): void {
        const val = cpu.readu16();

        cpu.SP = val;
    }

    @Opcode(0x32, 8, "LD (HL-),A")
    public static LD_0x32(cpu: CPU): void {
        cpu.MMU.write8(cpu.HL, cpu.A);

        cpu.checkZero = false;
        cpu.HL--;
        cpu.checkZero = true;
    }

    @Opcode(0x34, 12, "INC (HL)")
    public static INC_0x34(cpu: CPU): void {
        INC(null, cpu);
    }

    @Opcode(0x35, 12, "DEC (HL)")
    public static DEC_0x35(cpu: CPU): void {
        DEC(null, cpu);
    }

    @Opcode(0x36, 12, "LD (HL),d8")
    public static LD_0x36(cpu: CPU): void {
        const val = cpu.readu8();

        LD_8_r2_r1(null, val, cpu);
    }

    @Opcode(0x38, 8, "JR C,r8")
    public static JR_0x38(cpu: CPU): void {
        const relative = cpu.reads8();

        if (cpu.isFlagSet(Flags.CarryFlag)) {
            cpu.PC += relative;
        }
    }

    @Opcode(0x39, 8, "ADD HL,SP")
    public static ADD_0x39(cpu: CPU): void {
        cpu.checkZero = false;
        ADD("HL", "SP", cpu);
        cpu.checkZero = true;
    }

    @Opcode(0x3C, 4, "INC A")
    public static INC_0x3C(cpu: CPU): void {
        INC("A", cpu);
    }

    @Opcode(0x3D, 4, "DEC A")
    public static DEC_0x3D(cpu: CPU): void {
        DEC("A", cpu);
    }

    @Opcode(0x3E, 8, "LD A,d8")
    public static LD_0x3E(cpu: CPU): void {
        const lo = cpu.readu8();

        cpu.checkZero = false;
        cpu.A = lo;
        cpu.checkZero = true;
    }

    @Opcode(0x40, 4, "LD B,B")
    public static LD_0x40(cpu: CPU): void {
        LD_8_r2_r1("B", "B", cpu);
    }

    @Opcode(0x41, 4, "LD B,C")
    public static LD_0x41(cpu: CPU): void {
        LD_8_r2_r1("B", "C", cpu);
    }

    @Opcode(0x42, 4, "LD B,D")
    public static LD_0x42(cpu: CPU): void {
        LD_8_r2_r1("B", "D", cpu);
    }

    @Opcode(0x43, 4, "LD B,E")
    public static LD_0x43(cpu: CPU): void {
        LD_8_r2_r1("B", "E", cpu);
    }

    @Opcode(0x44, 4, "LD B,H")
    public static LD_0x44(cpu: CPU): void {
        LD_8_r2_r1("B", "H", cpu);
    }

    @Opcode(0x45, 4, "LD B,L")
    public static LD_0x45(cpu: CPU): void {
        LD_8_r2_r1("B", "L", cpu);
    }

    @Opcode(0x46, 8, "LD B,(HL)")
    public static LD_0x46(cpu: CPU): void {
        LD_8_r2_r1("B", null, cpu);
    }

    @Opcode(0x47, 4, "LD B,A")
    public static LD_0x47(cpu: CPU): void {
        LD_8_r2_r1("B", "A", cpu);
    }

    @Opcode(0x4D, 4, "LD C,L")
    public static LD_0x4D(cpu: CPU): void {
        LD_8_r2_r1("C", "L", cpu);
    }

    @Opcode(0x4E, 8, "LD C,(HL)")
    public static LD_0x4E(cpu: CPU): void {
        LD_8_r2_r1("C", null, cpu);
    }

    @Opcode(0x4F, 4, "LD C,A")
    public static LD_0x4F(cpu: CPU): void {
        LD_8_r2_r1("C", "A", cpu);
    }

    @Opcode(0x50, 4, "LD D,B")
    public static LD_0x50(cpu: CPU): void {
        LD_8_r2_r1("D", "B", cpu);
    }

    @Opcode(0x56, 8, "LD D,(HL)")
    public static LD_0x56(cpu: CPU): void {
        LD_8_r2_r1("D", null, cpu);
    }

    @Opcode(0x57, 4, "LD D,A")
    public static LD_0x57(cpu: CPU): void {
        LD_8_r2_r1("D", "A", cpu);
    }

    @Opcode(0x5E, 8, "LD E,(HL)")
    public static LD_0x5E(cpu: CPU): void {
        LD_8_r2_r1("E", null, cpu);
    }

    @Opcode(0x5F, 4, "LD E,A")
    public static LD_0x5F(cpu: CPU): void {
        LD_8_r2_r1("E", "A", cpu);
    }

    @Opcode(0x60, 4, "LD H,B")
    public static LD_0x60(cpu: CPU): void {
        LD_8_r2_r1("H", "B", cpu);
    }

    @Opcode(0x67, 4, "LD H,A")
    public static LD_0x67(cpu: CPU): void {
        LD_8_r2_r1("H", "A", cpu);
    }

    @Opcode(0x6E, 8, "LD L,(HL)")
    public static LD_0x6E(cpu: CPU): void {
        LD_8_r2_r1("L", null, cpu);
    }

    @Opcode(0x6F, 4, "LD L,A")
    public static LD_0x6F(cpu: CPU): void {
        LD_8_r2_r1("L", "A", cpu);
    }

    @Opcode(0x70, 8, "LD (HL),B")
    public static LD_0x70(cpu: CPU): void {
        LD_8_r2_r1(null, "B", cpu);
    }

    @Opcode(0x71, 8, "LD (HL),C")
    public static LD_0x71(cpu: CPU): void {
        LD_8_r2_r1(null, "C", cpu);
    }

    @Opcode(0x72, 8, "LD (HL),D")
    public static LD_0x72(cpu: CPU): void {
        LD_8_r2_r1(null, "D", cpu);
    }

    @Opcode(0x77, 8, "LD (HL),A")
    public static LD_0x77(cpu: CPU): void {
        LD_8_r2_r1(null, "A", cpu);
    }

    @Opcode(0x78, 4, "LD A,B")
    public static LD_0x78(cpu: CPU): void {
        LD_8_r2_r1("A", "B", cpu);
    }

    @Opcode(0x79, 4, "LD A,C")
    public static LD_0x79(cpu: CPU): void {
        LD_8_r2_r1("A", "C", cpu);
    }

    @Opcode(0x7A, 4, "LD A,D")
    public static LD_0x7A(cpu: CPU): void {
        LD_8_r2_r1("A", "D", cpu);
    }

    @Opcode(0x7B, 4, "LD A,E")
    public static LD_0x7B(cpu: CPU): void {
        LD_8_r2_r1("A", "E", cpu);
    }

    @Opcode(0x7C, 4, "LD A,H")
    public static LD_0x7C(cpu: CPU): void {
        LD_8_r2_r1("A", "H", cpu);
    }

    @Opcode(0x7D, 4, "LD A,L")
    public static LD_0x7D(cpu: CPU): void {
        LD_8_r2_r1("A", "L", cpu);
    }

    @Opcode(0x7E, 8, "LD A,(HL)")
    public static LD_0x7E(cpu: CPU): void {
        LD_8_r2_r1("A", null, cpu);
    }

    @Opcode(0x7F, 4, "LD A,A")
    public static LD_0x7F(cpu: CPU): void {
        LD_8_r2_r1("A", "A", cpu);
    }

    @Opcode(0x81, 4, "ADD A,C")
    public static ADD_0x81(cpu: CPU): void {
        ADD("A", "C", cpu);
    }

    @Opcode(0x86, 8, "ADD A,(HL)")
    public static ADD_0x86(cpu: CPU): void {
        ADD("A", null, cpu);
    }

    @Opcode(0x87, 4, "ADD A,A")
    public static ADD_0x87(cpu: CPU): void {
        ADD("A", "A", cpu);
    }

    @Opcode(0x90, 4, "SUB B")
    public static SUB_0x90(cpu: CPU): void {
        SUB("B", cpu);
    }

    @Opcode(0x91, 4, "SUB C")
    public static SUB_0x91(cpu: CPU): void {
        SUB("C", cpu);
    }

    @Opcode(0x92, 4, "SUB D")
    public static SUB_0x92(cpu: CPU): void {
        SUB("D", cpu);
    }

    @Opcode(0x93, 4, "SUB E")
    public static SUB_0x93(cpu: CPU): void {
        SUB("E", cpu);
    }

    @Opcode(0x94, 4, "SUB H")
    public static SUB_0x94(cpu: CPU): void {
        SUB("H", cpu);
    }

    @Opcode(0x95, 4, "SUB L")
    public static SUB_0x95(cpu: CPU): void {
        SUB("L", cpu);
    }

    @Opcode(0x96, 8, "SUB (HL)")
    public static SUB_0x96(cpu: CPU): void {
        SUB(null, cpu);
    }

    @Opcode(0x97, 4, "SUB A")
    public static SUB_0x97(cpu: CPU): void {
        SUB("A", cpu);
    }

    @Opcode(0xA1, 4, "AND C")
    public static AND_0xA1(cpu: CPU): void {
        AND("C", cpu);
    }

    @Opcode(0xA9, 4, "XOR C")
    public static XOR_0xA9(cpu: CPU): void {
        XOR(cpu.C, cpu);
    }

    @Opcode(0xAE, 8, "XOR (HL)")
    public static XOR_0xAE(cpu: CPU): void {
        const val = cpu.MMU.read8(cpu.HL);

        XOR(val, cpu);
    }

    @Opcode(0xAF, 4, "XOR A")
    public static XOR_0xAF(cpu: CPU): void {
        XOR(cpu.A, cpu);
    }

    @Opcode(0xB0, 4, "OR B")
    public static OR_0xB0(cpu: CPU): void {
        OR(cpu.B, cpu);
    }

    @Opcode(0xB1, 4, "OR C")
    public static OR_0xB1(cpu: CPU): void {
        OR(cpu.C, cpu);
    }

    @Opcode(0xB2, 4, "OR D")
    public static OR_0xB2(cpu: CPU): void {
        OR(cpu.D, cpu);
    }

    @Opcode(0xB3, 4, "OR E")
    public static OR_0xB3(cpu: CPU): void {
        OR(cpu.E, cpu);
    }

    @Opcode(0xB4, 4, "OR H")
    public static OR_0xB4(cpu: CPU): void {
        OR(cpu.H, cpu);
    }

    @Opcode(0xB5, 4, "OR L")
    public static OR_0xB5(cpu: CPU): void {
        OR(cpu.L, cpu);
    }

    @Opcode(0xB6, 8, "OR (HL)")
    public static OR_0xB6(cpu: CPU): void {
        OR(cpu.MMU.read8(cpu.HL), cpu);
    }

    @Opcode(0xB7, 4, "OR A")
    public static OR_0xB7(cpu: CPU): void {
        OR(cpu.A, cpu);
    }

    @Opcode(0xBE, 8, "CP (HL)")
    public static CP_0xBE(cpu: CPU): void {
        cpu.clearFlags();
        cpu.enableFlag(Flags.AddSubFlag);

        let val = cpu.MMU.read8(cpu.HL);

        if (val === cpu.A) {
            cpu.enableFlag(Flags.ZeroFlag);
        }

        // todo: H - Set if no borrow from bit 4. (??)

        if (cpu.A < val) {
            cpu.enableFlag(Flags.CarryFlag);
        }
    }

    @Opcode(0xC0, 8, "RET NZ")
    public static RET_0xC0(cpu: CPU): void {
        if (!cpu.isFlagSet(Flags.ZeroFlag)) {
            cpu.debug.funcRet(cpu.PC - 1);
            cpu.PC = cpu.popStack();
        }
    }

    @Opcode(0xC1, 12, "POP BC")
    public static POP_0xC1(cpu: CPU): void {
        cpu.checkZero = false;
        cpu.BC = cpu.popStack();
        cpu.checkZero = true;
    }

    @Opcode(0xC2, 12, "JP NZ,a16")
    public static JP_0xC2(cpu: CPU): void {
        const addr = cpu.readu16();

        if (!cpu.isFlagSet(Flags.ZeroFlag)) {
            cpu.PC = addr;
        }
    }

    @Opcode(0xC3, 12, "JP a16")
    public static JP_0xC3(cpu: CPU): void {
        const addr = cpu.readu16();

        cpu.PC = addr;
    }

    @Opcode(0xC4, 12, "CALL NZ,a16")
    public static CALL_0xC4(cpu: CPU): void {
        const addr = cpu.readu16();

        if (!cpu.isFlagSet(Flags.ZeroFlag)) {
            cpu.pushStack(cpu.PC);
            cpu.PC = addr;
            cpu.debug.func(addr);
        } else {
            cpu.debug.func(addr, false);
        }
    }

    @Opcode(0xC5, 16, "PUSH BC")
    public static PUSH_0xC5(cpu: CPU): void {
        cpu.pushStack(cpu.BC);
    }

    @Opcode(0xC6, 8, "ADD A,d8")
    public static ADD_0xC6(cpu: CPU): void {
        ADD("A", cpu.readu8(), cpu);
    }

    @Opcode(0xC8, 8, "RET Z")
    public static RET_0xC8(cpu: CPU): void {
        if (cpu.isFlagSet(Flags.ZeroFlag)) {
            cpu.debug.funcRet(cpu.PC - 1);
            cpu.PC = cpu.popStack();
        }
    }

    @Opcode(0xC9, 8, "RET")
    public static RET_0xC9(cpu: CPU): void {
        cpu.debug.funcRet(cpu.PC - 1);
        cpu.PC = cpu.popStack();

        if (cpu.PC >= 0x3000 && cpu.PC <= 0x3FFF) {
            console.log("BREAK");
        }
    }

    @Opcode(0xCD, 12, "CALL a16")
    public static CALL_0xCD(cpu: CPU): void {
        const addr = cpu.readu16();

        cpu.pushStack(cpu.PC);
        cpu.PC = addr;

        cpu.debug.func(addr);
    }

    @Opcode(0xCE, 8, "ADC #")
    public static ADC_0xCE(cpu: CPU): void {
        cpu.clearFlags();
        
        let number = cpu.readu8();

        let carry = cpu.isFlagSet(Flags.CarryFlag) ? 1 : 0;
        let val = cpu.A + number + carry;

        if (val > 0xFF) {
            cpu.enableFlag(Flags.CarryFlag);
        }

        if (((cpu.A & 0x0F) + (number & 0x0F) + carry) > 0x0F) {
            cpu.enableFlag(Flags.HalfCarryFlag);
        }

        cpu.A = val;
    }

    @Opcode(0xD0, 8, "RET NC")
    public static RET_0xD0(cpu: CPU): void {
        if (!cpu.isFlagSet(Flags.CarryFlag)) {
            cpu.debug.funcRet(cpu.PC - 1);
            cpu.PC = cpu.popStack();
        }
    }

    @Opcode(0xD1, 12, "POP DE")
    public static POP_0xD1(cpu: CPU): void {
        cpu.checkZero = false;
        cpu.DE = cpu.popStack();
        cpu.checkZero = true;
    }

    @Opcode(0xD2, 12, "JP NC,a16")
    public static JP_0xD2(cpu: CPU): void {
        const addr = cpu.readu16();

        if (!cpu.isFlagSet(Flags.CarryFlag)) {
            cpu.PC = addr;
        }
    }

    @Opcode(0xD5, 16, "PUSH DE")
    public static PUSH_0xD5(cpu: CPU): void {
        cpu.pushStack(cpu.DE);
    }

    @Opcode(0xD6, 8, "SUB d8")
    public static SUB_0xD6(cpu: CPU): void {
        SUB(cpu.readu8(), cpu);
    }

    @Opcode(0xD8, 8, "RET C")
    public static RET_0xD8(cpu: CPU): void {
        if (cpu.isFlagSet(Flags.CarryFlag)) {
            cpu.debug.funcRet(cpu.PC - 1);
            cpu.PC = cpu.popStack();
        }
    }

    @Opcode(0xE0, 12, "LDH (a8),A")
    public static LDH_0xE0(cpu: CPU): void {
        const pos = 0xFF00 + cpu.readu8();

        cpu.MMU.write8(pos, cpu.A);
    }

    @Opcode(0xE1, 12, "POP HL")
    public static POP_0xE1(cpu: CPU): void {
        cpu.checkZero = false;
        cpu.HL = cpu.popStack();
        cpu.checkZero = true;
    }

    @Opcode(0xE2, 8, "LD (C),A")
    public static LD_0xE2(cpu: CPU): void {
        cpu.MMU.write8(0xFF00 + cpu.C, cpu.A);
    }

    @Opcode(0xE5, 16, "PUSH HL")
    public static PUSH_0xE5(cpu: CPU): void {
        cpu.pushStack(cpu.HL);
    }

    @Opcode(0xE6, 8, "AND d8")
    public static AND_0xE6(cpu: CPU): void {
        const val = cpu.readu8();

        AND(val, cpu);
    }

    @Opcode(0xE9, 4, "JP (HL)")
    public static JP_0xE9(cpu: CPU): void {
        const addr = cpu.MMU.read8(cpu.HL);

        cpu.PC = addr;
    }

    @Opcode(0xEA, 16, "LD (a16),A")
    public static LD_0xEA(cpu: CPU): void {
        const addr = cpu.readu16();

        cpu.MMU.write8(addr, cpu.A);
    }

    @Opcode(0xEE, 8, "XOR d8")
    public static XOR_0xEE(cpu: CPU): void {
        const val = cpu.readu8();

        XOR(val, cpu);
    }

    @Opcode(0xEF, 32, "RST 28H")
    public static RST_0xEF(cpu: CPU): void {
        const n = 0x0028;

        cpu.pushStack(cpu.PC);
        cpu.PC = n;
    }

    @Opcode(0xF0, 12, "LDH A,(a8)")
    public static LDH_0xF0(cpu: CPU): void {
        const pos = 0xFF00 + cpu.readu8();

        cpu.checkZero = false;
        cpu.A = cpu.MMU.read8(pos);
        cpu.checkZero = true;
    }

    @Opcode(0xF1, 12, "POP AF")
    public static POP_0xF1(cpu: CPU): void {
        cpu.checkZero = false;
        cpu.AF = cpu.popStack();
        cpu.checkZero = true;
    }

    @Opcode(0xF3, 4, "DI")
    public static DI_0xF3(cpu: CPU): void {
        cpu.enableInterrupts = false;
    }

    @Opcode(0xF5, 16, "PUSH AF")
    public static PUSH_0xF5(cpu: CPU): void {
        cpu.pushStack(cpu.AF);
    }

    @Opcode(0xF6, 8, "OR d8")
    public static OR_0xF6(cpu: CPU): void {
        OR(cpu.readu8(), cpu);
    }

    @Opcode(0xF9, 8, "LD SP,HL")
    public static LD_0xF9(cpu: CPU): void {
        LD_16_r2_r1("SP", "HL", cpu);
    }

    @Opcode(0xFA, 16, "LD A,(a16)")
    public static LD_0xFA(cpu: CPU): void {
        const addr = cpu.readu16();

        cpu.checkZero = false;
        cpu.A = cpu.MMU.read8(addr);
        cpu.checkZero = true;
    }

    @Opcode(0xFB, 4, "EI")
    public static EI_0xFB(cpu: CPU): void {
        cpu.enableInterrupts = true;
    }

    @Opcode(0xFE, 8, "CP d8")
    public static CP_0xFE(cpu: CPU): void {
        cpu.clearFlags();
        cpu.enableFlag(Flags.AddSubFlag);

        let val = cpu.readu8();

        if (val === cpu.A) {
            cpu.enableFlag(Flags.ZeroFlag);
        }

        // todo: H - Set if no borrow from bit 4. (??)

        if (cpu.A < val) {
            cpu.enableFlag(Flags.CarryFlag);
        }
    }

    @Opcode(0xFF, 32, "RST 38H")
    public static RST_0xFF(cpu: CPU): void {
        const n = 0x0038;

        cpu.pushStack(cpu.PC);
        cpu.PC = n;
    }
}

export class OpcodesCB {
    @Opcode(0x11, 8, "CB RL C", OpcodeType.CB)
    public static RL_0x11(cpu: CPU): void {
        RL("C", true, cpu);
    }

    @Opcode(0x19, 8, "CB RR C", OpcodeType.CB)
    public static RR_0x19(cpu: CPU): void {
        RR("C", true, cpu);
    }

    @Opcode(0x1A, 8, "CB RR D", OpcodeType.CB)
    public static RR_0x1A(cpu: CPU): void {
        RR("D", true, cpu);
    }

    @Opcode(0x37, 8, "SWAP A", OpcodeType.CB)
    public static SWAP_0x37(cpu: CPU): void {
        SWAP("A", cpu);
    }

    @Opcode(0x38, 8, "CB SRL B", OpcodeType.CB)
    public static SRL_0x38(cpu: CPU): void {
        SRL("B", cpu);
    }

    @Opcode(0x3F, 8, "CB SRL A", OpcodeType.CB)
    public static SRL_0x3F(cpu: CPU): void {
        SRL("A", cpu);
    }

    @Opcode(0x7C, 8, "CB BIT 7,H", OpcodeType.CB)
    public static BIT_0x7C(cpu: CPU): void {
        const value = cpu.H & 0b10000000;

        if (value === 0) {
            cpu.enableFlag(Flags.ZeroFlag);
        }

        cpu.enableFlag(Flags.HalfCarryFlag);
        cpu.disableFlag(Flags.AddSubFlag);
    }
}