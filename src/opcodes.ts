import { CPU, Flags } from "./cpu";

enum OpcodeType {
    Default,
    CB
}

interface Descriptor extends PropertyDescriptor {
    value?: (code: number, cpu: CPU) => void;
}

export const _opcodes: { [key: number]: [number, (code: number, cpu: CPU) => void, string] } = {};
export const _cbopcodes: { [key: number]: [number, (code: number, cpu: CPU) => void, string] } = {};

export function Opcode(opcode: number, cycles: number, debug: string, type: OpcodeType = OpcodeType.Default) {
    return (target: any, property: string, descriptor: Descriptor) => {
        if (type === OpcodeType.Default) {
            _opcodes[opcode] = [cycles, descriptor.value, debug];
        } else {
            _cbopcodes[opcode] = [cycles, descriptor.value, debug];
        }
    };
}

function getCarryBits(base: number, add: number, result: number): number {
    return base ^ add ^ result;
}

function checkCarry(carrybits: number): boolean {
    return (carrybits & 0x100) != 0;
}

function checkHalfCarry(carrybits: number): boolean {
    return (carrybits & 0x10) != 0;
}

function toggleZeroFlag(cpu: CPU, result: number): void {
    if ((result & 0xFF) === 0) {
        cpu.enableFlag(Flags.ZeroFlag);
    } else {
        cpu.disableFlag(Flags.ZeroFlag);
    }
}

function SUB(register: string | number, useCarry: boolean, cpu: CPU): void {
    let val = 0;

    cpu.enableFlag(Flags.AddSubFlag);

    if (register === null) {
        let tmp = cpu.MMU.read8(cpu.HL);

        val = tmp;
    } else if (typeof register === "string") {
        val = cpu[register];
    } else {
        val = register as number;
    }

    let extra = (useCarry && cpu.isFlagSet(Flags.CarryFlag)) ? 1 : 0;
    let result = cpu.A - val - extra;

    if (result < 0) {
        cpu.enableFlag(Flags.CarryFlag);
    } else {
        cpu.disableFlag(Flags.CarryFlag);
    }

    if ((cpu.A & 0xF) - (val & 0xF) - extra < 0) {
        cpu.enableFlag(Flags.HalfCarryFlag);
    } else {
        cpu.disableFlag(Flags.HalfCarryFlag);
    }

    cpu.A = result;
    toggleZeroFlag(cpu, result);
}

function ADD_16(register1: string, register2: string | number, cpu: CPU): void {
    cpu.clearFlags();
    
    let val = 0;
    if (typeof register2 === "string") {
        val = cpu[register2];
    } else {
        val = register2 as number;
    }

    const result = cpu[register1] + val;

    if (((cpu[register1] ^ val ^ (result & 0xFFFF)) & 0x100) == 0x100) {
        cpu.enableFlag(Flags.CarryFlag);
    }

    if (((cpu[register1] ^ val ^ (result & 0xFFFF)) & 0x10) == 0x10) {
        cpu.enableFlag(Flags.HalfCarryFlag);
    }

    cpu[register1] = result;
}

function ADD(register: string | number, addCarry: boolean, cpu: CPU): void {
    let val = 0;
    if (register === null) {
        val = cpu.MMU.read8(cpu.HL);
    } else if (typeof register === "string") {
        val = cpu[register];
    } else {
        val = register as number;
    }

    let extra = (addCarry && cpu.isFlagSet(Flags.CarryFlag)) ? 1 : 0;
    let result = cpu.A + val + extra;

    if (result > 0xFF) {
        cpu.enableFlag(Flags.CarryFlag);
    } else {
        cpu.disableFlag(Flags.CarryFlag);
    }

    if ((cpu.A & 0xF) + (val & 0xF) + extra > 0xF) {
        cpu.enableFlag(Flags.HalfCarryFlag);
    } else {
        cpu.disableFlag(Flags.HalfCarryFlag);
    }

    cpu.A = result;
    toggleZeroFlag(cpu, result);

    cpu.disableFlag(Flags.AddSubFlag);
}

function SRL(register: string|null, cpu: CPU): void {
    cpu.clearFlags();

    let result = 0;

    if (register === null) {
        result = cpu.MMU.read8(cpu.HL);
    } else {
        result = cpu[register];
    }

    if ((result & 0x01) != 0) {
        cpu.enableFlag(Flags.CarryFlag);
    }

    result >>= 1;

    if (register === null) {
        cpu.MMU.write8(cpu.HL, result);
    } else {
        cpu[register] = result;
    }
    
    toggleZeroFlag(cpu, result);
}

function SWAP(register: string|null, cpu: CPU): void {
    cpu.clearFlags();

    let result = 0;
    if (register === null) {
        let value = cpu.MMU.read8(cpu.HL);
        result = ((value & 0x0F) << 4) | ((value & 0xF0) >> 4);

        cpu.MMU.write8(cpu.HL, result);
    } else {
        result = ((cpu[register] & 0x0F) << 4) | ((cpu[register] & 0xF0) >> 4);
        cpu[register] = result;
    }

    toggleZeroFlag(cpu, result);
}

function BIT(register: string | null, bit: number, cpu: CPU): void {
    let value = 0;
    
    if (register === null) {
        value = cpu.MMU.read8(cpu.HL);
    } else {
        value = cpu[register];
    }

    toggleZeroFlag(cpu, ((value >> bit) & 0x01));
    cpu.enableFlag(Flags.HalfCarryFlag);
    cpu.disableFlag(Flags.AddSubFlag);
}

function CP(val: number, cpu: CPU): void {
    cpu.clearFlags();
    cpu.enableFlag(Flags.AddSubFlag);

    if (val === cpu.A) {
        cpu.enableFlag(Flags.ZeroFlag);
    }

    if (cpu.A < val) {
        cpu.enableFlag(Flags.CarryFlag);
    }

    if (((cpu.A - val) & 0xF) > (cpu.A & 0xF)) {
        cpu.enableFlag(Flags.HalfCarryFlag);
    }
}
export class Opcodes {
    @Opcode(0x00, 4, "NOP")
    public static NOP_0x00(opcode: number, cpu: CPU): void {
        // empty
    }

    @Opcode(0x01, 12, "LD BC,d16")
    @Opcode(0x11, 12, "LD DE,d16")
    @Opcode(0x21, 12, "LD HL,d16")
    @Opcode(0x31, 12, "LD SP,d16")
    public static LD_0x01x11x21x31(opcode: number, cpu: CPU): void {
        const val = cpu.readu16();
        const register = cpu.readRegisterType(opcode >> 4, false);

        cpu[register] = val;
    }

    @Opcode(0x02, 8, "LD (BC),A")
    public static LD_0x02(opcode: number, cpu: CPU): void {
        cpu.MMU.write8(cpu.BC, cpu.A);
    }

    @Opcode(0x03, 8, "INC BC")
    @Opcode(0x13, 8, "INC DE")
    @Opcode(0x23, 8, "INC HL")
    @Opcode(0x33, 8, "INC SP")
    public static INC_0x03x13x23x33(opcode: number, cpu: CPU): void {
        const register = cpu.readRegisterType(opcode >> 4, false);

        cpu[register]++;
    }

    @Opcode(0x04, 4, "INC B")
    @Opcode(0x0C, 4, "INC C")
    @Opcode(0x14, 4, "INC D")
    @Opcode(0x1C, 4, "INC E")
    @Opcode(0x24, 4, "INC H")
    @Opcode(0x2C, 4, "INC L")
    @Opcode(0x3C, 4, "INC A")
    public static INC_0x04x0Cx14x1Cx24x2Cx3C(opcode: number, cpu: CPU): void {
        const register = cpu.readByteRegisterType(opcode >> 3);

        cpu.disableFlag(Flags.ZeroFlag);
        cpu.disableFlag(Flags.AddSubFlag);

        cpu[register]++;

        if ((cpu[register] & 0x0F) == 0x00) {
            cpu.enableFlag(Flags.HalfCarryFlag);
        } else {
            cpu.disableFlag(Flags.HalfCarryFlag);
        }

        toggleZeroFlag(cpu, cpu[register]);
    }

    @Opcode(0x05, 4, "DEC B")
    @Opcode(0x0D, 4, "DEC C")
    @Opcode(0x15, 4, "DEC D")
    @Opcode(0x1D, 4, "DEC E")
    @Opcode(0x25, 4, "DEC H")
    @Opcode(0x2D, 4, "DEC L")
    @Opcode(0x3D, 4, "DEC A")
    public static DEC_0x05x0Dx15x1Dx25x2Dx3D(opcode: number, cpu: CPU): void {
        const register = cpu.readByteRegisterType(opcode >> 3);
        const result = (cpu[register] - 1) & 0xFF;

        cpu.enableFlag(Flags.AddSubFlag);
        cpu.disableFlag(Flags.ZeroFlag);

        cpu[register] = result;

        if ((result & 0x0F) == 0x0F) {
            cpu.enableFlag(Flags.HalfCarryFlag);
        } else {
            cpu.disableFlag(Flags.HalfCarryFlag);
        }

        toggleZeroFlag(cpu, result);
    }

    @Opcode(0x06, 8, "LD B,d8")
    @Opcode(0x0E, 8, "LD C,d8")
    @Opcode(0x16, 8, "LD D,d8")
    @Opcode(0x1E, 8, "LD E,d8")
    @Opcode(0x26, 8, "LD H,d8")
    @Opcode(0x2E, 8, "LD L,d8")
    @Opcode(0x3E, 8, "LD A,d8")
    public static LD_0x06(opcode: number, cpu: CPU): void {
        const register = cpu.readByteRegisterType(opcode >> 3);
        const val = cpu.readu8();

        cpu[register] = val;
    }

    @Opcode(0x07, 4, "RLCA")
    public static RLCA_0x07(opcode: number, cpu: CPU): void {
        let val = cpu.A;
        cpu.clearFlags();

        if ((val & 0x80) != 0) {
            cpu.enableFlag(Flags.CarryFlag);

            val <<= 1;
            val |= 0x01;
        } else {
            val <<= 1;
        }

        cpu.A = val;
    }

    @Opcode(0x08, 20, "LD (a16),SP")
    public static LD_0x08(opcode: number, cpu: CPU): void {
        const addr = cpu.readu16();

        cpu.MMU.write8(addr + 0, cpu.SP & 0xFF);
        cpu.MMU.write8(addr + 1, (cpu.SP >> 8) & 0xFF);
    }

    @Opcode(0x09, 8, "ADD HL,BC")
    @Opcode(0x19, 8, "ADD HL,DE")
    @Opcode(0x29, 8, "ADD HL,HL")
    @Opcode(0x39, 8, "ADD HL,SP")
    public static ADD_0x09(opcode: number, cpu: CPU): void {
        const register = cpu.readRegisterType(opcode >> 4, false);

        cpu.disableFlag(Flags.AddSubFlag);

        let result = (cpu.HL + cpu[register]) & 0xFFFF;

        if (result < cpu.HL) {
            cpu.enableFlag(Flags.CarryFlag);
        } else {
            cpu.disableFlag(Flags.CarryFlag);
        }

        if ((result ^ cpu.HL ^ cpu[register]) & 0x1000) {
            cpu.enableFlag(Flags.HalfCarryFlag);
        } else {
            cpu.disableFlag(Flags.HalfCarryFlag);
        }

        cpu.HL = result;
    }

    @Opcode(0x0A, 8, "LD A,(BC)")
    public static LD_0x0A(opcode: number, cpu: CPU): void {
        let val = cpu.MMU.read8(cpu.BC);

        cpu.A = val;
    }

    @Opcode(0x0F, 4, "RRCA")
    public static RRCA_0x0F(opcode: number, cpu: CPU): void {
        let val = cpu.A;
        cpu.clearFlags();

        if ((val & 0x01) != 0) {
            cpu.enableFlag(Flags.CarryFlag);

            val >>= 1;
            val |= 0x80;
        } else {
            val >>= 1;
        }

        cpu.A = val;
    }

    @Opcode(0x0B, 8, "DEC BC")
    @Opcode(0x1B, 8, "DEC DE")
    @Opcode(0x2B, 8, "DEC HL")
    @Opcode(0x3B, 8, "DEC SP")
    public static DEC_0x0B(opcode: number, cpu: CPU): void {
        const register = cpu.readRegisterType(opcode >> 4, false);

        cpu[register]--;
    }

    @Opcode(0x10, 0, "STOP 0")
    public static STOP_0x10(opcode: number, cpu: CPU): void {
        // todo
    }

    @Opcode(0x12, 8, "LD (DE),A")
    public static LD_0x12(opcode: number, cpu: CPU): void {
        cpu.MMU.write8(cpu.DE, cpu.A);
    }

    @Opcode(0x17, 4, "RLA")
    public static RLA_0x17(opcode: number, cpu: CPU): void {
        const register = cpu.readByteRegisterType(opcode);
        const carry = cpu.isFlagSet(Flags.CarryFlag) ? 1 : 0;
        let result = cpu[register];

        cpu.clearFlags();

        if ((result & 0x80) != 0) {
            cpu.enableFlag(Flags.CarryFlag);
        }

        result <<= 1;
        result |= carry;

        cpu[register] = result;
    }

    @Opcode(0x18, 12, "JR r8")
    public static JR_0x18(opcode: number, cpu: CPU): void {
        const relative = cpu.reads8();

        cpu.PC += relative;
    }

    @Opcode(0x1A, 8, "LD A,(DE)")
    public static LD_0x1A(opcode: number, cpu: CPU): void {
        cpu.A = cpu.MMU.read8(cpu.DE);
    }

    @Opcode(0x1F, 4, "RRA")
    public static RRA_0x1F(opcode: number, cpu: CPU): void {
        const register = cpu.readByteRegisterType(opcode);
        const carry = cpu.isFlagSet(Flags.CarryFlag) ? 0x80 : 0;
        let result = cpu[register];

        cpu.clearFlags();

        if ((result & 0x01) != 0) {
            cpu.enableFlag(Flags.CarryFlag);
        }

        result >>= 1;
        result |= carry;

        cpu[register] = result;
    }

    @Opcode(0x20, 8, "JR NZ,r8")
    @Opcode(0x28, 8, "JR Z,r8")
    @Opcode(0x30, 8, "JR NC,r8")
    @Opcode(0x38, 8, "JR C,r8")
    public static JR_0x20(opcode: number, cpu: CPU): void {
        const relative = cpu.reads8();
        let check = false;

        switch ((opcode >> 3) & 0x03) {
            case 0x00:
                check = !cpu.isFlagSet(Flags.ZeroFlag);
                break;

            case 0x01:
                check = cpu.isFlagSet(Flags.ZeroFlag);
                break;

            case 0x02:
                check = !cpu.isFlagSet(Flags.CarryFlag);
                break;

            case 0x03:
                check = cpu.isFlagSet(Flags.CarryFlag);
                break;
        }

        if (check) {
            cpu.PC += relative;
        }
    }

    @Opcode(0x22, 8, "LD (HL+),A")
    public static LD_0x22(opcode: number, cpu: CPU): void {
        cpu.MMU.write8(cpu.HL, cpu.A);
        cpu.HL++;
    }

    @Opcode(0x27, 4, "DAA")
    public static DAA_0x27(opcode: number, cpu: CPU): void {
        let a = cpu.A;

        if (!cpu.isFlagSet(Flags.AddSubFlag)) {
            if (cpu.isFlagSet(Flags.HalfCarryFlag) || (a & 0xF) > 9) {
                a += 0x06;
            }

            if (cpu.isFlagSet(Flags.CarryFlag) || a > 0x9F) {
                a += 0x60;
            }
        } else {
            if (cpu.isFlagSet(Flags.HalfCarryFlag)) {
                a = (a - 6) & 0xFF;
            }

            if (cpu.isFlagSet(Flags.CarryFlag)) {
                a -= 0x60;
            }
        }

        cpu.F &= ~(Flags.HalfCarryFlag | Flags.ZeroFlag);

        if ((a & 0x100) == 0x100) {
            cpu.F |= Flags.CarryFlag;
        }

        a &= 0xFF;

        if (a == 0) {
            cpu.F |= Flags.ZeroFlag;
        }

        cpu.A = a;

        toggleZeroFlag(cpu, cpu.A);
    }

    @Opcode(0x2A, 8, "LD A,(HL+)")
    public static LD_0x2A(opcode: number, cpu: CPU): void {
        cpu.A = cpu.MMU.read8(cpu.HL);
        cpu.HL++;
    }

    @Opcode(0x2F, 4, "CPL")
    public static CPL_0x2F(opcode: number, cpu: CPU): void {
        cpu.A = cpu.A ^ 0xFF;

        cpu.enableFlag(Flags.HalfCarryFlag);
        cpu.enableFlag(Flags.AddSubFlag);
    }

    @Opcode(0x32, 8, "LD (HL-),A")
    public static LD_0x32(opcode: number, cpu: CPU): void {
        cpu.MMU.write8(cpu.HL, cpu.A);

        cpu.HL--;
    }

    @Opcode(0x34, 12, "INC (HL)")
    public static INC_0x34(opcode: number, cpu: CPU): void {
        const register = cpu.readByteRegisterType(opcode >> 3);

        cpu.disableFlag(Flags.ZeroFlag);
        cpu.disableFlag(Flags.AddSubFlag);

        let val = (cpu.MMU.read8(cpu.HL) + 1) & 0xFF;

        toggleZeroFlag(cpu, val);

        if ((val & 0xF) == 0x00) {
            cpu.enableFlag(Flags.HalfCarryFlag);
        } else {
            cpu.disableFlag(Flags.HalfCarryFlag);
        }

        cpu.MMU.write8(cpu.HL, val);
    }

    @Opcode(0x35, 12, "DEC (HL)")
    public static DEC_0x35(opcode: number, cpu: CPU): void {
        cpu.enableFlag(Flags.AddSubFlag);
        cpu.disableFlag(Flags.ZeroFlag);

        let val = (cpu.MMU.read8(cpu.HL) - 1) & 0xFF;

        if ((val & 0xF) == 0xF) {
            cpu.enableFlag(Flags.HalfCarryFlag);
        } else {
            cpu.disableFlag(Flags.HalfCarryFlag);
        }

        toggleZeroFlag(cpu, val);

        cpu.MMU.write8(cpu.HL, val);
    }

    @Opcode(0x36, 12, "LD (HL),d8")
    public static LD_0x36(opcode: number, cpu: CPU): void {
        const val = cpu.readu8();

        cpu.MMU.write8(cpu.HL, val);
    }

    @Opcode(0x37, 4, "SCF")
    public static SCF_0x37(opcode: number, cpu: CPU): void {
        cpu.disableFlag(Flags.AddSubFlag);
        cpu.disableFlag(Flags.HalfCarryFlag);
        cpu.enableFlag(Flags.CarryFlag);
    }

    @Opcode(0x3A, 8, "LD A,(HL-)")
    public static LD_0x3A(opcode: number, cpu: CPU): void {
        cpu.A = cpu.MMU.read8(cpu.HL);
        cpu.HL--;
    }

    @Opcode(0x3F, 4, "CCF")
    public static CCF_0x3F(opcode: number, cpu: CPU): void {
        cpu.disableFlag(Flags.AddSubFlag);
        cpu.disableFlag(Flags.HalfCarryFlag);

        if (cpu.isFlagSet(Flags.CarryFlag)) {
            cpu.disableFlag(Flags.CarryFlag);
        } else {
            cpu.enableFlag(Flags.CarryFlag);
        }
    }

    @Opcode(0x40, 4, "LD B,B")
    @Opcode(0x41, 4, "LD B,C")
    @Opcode(0x42, 4, "LD B,D")
    @Opcode(0x43, 4, "LD B,E")
    @Opcode(0x44, 4, "LD B,H")
    @Opcode(0x45, 4, "LD B,L")
    @Opcode(0x47, 4, "LD B,A")
    @Opcode(0x48, 4, "LD C,B")
    @Opcode(0x49, 4, "LD C,C")
    @Opcode(0x4A, 4, "LD C,D")
    @Opcode(0x4B, 4, "LD C,E")
    @Opcode(0x4C, 4, "LD C,H")
    @Opcode(0x4D, 4, "LD C,L")
    @Opcode(0x4F, 4, "LD C,A")
    @Opcode(0x50, 4, "LD D,B")
    @Opcode(0x51, 4, "LD D,C")
    @Opcode(0x52, 4, "LD D,D")
    @Opcode(0x53, 4, "LD D,E")
    @Opcode(0x54, 4, "LD D,H")
    @Opcode(0x55, 4, "LD D,L")
    @Opcode(0x57, 4, "LD D,A")
    @Opcode(0x58, 4, "LD E,B")
    @Opcode(0x59, 4, "LD E,C")
    @Opcode(0x5A, 4, "LD E,D")
    @Opcode(0x5B, 4, "LD E,E")
    @Opcode(0x5C, 4, "LD E,H")
    @Opcode(0x5D, 4, "LD E,L")
    @Opcode(0x5F, 4, "LD E,A")
    @Opcode(0x60, 4, "LD H,B")
    @Opcode(0x61, 4, "LD H,C")
    @Opcode(0x62, 4, "LD H,D")
    @Opcode(0x63, 4, "LD H,E")
    @Opcode(0x64, 4, "LD H,H")
    @Opcode(0x65, 4, "LD H,L")
    @Opcode(0x67, 4, "LD H,A")
    @Opcode(0x68, 4, "LD L,B")
    @Opcode(0x69, 4, "LD L,C")
    @Opcode(0x6A, 4, "LD L,D")
    @Opcode(0x6B, 4, "LD L,E")
    @Opcode(0x6C, 4, "LD L,H")
    @Opcode(0x6D, 4, "LD L,L")
    @Opcode(0x6F, 4, "LD L,A")
    @Opcode(0x78, 4, "LD A,B")
    @Opcode(0x79, 4, "LD A,C")
    @Opcode(0x7A, 4, "LD A,D")
    @Opcode(0x7B, 4, "LD A,E")
    @Opcode(0x7C, 4, "LD A,H")
    @Opcode(0x7D, 4, "LD A,L")
    @Opcode(0x7F, 4, "LD A,A")
    public static LD_0x40(opcode: number, cpu: CPU): void {
        const r1 = cpu.readByteRegisterType(opcode >> 3);
        const r2 = cpu.readByteRegisterType(opcode);

        cpu[r1] = cpu[r2];
    }

    @Opcode(0x46, 8, "LD B,(HL)")
    @Opcode(0x4E, 8, "LD C,(HL)")
    @Opcode(0x56, 8, "LD D,(HL)")
    @Opcode(0x5E, 8, "LD E,(HL)")
    @Opcode(0x66, 8, "LD H,(HL)")
    @Opcode(0x6E, 8, "LD L,(HL)")
    @Opcode(0x7E, 8, "LD A,(HL)")
    public static LD_0x46(opcode: number, cpu: CPU): void {
        const register = cpu.readByteRegisterType(opcode >> 3);

        let val = cpu.MMU.read8(cpu.HL);

        cpu[register] = val;
    }

    @Opcode(0x70, 8, "LD (HL),B")
    @Opcode(0x71, 8, "LD (HL),C")
    @Opcode(0x72, 8, "LD (HL),D")
    @Opcode(0x73, 8, "LD (HL),E")
    @Opcode(0x74, 8, "LD (HL),H")
    @Opcode(0x75, 8, "LD (HL),L")
    @Opcode(0x77, 8, "LD (HL),A")
    public static LD_0x70(opcode: number, cpu: CPU): void {
        const register = cpu.readByteRegisterType(opcode);

        cpu.MMU.write8(cpu.HL, cpu[register]);
    }

    @Opcode(0x76, 0, "HALT")
    public static HALT_0x76(opcode: number, cpu: CPU): void {
        cpu.waitForInterrupt = true;
    }

    @Opcode(0x80, 4, "ADD A,B")
    @Opcode(0x81, 4, "ADD A,C")
    @Opcode(0x82, 4, "ADD A,D")
    @Opcode(0x83, 4, "ADD A,E")
    @Opcode(0x84, 4, "ADD A,H")
    @Opcode(0x85, 4, "ADD A,L")
    @Opcode(0x87, 4, "ADD A,A")
    public static ADD_0x81(opcode: number, cpu: CPU): void {
        ADD(cpu.readByteRegisterType(opcode), false, cpu);
    }

    @Opcode(0x86, 8, "ADD A,(HL)")
    public static ADD_0x86(opcode: number, cpu: CPU): void {
        ADD(null, false, cpu);
    }

    @Opcode(0x90, 4, "SUB B")
    @Opcode(0x91, 4, "SUB C")
    @Opcode(0x92, 4, "SUB D")
    @Opcode(0x93, 4, "SUB E")
    @Opcode(0x94, 4, "SUB H")
    @Opcode(0x95, 4, "SUB L")
    @Opcode(0x97, 4, "SUB A")
    public static SUB_0x90(opcode: number, cpu: CPU): void {
        SUB(cpu.readByteRegisterType(opcode), false, cpu);
    }

    @Opcode(0x96, 8, "SUB (HL)")
    public static SUB_0x96(opcode: number, cpu: CPU): void {
        SUB(null, false, cpu);
    }

    @Opcode(0xA0, 4, "AND B")
    @Opcode(0xA1, 4, "AND C")
    @Opcode(0xA2, 4, "AND D")
    @Opcode(0xA3, 4, "AND E")
    @Opcode(0xA4, 4, "AND H")
    @Opcode(0xA5, 4, "AND L")
    @Opcode(0xA7, 4, "AND A")
    public static AND_0xA0(opcode: number, cpu: CPU): void {
        const register = cpu.readByteRegisterType(opcode);

        if (cpu.enableDebugging) {
            cpu.debug.log(`AND ${cpu[register].toString(16)}`);
        }

        cpu.clearFlags();

        cpu.A &= cpu[register];
        toggleZeroFlag(cpu, cpu.A);

        cpu.enableFlag(Flags.HalfCarryFlag);
    }

    @Opcode(0xA6, 8, "AND (HL)")
    public static AND_0xA6(opcode: number, cpu: CPU): void {
        const val = cpu.MMU.read8(cpu.HL);

        cpu.clearFlags();

        cpu.A &= val;
        toggleZeroFlag(cpu, cpu.A);

        cpu.enableFlag(Flags.HalfCarryFlag);
    }

    @Opcode(0xA8, 4, "XOR B")
    @Opcode(0xA9, 4, "XOR C")
    @Opcode(0xAA, 4, "XOR D")
    @Opcode(0xAB, 4, "XOR E")
    @Opcode(0xAC, 4, "XOR H")
    @Opcode(0xAD, 4, "XOR L")
    @Opcode(0xAF, 4, "XOR A")
    public static XOR_0xA9(opcode: number, cpu: CPU): void {
        const register = cpu.readByteRegisterType(opcode);

        cpu.clearFlags();
        cpu.A ^= cpu[register];

        toggleZeroFlag(cpu, cpu.A);
    }

    @Opcode(0xAE, 8, "XOR (HL)")
    public static XOR_0xAE(opcode: number, cpu: CPU): void {
        const val = cpu.MMU.read8(cpu.HL);

        cpu.clearFlags();
        cpu.A ^= val;

        toggleZeroFlag(cpu, cpu.A);
    }

    @Opcode(0xB0, 4, "OR B")
    @Opcode(0xB1, 4, "OR C")
    @Opcode(0xB2, 4, "OR D")
    @Opcode(0xB3, 4, "OR E")
    @Opcode(0xB4, 4, "OR H")
    @Opcode(0xB5, 4, "OR L")
    @Opcode(0xB7, 4, "OR A")
    public static OR_0xB0(opcode: number, cpu: CPU): void {
        const register = cpu.readByteRegisterType(opcode);

        cpu.clearFlags();
        cpu.A |= cpu[register];

        toggleZeroFlag(cpu, cpu.A);
    }

    @Opcode(0xB6, 8, "OR (HL)")
    public static OR_0xB6(opcode: number, cpu: CPU): void {
        const val = cpu.MMU.read8(cpu.HL);

        cpu.clearFlags();
        cpu.A |= val;

        toggleZeroFlag(cpu, cpu.A);
    }

    @Opcode(0xB8, 4, "CP B")
    @Opcode(0xB9, 4, "CP C")
    @Opcode(0xBA, 4, "CP D")
    @Opcode(0xBB, 4, "CP E")
    @Opcode(0xBC, 4, "CP H")
    @Opcode(0xBD, 4, "CP L")
    @Opcode(0xBF, 4, "CP A")
    public static CP_0xBB(opcode: number, cpu: CPU): void {
        CP(cpu[cpu.readByteRegisterType(opcode)], cpu);
    }

    @Opcode(0xBE, 8, "CP (HL)")
    public static CP_0xBE(opcode: number, cpu: CPU): void {
        CP(cpu.MMU.read8(cpu.HL), cpu);
    }

    @Opcode(0xC0, 8, "RET NZ")
    @Opcode(0xC8, 8, "RET Z")
    @Opcode(0xD0, 8, "RET NC")
    @Opcode(0xD8, 8, "RET C")
    public static RET_0xC0(opcode: number, cpu: CPU): void {
        let check = false;

        switch ((opcode >> 3) & 0x03) {
            case 0x00:
                check = !cpu.isFlagSet(Flags.ZeroFlag);
                break;

            case 0x01:
                check = cpu.isFlagSet(Flags.ZeroFlag);
                break;

            case 0x02:
                check = !cpu.isFlagSet(Flags.CarryFlag);
                break;

            case 0x03:
                check = cpu.isFlagSet(Flags.CarryFlag);
                break;
        }

        if (check) {
            // cpu.debug.funcRet(cpu.PC - 1);
            cpu.PC = cpu.popStack();
        }
    }

    @Opcode(0xC1, 12, "POP BC")
    @Opcode(0xD1, 12, "POP DE")
    @Opcode(0xE1, 12, "POP HL")
    @Opcode(0xF1, 12, "POP AF")
    public static POP_0xC1(opcode: number, cpu: CPU): void {
        const register = cpu.readRegisterType(opcode >> 4, true);

        cpu[register] = cpu.popStack();

        if (((opcode >> 4) & 0x03) == 0x03) {
            cpu[register] &= 0xFFF0;
        }
    }

    @Opcode(0xC2, 12, "JP NZ,a16")
    @Opcode(0xCA, 12, "JP Z,a16")
    @Opcode(0xD2, 12, "JP NC,a16")
    @Opcode(0xDA, 12, "JP C,a16")
    public static JP_0xC2(opcode: number, cpu: CPU): void {
        const addr = cpu.readu16();
        let check = false;

        switch ((opcode >> 3) & 0x03) {
            case 0x00:
                check = !cpu.isFlagSet(Flags.ZeroFlag);
                break;

            case 0x01:
                check = cpu.isFlagSet(Flags.ZeroFlag);
                break;

            case 0x02:
                check = !cpu.isFlagSet(Flags.CarryFlag);
                break;

            case 0x03:
                check = cpu.isFlagSet(Flags.CarryFlag);
                break;
        }

        if (check) {
            cpu.PC = addr;
        }
    }

    @Opcode(0xC3, 16, "JP a16")
    public static JP_0xC3(opcode: number, cpu: CPU): void {
        const addr = cpu.readu16();

        cpu.PC = addr;
    }

    @Opcode(0xC4, 12, "CALL NZ,a16")
    @Opcode(0xCC, 12, "CALL Z,a16")
    @Opcode(0xD4, 12, "CALL NC,a16")
    @Opcode(0xDC, 12, "CALL C,a16")
    public static CALL_0xC4(opcode: number, cpu: CPU): void {
        const addr = cpu.readu16();
        let check = false;

        switch ((opcode >> 3) & 0x03) {
            case 0x00:
                check = !cpu.isFlagSet(Flags.ZeroFlag);
                break;

            case 0x01:
                check = cpu.isFlagSet(Flags.ZeroFlag);
                break;

            case 0x02:
                check = !cpu.isFlagSet(Flags.CarryFlag);
                break;

            case 0x03:
                check = cpu.isFlagSet(Flags.CarryFlag);
                break;
        }

        if (check) {
            cpu.pushStack(cpu.PC);
            cpu.PC = addr;
            // cpu.debug.func(addr);
        } else {
            // cpu.debug.func(addr, false);
        }
    }

    @Opcode(0xC5, 16, "PUSH BC")
    @Opcode(0xD5, 16, "PUSH DE")
    @Opcode(0xE5, 16, "PUSH HL")
    @Opcode(0xF5, 16, "PUSH AF")
    public static PUSH_0xC5(opcode: number, cpu: CPU): void {
        const register = cpu.readRegisterType(opcode >> 4, true);

        cpu.pushStack(cpu[register]);
    }

    @Opcode(0xC6, 8, "ADD A,d8")
    public static ADD_0xC6(opcode: number, cpu: CPU): void {
        ADD(cpu.readu8(), false, cpu);
    }

    @Opcode(0xC9, 16, "RET")
    public static RET_0xC9(opcode: number, cpu: CPU): void {
        // cpu.debug.funcRet(cpu.PC - 1);
        cpu.PC = cpu.popStack();
    }

    @Opcode(0xCD, 24, "CALL a16")
    public static CALL_0xCD(opcode: number, cpu: CPU): void {
        const addr = cpu.readu16();

        cpu.pushStack(cpu.PC);
        cpu.PC = addr;

        // cpu.debug.func(addr);
    }

    @Opcode(0x88, 4, "ADC A,B")
    @Opcode(0x89, 4, "ADC A,C")
    @Opcode(0x8A, 4, "ADC A,D")
    @Opcode(0x8B, 4, "ADC A,E")
    @Opcode(0x8C, 4, "ADC A,H")
    @Opcode(0x8D, 4, "ADC A,L")
    @Opcode(0x8E, 8, "ADC A,(HL)")
    @Opcode(0x8F, 4, "ADC A,A")
    @Opcode(0xCE, 8, "ADC A,d8")
    public static ADC_0x8F(opcode: number, cpu: CPU): void {
        const target = opcode & 0xF;
        let number = 0;

        if (target === 14) {
            const memoryFlag = (opcode & 0b01000000) === 0;

            if (memoryFlag) {
                ADD(null, true, cpu);
            } else {
                number = cpu.readu8();
                ADD(number, true, cpu);
            }

            return;
        }

        const registers = {
            8: "B",
            9: "C",
            10: "D",
            11: "E",
            12: "H",
            13: "L",
            15: "A"
        };

        ADD(registers[target], true, cpu);
    }

    @Opcode(0xD6, 8, "SUB d8")
    public static SUB_0xD6(opcode: number, cpu: CPU): void {
        SUB(cpu.readu8(), false, cpu);
    }

    @Opcode(0x98, 4, "SBC A,B")
    @Opcode(0x99, 4, "SBC A,C")
    @Opcode(0x9A, 4, "SBC A,D")
    @Opcode(0x9B, 4, "SBC A,E")
    @Opcode(0x9C, 4, "SBC A,H")
    @Opcode(0x9D, 4, "SBC A,L")
    @Opcode(0x9E, 8, "SBC A,(HL)")
    @Opcode(0x9F, 4, "SBC A,A")
    @Opcode(0xDE, 8, "SBC A,d8")
    public static SBC_0xDE(opcode: number, cpu: CPU): void {
        const target = opcode & 0xF;
        let number = 0;

        if (target === 14) {
            const memoryFlag = (opcode & 0b01000000) === 0;

            if (memoryFlag) {
                SUB(null, true, cpu);
            } else {
                number = cpu.readu8();
                SUB(number, true, cpu);
            }
        } else {
            const registers = {
                8: "B",
                9: "C",
                10: "D",
                11: "E",
                12: "H",
                13: "L",
                15: "A"
            };

            SUB(registers[target], true, cpu);
        }
    }

    @Opcode(0xE0, 12, "LDH (a8),A")
    public static LDH_0xE0(opcode: number, cpu: CPU): void {
        const pos = 0xFF00 + cpu.readu8();

        cpu.MMU.write8(pos, cpu.A);
    }

    @Opcode(0xE2, 8, "LD (C),A")
    public static LD_0xE2(opcode: number, cpu: CPU): void {
        cpu.MMU.write8(0xFF00 + cpu.C, cpu.A);
    }

    @Opcode(0xE6, 8, "AND d8")
    public static AND_0xE6(opcode: number, cpu: CPU): void {
        const val = cpu.readu8();

        cpu.clearFlags();

        if (cpu.enableDebugging) {
            cpu.debug.log(`AND ${val.toString(16)}`);
        }

        cpu.A &= val;
        toggleZeroFlag(cpu, cpu.A);

        cpu.enableFlag(Flags.HalfCarryFlag);
    }

    @Opcode(0xE8, 16, "ADD SP,r8")
    public static ADD_0xE8(opcode: number, cpu: CPU): void {
        ADD_16("SP", cpu.reads8(), cpu);
    }

    @Opcode(0xE9, 4, "JP (HL)")
    public static JP_0xE9(opcode: number, cpu: CPU): void {
        cpu.PC = cpu.HL;
    }

    @Opcode(0xEA, 16, "LD (a16),A")
    public static LD_0xEA(opcode: number, cpu: CPU): void {
        const addr = cpu.readu16();

        cpu.MMU.write8(addr, cpu.A);
    }

    @Opcode(0xEE, 8, "XOR d8")
    public static XOR_0xEE(opcode: number, cpu: CPU): void {
        const val = cpu.readu8();

        cpu.clearFlags();
        cpu.A ^= val;

        toggleZeroFlag(cpu, cpu.A);
    }

    @Opcode(0xC7, 16, "RST 00H")
    @Opcode(0xCF, 16, "RST 08H")
    @Opcode(0xD7, 16, "RST 10H")
    @Opcode(0xDF, 16, "RST 18H")
    @Opcode(0xE7, 16, "RST 20H")
    @Opcode(0xEF, 16, "RST 28H")
    @Opcode(0xF7, 16, "RST 30H")
    @Opcode(0xFF, 16, "RST 38H")
    public static RST_0xEF(opcode: number, cpu: CPU): void {
        const t = ((opcode >> 3) & 0x07);
        const n = t * 0x08;

        cpu.pushStack(cpu.PC);
        cpu.PC = n;
    }

    @Opcode(0xD9, 16, "RETI")
    public static RETI_0xD9(opcode: number, cpu: CPU): void {
        cpu.PC = cpu.popStack();
        cpu.enableInterrupts = true;
    }

    @Opcode(0xF0, 12, "LDH A,(a8)")
    public static LDH_0xF0(opcode: number, cpu: CPU): void {
        const pos = 0xFF00 + cpu.readu8();

        cpu.A = cpu.MMU.read8(pos);
    }

    @Opcode(0xF2, 8, "LD A,(C)")
    public static LD_0xF2(opcode: number, cpu: CPU): void {
        cpu.A = cpu.MMU.read8(0xFF00 + cpu.C);
    }

    @Opcode(0xF3, 4, "DI")
    public static DI_0xF3(opcode: number, cpu: CPU): void {
        cpu.enableInterrupts = false;
    }

    @Opcode(0xF6, 8, "OR d8")
    public static OR_0xF6(opcode: number, cpu: CPU): void {
        const val = cpu.readu8();

        cpu.clearFlags();
        cpu.A |= val;

        toggleZeroFlag(cpu, cpu.A);
    }

    @Opcode(0xF8, 12, "LD HL,SP+r8")
    public static LD_0xF8(opcode: number, cpu: CPU): void {
        cpu.clearFlags();

        const val = cpu.reads8();
        const result = (cpu.SP + val) & 0xFFFF;

        if (((cpu.SP ^ val ^ result) & 0x100) == 0x100) {
            cpu.enableFlag(Flags.CarryFlag);
        }

        if (((cpu.SP ^ val ^ result) & 0x10) == 0x10) {
            cpu.enableFlag(Flags.HalfCarryFlag);
        }
        
        cpu.HL = result;
    }

    @Opcode(0xF9, 8, "LD SP,HL")
    public static LD_0xF9(opcode: number, cpu: CPU): void {
        cpu.SP = cpu.HL;
    }

    @Opcode(0xFA, 16, "LD A,(a16)")
    public static LD_0xFA(opcode: number, cpu: CPU): void {
        const addr = cpu.readu16();

        cpu.A = cpu.MMU.read8(addr);
    }

    @Opcode(0xFB, 4, "EI")
    public static EI_0xFB(opcode: number, cpu: CPU): void {
        cpu.enableInterrupts = true;
    }

    @Opcode(0xFE, 8, "CP d8")
    public static CP_0xFE(opcode: number, cpu: CPU): void {
        CP(cpu.readu8(), cpu);
    }
}

export class OpcodesCB {
    @Opcode(0x00, 8, "CB RLC B", OpcodeType.CB)
    @Opcode(0x01, 8, "CB RLC C", OpcodeType.CB)
    @Opcode(0x02, 8, "CB RLC D", OpcodeType.CB)
    @Opcode(0x03, 8, "CB RLC E", OpcodeType.CB)
    @Opcode(0x04, 8, "CB RLC H", OpcodeType.CB)
    @Opcode(0x05, 8, "CB RLC L", OpcodeType.CB)
    @Opcode(0x06, 16, "CB RLC (HL)", OpcodeType.CB)
    @Opcode(0x07, 8, "CB RLC A", OpcodeType.CB)
    public static RLC_0x00(opcode: number, cpu: CPU): void {
        const register = cpu.readByteRegisterType(opcode);
        let value = 0;

        cpu.disableFlag(Flags.HalfCarryFlag);
        cpu.disableFlag(Flags.AddSubFlag);

        if ((opcode & 0x7) === 6) {
            value = cpu.MMU.read8(cpu.HL);
        } else {
            value = cpu[register];
        }

        if (value > 0x7F) {
            cpu.enableFlag(Flags.CarryFlag);
        } else {
            cpu.disableFlag(Flags.CarryFlag);
        }

        const carry = cpu.isFlagSet(Flags.CarryFlag) ? 1 : 0;
        let result = ((value << 1) & 0xFF) | (carry);

        if ((opcode & 0x7) === 6) {
            cpu.MMU.write8(cpu.HL, result);
        } else {
            cpu[register] = result;
        }

        toggleZeroFlag(cpu, result);
    }

    @Opcode(0x08, 8, "CB RRC B", OpcodeType.CB)
    @Opcode(0x09, 8, "CB RRC C", OpcodeType.CB)
    @Opcode(0x0A, 8, "CB RRC D", OpcodeType.CB)
    @Opcode(0x0B, 8, "CB RRC E", OpcodeType.CB)
    @Opcode(0x0C, 8, "CB RRC H", OpcodeType.CB)
    @Opcode(0x0D, 8, "CB RRC L", OpcodeType.CB)
    @Opcode(0x0E, 16, "CB RRC (HL)", OpcodeType.CB)
    @Opcode(0x0F, 8, "CB RRC A", OpcodeType.CB)
    public static RRC_0x08(opcode: number, cpu: CPU): void {
        const register = cpu.readByteRegisterType(opcode);
        let result = 0;

        cpu.clearFlags();

        if ((opcode & 0x7) === 6) {
            result = cpu.MMU.read8(cpu.HL);
        } else {
            result = cpu[register];
        }

        if ((result & 0x01) != 0) {
            cpu.enableFlag(Flags.CarryFlag);

            result >>= 1;
            result |= 0x80;
        } else {
            result >>= 1;
        }

        if ((opcode & 0x7) === 6) {
            cpu.MMU.write8(cpu.HL, result);
        } else {
            cpu[register] = result;
        }

        toggleZeroFlag(cpu, result);
    }

    @Opcode(0x10, 8, "CB RL B", OpcodeType.CB)
    @Opcode(0x11, 8, "CB RL C", OpcodeType.CB)
    @Opcode(0x12, 8, "CB RL D", OpcodeType.CB)
    @Opcode(0x13, 8, "CB RL E", OpcodeType.CB)
    @Opcode(0x14, 8, "CB RL H", OpcodeType.CB)
    @Opcode(0x15, 8, "CB RL L", OpcodeType.CB)
    @Opcode(0x16, 16, "CB RL (HL)", OpcodeType.CB)
    @Opcode(0x17, 8, "CB RL A", OpcodeType.CB)
    public static RL_0x11(opcode: number, cpu: CPU): void {
        const register = cpu.readByteRegisterType(opcode);
        let result = 0;

        if ((opcode & 0x7) === 6) {
            result = cpu.MMU.read8(cpu.HL);
        } else {
            result = cpu[register];
        }

        const carry = cpu.isFlagSet(Flags.CarryFlag) ? 0x01 : 0x00;

        cpu.clearFlags();

        if ((result & 0x80) != 0) {
            cpu.enableFlag(Flags.CarryFlag);
        }

        result <<= 1;
        result |= carry;

        if ((opcode & 0x7) === 6) {
            cpu.MMU.write8(cpu.HL, result);
        } else {
            cpu[register] = result;
        }

        toggleZeroFlag(cpu, result);
    }

    @Opcode(0x18, 8, "CB RR B", OpcodeType.CB)
    @Opcode(0x19, 8, "CB RR C", OpcodeType.CB)
    @Opcode(0x1A, 8, "CB RR D", OpcodeType.CB)
    @Opcode(0x1B, 8, "CB RR E", OpcodeType.CB)
    @Opcode(0x1C, 8, "CB RR H", OpcodeType.CB)
    @Opcode(0x1D, 8, "CB RR L", OpcodeType.CB)
    @Opcode(0x1E, 16, "CB RR (HL)", OpcodeType.CB)
    @Opcode(0x1F, 8, "CB RR A", OpcodeType.CB)
    public static RR_0x19(opcode: number, cpu: CPU): void {
        const register = cpu.readByteRegisterType(opcode);
        let result = 0;

        if ((opcode & 0x7) === 6) {
            result = cpu.MMU.read8(cpu.HL);
        } else {
            result = cpu[register];
        }

        const carry = cpu.isFlagSet(Flags.CarryFlag) ? 0x80 : 0;

        cpu.clearFlags();

        if ((result & 0x01) != 0) {
            cpu.enableFlag(Flags.CarryFlag);
        }

        result >>= 1;
        result |= carry;

        if ((opcode & 0x7) === 6) {
            cpu.MMU.write8(cpu.HL, result);
        } else {
            cpu[register] = result;
        }

        toggleZeroFlag(cpu, result);
    }

    @Opcode(0x20, 8, "CB SLA B", OpcodeType.CB)
    @Opcode(0x21, 8, "CB SLA C", OpcodeType.CB)
    @Opcode(0x22, 8, "CB SLA D", OpcodeType.CB)
    @Opcode(0x23, 8, "CB SLA E", OpcodeType.CB)
    @Opcode(0x24, 8, "CB SLA H", OpcodeType.CB)
    @Opcode(0x25, 8, "CB SLA L", OpcodeType.CB)
    @Opcode(0x26, 16, "CB SLA (HL)", OpcodeType.CB)
    @Opcode(0x27, 8, "CB SLA A", OpcodeType.CB)
    public static SLA_0x20(opcode: number, cpu: CPU): void {
        const register = cpu.readByteRegisterType(opcode);
        let value = 0;

        if ((opcode & 0x7) === 6) {
            value = cpu.MMU.read8(cpu.HL);
        } else {
            value = cpu[register];
        }

        cpu.disableFlag(Flags.HalfCarryFlag);
        cpu.disableFlag(Flags.AddSubFlag);

        if (value > 0x7F) {
            cpu.enableFlag(Flags.CarryFlag);
        } else {
            cpu.disableFlag(Flags.CarryFlag);
        }
        
        let result = (value << 1) & 0xFF;

        if ((opcode & 0x7) === 6) {
            cpu.MMU.write8(cpu.HL, result);
        } else {
            cpu[register] = result;
        }

        toggleZeroFlag(cpu, result);
    }

    @Opcode(0x28, 8, "CB SRA B", OpcodeType.CB)
    @Opcode(0x29, 8, "CB SRA C", OpcodeType.CB)
    @Opcode(0x2A, 8, "CB SRA D", OpcodeType.CB)
    @Opcode(0x2B, 8, "CB SRA E", OpcodeType.CB)
    @Opcode(0x2C, 8, "CB SRA H", OpcodeType.CB)
    @Opcode(0x2D, 8, "CB SRA L", OpcodeType.CB)
    @Opcode(0x2E, 16, "CB SRA (HL)", OpcodeType.CB)
    @Opcode(0x2F, 8, "CB SRA A", OpcodeType.CB)
    public static SRA_0x28(opcode: number, cpu: CPU): void {
        const register = cpu.readByteRegisterType(opcode);
        let result = 0;

        if ((opcode & 0x7) === 6) {
            result = cpu.MMU.read8(cpu.HL);
        } else {
            result = cpu[register];
        }

        cpu.clearFlags();

        if ((result & 0x01) != 0) {
            cpu.enableFlag(Flags.CarryFlag);
        }

        if ((result & 0x80) != 0) {
            result >>= 1;
            result |= 0x80;
        } else {
            result >>= 1;
        }

        if ((opcode & 0x7) === 6) {
            cpu.MMU.write8(cpu.HL, result);
        } else {
            cpu[register] = result;
        }

        toggleZeroFlag(cpu, result);
    }

    @Opcode(0x30, 8, "CB SWAP B", OpcodeType.CB)
    @Opcode(0x31, 8, "CB SWAP C", OpcodeType.CB)
    @Opcode(0x32, 8, "CB SWAP D", OpcodeType.CB)
    @Opcode(0x33, 8, "CB SWAP E", OpcodeType.CB)
    @Opcode(0x34, 8, "CB SWAP H", OpcodeType.CB)
    @Opcode(0x35, 8, "CB SWAP L", OpcodeType.CB)
    @Opcode(0x36, 16, "CB SWAP (HL)", OpcodeType.CB)
    @Opcode(0x37, 8, "CB SWAP A", OpcodeType.CB)
    public static SWAP_0x37(opcode: number, cpu: CPU): void {
        const register = cpu.readByteRegisterType(opcode);

        if ((opcode & 0x7) === 6) {
            SWAP(null, cpu);
        } else {
            SWAP(register, cpu);
        }
    }

    @Opcode(0x38, 8, "CB SRL B", OpcodeType.CB)
    @Opcode(0x39, 8, "CB SRL C", OpcodeType.CB)
    @Opcode(0x3A, 8, "CB SRL D", OpcodeType.CB)
    @Opcode(0x3B, 8, "CB SRL E", OpcodeType.CB)
    @Opcode(0x3C, 8, "CB SRL H", OpcodeType.CB)
    @Opcode(0x3D, 8, "CB SRL L", OpcodeType.CB)
    @Opcode(0x3E, 16, "CB SRL (HL)", OpcodeType.CB)
    @Opcode(0x3F, 8, "CB SRL A", OpcodeType.CB)
    public static SRL_0x38(opcode: number, cpu: CPU): void {
        const register = cpu.readByteRegisterType(opcode);

        if ((opcode & 0x7) === 6) {
            SRL(null, cpu);
        } else {
            SRL(register, cpu);
        }
    }

    @Opcode(0x40, 8, "CB BIT 0,B", OpcodeType.CB)
    @Opcode(0x41, 8, "CB BIT 0,C", OpcodeType.CB)
    @Opcode(0x42, 8, "CB BIT 0,D", OpcodeType.CB)
    @Opcode(0x43, 8, "CB BIT 0,E", OpcodeType.CB)
    @Opcode(0x44, 8, "CB BIT 0,H", OpcodeType.CB)
    @Opcode(0x45, 8, "CB BIT 0,L", OpcodeType.CB)
    @Opcode(0x46, 12, "CB BIT 0,(HL)", OpcodeType.CB)
    @Opcode(0x47, 8, "CB BIT 0,A", OpcodeType.CB)
    @Opcode(0x48, 8, "CB BIT 1,B", OpcodeType.CB)
    @Opcode(0x49, 8, "CB BIT 1,C", OpcodeType.CB)
    @Opcode(0x4A, 8, "CB BIT 1,D", OpcodeType.CB)
    @Opcode(0x4B, 8, "CB BIT 1,E", OpcodeType.CB)
    @Opcode(0x4C, 8, "CB BIT 1,H", OpcodeType.CB)
    @Opcode(0x4D, 8, "CB BIT 1,L", OpcodeType.CB)
    @Opcode(0x4E, 12, "CB BIT 1,(HL)", OpcodeType.CB)
    @Opcode(0x4F, 8, "CB BIT 1,A", OpcodeType.CB)
    @Opcode(0x50, 8, "CB BIT 2,B", OpcodeType.CB)
    @Opcode(0x51, 8, "CB BIT 2,C", OpcodeType.CB)
    @Opcode(0x52, 8, "CB BIT 2,D", OpcodeType.CB)
    @Opcode(0x53, 8, "CB BIT 2,E", OpcodeType.CB)
    @Opcode(0x54, 8, "CB BIT 2,H", OpcodeType.CB)
    @Opcode(0x55, 8, "CB BIT 2,L", OpcodeType.CB)
    @Opcode(0x56, 12, "CB BIT 2,(HL)", OpcodeType.CB)
    @Opcode(0x57, 8, "CB BIT 2,A", OpcodeType.CB)
    @Opcode(0x58, 8, "CB BIT 3,B", OpcodeType.CB)
    @Opcode(0x59, 8, "CB BIT 3,C", OpcodeType.CB)
    @Opcode(0x5A, 8, "CB BIT 3,D", OpcodeType.CB)
    @Opcode(0x5B, 8, "CB BIT 3,E", OpcodeType.CB)
    @Opcode(0x5C, 8, "CB BIT 3,H", OpcodeType.CB)
    @Opcode(0x5D, 8, "CB BIT 3,L", OpcodeType.CB)
    @Opcode(0x5E, 12, "CB BIT 3,(HL)", OpcodeType.CB)
    @Opcode(0x5F, 8, "CB BIT 3,A", OpcodeType.CB)
    @Opcode(0x60, 8, "CB BIT 4,B", OpcodeType.CB)
    @Opcode(0x61, 8, "CB BIT 4,C", OpcodeType.CB)
    @Opcode(0x62, 8, "CB BIT 4,D", OpcodeType.CB)
    @Opcode(0x63, 8, "CB BIT 4,E", OpcodeType.CB)
    @Opcode(0x64, 8, "CB BIT 4,H", OpcodeType.CB)
    @Opcode(0x65, 8, "CB BIT 4,L", OpcodeType.CB)
    @Opcode(0x66, 12, "CB BIT 4,(HL)", OpcodeType.CB)
    @Opcode(0x67, 8, "CB BIT 4,A", OpcodeType.CB)
    @Opcode(0x68, 8, "CB BIT 5,B", OpcodeType.CB)
    @Opcode(0x69, 8, "CB BIT 5,C", OpcodeType.CB)
    @Opcode(0x6A, 8, "CB BIT 5,D", OpcodeType.CB)
    @Opcode(0x6B, 8, "CB BIT 5,E", OpcodeType.CB)
    @Opcode(0x6C, 8, "CB BIT 5,H", OpcodeType.CB)
    @Opcode(0x6D, 8, "CB BIT 5,L", OpcodeType.CB)
    @Opcode(0x6E, 12, "CB BIT 5,(HL)", OpcodeType.CB)
    @Opcode(0x6F, 8, "CB BIT 5,A", OpcodeType.CB)
    @Opcode(0x70, 8, "CB BIT 6,B", OpcodeType.CB)
    @Opcode(0x71, 8, "CB BIT 6,C", OpcodeType.CB)
    @Opcode(0x72, 8, "CB BIT 6,D", OpcodeType.CB)
    @Opcode(0x73, 8, "CB BIT 6,E", OpcodeType.CB)
    @Opcode(0x74, 8, "CB BIT 6,H", OpcodeType.CB)
    @Opcode(0x75, 8, "CB BIT 6,L", OpcodeType.CB)
    @Opcode(0x76, 12, "CB BIT 6,(HL)", OpcodeType.CB)
    @Opcode(0x77, 8, "CB BIT 6,A", OpcodeType.CB)
    @Opcode(0x78, 8, "CB BIT 7,B", OpcodeType.CB)
    @Opcode(0x79, 8, "CB BIT 7,C", OpcodeType.CB)
    @Opcode(0x7A, 8, "CB BIT 7,D", OpcodeType.CB)
    @Opcode(0x7B, 8, "CB BIT 7,E", OpcodeType.CB)
    @Opcode(0x7C, 8, "CB BIT 7,H", OpcodeType.CB)
    @Opcode(0x7D, 8, "CB BIT 7,L", OpcodeType.CB)
    @Opcode(0x7E, 12, "CB BIT 7,(HL)", OpcodeType.CB)
    @Opcode(0x7F, 8, "CB BIT 7,A", OpcodeType.CB)
    public static BIT_0x7C(opcode: number, cpu: CPU): void {
        const register = cpu.readByteRegisterType(opcode);
        const bit = (opcode & 0b00111000) >> 3;

        if ((opcode & 0x7) === 6) {
            BIT(null, bit, cpu);
        } else {
            BIT(register, bit, cpu);
        }
    }

    @Opcode(0x80, 8, "CB RES 0,B", OpcodeType.CB)
    @Opcode(0x81, 8, "CB RES 0,C", OpcodeType.CB)
    @Opcode(0x82, 8, "CB RES 0,D", OpcodeType.CB)
    @Opcode(0x83, 8, "CB RES 0,E", OpcodeType.CB)
    @Opcode(0x84, 8, "CB RES 0,H", OpcodeType.CB)
    @Opcode(0x85, 8, "CB RES 0,L", OpcodeType.CB)
    @Opcode(0x86, 16, "CB RES 0,(HL)", OpcodeType.CB)
    @Opcode(0x87, 8, "CB RES 0,A", OpcodeType.CB)
    @Opcode(0x88, 8, "CB RES 1,B", OpcodeType.CB)
    @Opcode(0x89, 8, "CB RES 1,C", OpcodeType.CB)
    @Opcode(0x8A, 8, "CB RES 1,D", OpcodeType.CB)
    @Opcode(0x8B, 8, "CB RES 1,E", OpcodeType.CB)
    @Opcode(0x8C, 8, "CB RES 1,H", OpcodeType.CB)
    @Opcode(0x8D, 8, "CB RES 1,L", OpcodeType.CB)
    @Opcode(0x8E, 16, "CB RES 1,(HL)", OpcodeType.CB)
    @Opcode(0x8F, 8, "CB RES 1,A", OpcodeType.CB)
    @Opcode(0x90, 8, "CB RES 2,B", OpcodeType.CB)
    @Opcode(0x91, 8, "CB RES 2,C", OpcodeType.CB)
    @Opcode(0x92, 8, "CB RES 2,D", OpcodeType.CB)
    @Opcode(0x93, 8, "CB RES 2,E", OpcodeType.CB)
    @Opcode(0x94, 8, "CB RES 2,H", OpcodeType.CB)
    @Opcode(0x95, 8, "CB RES 2,L", OpcodeType.CB)
    @Opcode(0x96, 16, "CB RES 2,(HL)", OpcodeType.CB)
    @Opcode(0x97, 8, "CB RES 2,A", OpcodeType.CB)
    @Opcode(0x98, 8, "CB RES 3,B", OpcodeType.CB)
    @Opcode(0x99, 8, "CB RES 3,C", OpcodeType.CB)
    @Opcode(0x9A, 8, "CB RES 3,D", OpcodeType.CB)
    @Opcode(0x9B, 8, "CB RES 3,E", OpcodeType.CB)
    @Opcode(0x9C, 8, "CB RES 3,H", OpcodeType.CB)
    @Opcode(0x9D, 8, "CB RES 3,L", OpcodeType.CB)
    @Opcode(0x9E, 16, "CB RES 3,(HL)", OpcodeType.CB)
    @Opcode(0x9F, 8, "CB RES 3,A", OpcodeType.CB)
    @Opcode(0xA0, 8, "CB RES 4,B", OpcodeType.CB)
    @Opcode(0xA1, 8, "CB RES 4,C", OpcodeType.CB)
    @Opcode(0xA2, 8, "CB RES 4,D", OpcodeType.CB)
    @Opcode(0xA3, 8, "CB RES 4,E", OpcodeType.CB)
    @Opcode(0xA4, 8, "CB RES 4,H", OpcodeType.CB)
    @Opcode(0xA5, 8, "CB RES 4,L", OpcodeType.CB)
    @Opcode(0xA6, 16, "CB RES 4,(HL)", OpcodeType.CB)
    @Opcode(0xA7, 8, "CB RES 4,A", OpcodeType.CB)
    @Opcode(0xA8, 8, "CB RES 5,B", OpcodeType.CB)
    @Opcode(0xA9, 8, "CB RES 5,C", OpcodeType.CB)
    @Opcode(0xAA, 8, "CB RES 5,D", OpcodeType.CB)
    @Opcode(0xAB, 8, "CB RES 5,E", OpcodeType.CB)
    @Opcode(0xAC, 8, "CB RES 5,H", OpcodeType.CB)
    @Opcode(0xAD, 8, "CB RES 5,L", OpcodeType.CB)
    @Opcode(0xAE, 16, "CB RES 5,(HL)", OpcodeType.CB)
    @Opcode(0xAF, 8, "CB RES 5,A", OpcodeType.CB)
    @Opcode(0xB0, 8, "CB RES 6,B", OpcodeType.CB)
    @Opcode(0xB1, 8, "CB RES 6,C", OpcodeType.CB)
    @Opcode(0xB2, 8, "CB RES 6,D", OpcodeType.CB)
    @Opcode(0xB3, 8, "CB RES 6,E", OpcodeType.CB)
    @Opcode(0xB4, 8, "CB RES 6,H", OpcodeType.CB)
    @Opcode(0xB5, 8, "CB RES 6,L", OpcodeType.CB)
    @Opcode(0xB6, 16, "CB RES 6,(HL)", OpcodeType.CB)
    @Opcode(0xB7, 8, "CB RES 6,A", OpcodeType.CB)
    @Opcode(0xB8, 8, "CB RES 7,B", OpcodeType.CB)
    @Opcode(0xB9, 8, "CB RES 7,C", OpcodeType.CB)
    @Opcode(0xBA, 8, "CB RES 7,D", OpcodeType.CB)
    @Opcode(0xBB, 8, "CB RES 7,E", OpcodeType.CB)
    @Opcode(0xBC, 8, "CB RES 7,H", OpcodeType.CB)
    @Opcode(0xBD, 8, "CB RES 7,L", OpcodeType.CB)
    @Opcode(0xBE, 16, "CB RES 7,(HL)", OpcodeType.CB)
    @Opcode(0xBF, 8, "CB RES 7,A", OpcodeType.CB)
    public static RES_0x87(opcode: number, cpu: CPU): void {
        const register = cpu.readByteRegisterType(opcode);
        const bit = (opcode & 0b00111000) >> 3;

        let result = 0;
        if ((opcode & 0x7) === 6) {
            result = cpu.MMU.read8(cpu.HL);
        } else {
            result = cpu[register];
        }

        result &= ~(1 << bit);

        if ((opcode & 0x7) === 6) {
            cpu.MMU.write8(cpu.HL, result);
        } else {
            cpu[register] = result;
        }
    }

    @Opcode(0xC0, 8, "CB SET 0,B", OpcodeType.CB)
    @Opcode(0xC1, 8, "CB SET 0,C", OpcodeType.CB)
    @Opcode(0xC2, 8, "CB SET 0,D", OpcodeType.CB)
    @Opcode(0xC3, 8, "CB SET 0,E", OpcodeType.CB)
    @Opcode(0xC4, 8, "CB SET 0,H", OpcodeType.CB)
    @Opcode(0xC5, 8, "CB SET 0,L", OpcodeType.CB)
    @Opcode(0xC6, 16, "CB SET 0,(HL)", OpcodeType.CB)
    @Opcode(0xC7, 8, "CB SET 0,A", OpcodeType.CB)
    @Opcode(0xC8, 8, "CB SET 1,B", OpcodeType.CB)
    @Opcode(0xC9, 8, "CB SET 1,C", OpcodeType.CB)
    @Opcode(0xCA, 8, "CB SET 1,D", OpcodeType.CB)
    @Opcode(0xCB, 8, "CB SET 1,E", OpcodeType.CB)
    @Opcode(0xCC, 8, "CB SET 1,H", OpcodeType.CB)
    @Opcode(0xCD, 8, "CB SET 1,L", OpcodeType.CB)
    @Opcode(0xCE, 16, "CB SET 1,(HL)", OpcodeType.CB)
    @Opcode(0xCF, 8, "CB SET 1,A", OpcodeType.CB)
    @Opcode(0xD0, 8, "CB SET 2,B", OpcodeType.CB)
    @Opcode(0xD1, 8, "CB SET 2,C", OpcodeType.CB)
    @Opcode(0xD2, 8, "CB SET 2,D", OpcodeType.CB)
    @Opcode(0xD3, 8, "CB SET 2,E", OpcodeType.CB)
    @Opcode(0xD4, 8, "CB SET 2,H", OpcodeType.CB)
    @Opcode(0xD5, 8, "CB SET 2,L", OpcodeType.CB)
    @Opcode(0xD6, 16, "CB SET 2,(HL)", OpcodeType.CB)
    @Opcode(0xD7, 8, "CB SET 2,A", OpcodeType.CB)
    @Opcode(0xD8, 8, "CB SET 3,B", OpcodeType.CB)
    @Opcode(0xD9, 8, "CB SET 3,C", OpcodeType.CB)
    @Opcode(0xDA, 8, "CB SET 3,D", OpcodeType.CB)
    @Opcode(0xDB, 8, "CB SET 3,E", OpcodeType.CB)
    @Opcode(0xDC, 8, "CB SET 3,H", OpcodeType.CB)
    @Opcode(0xDD, 8, "CB SET 3,L", OpcodeType.CB)
    @Opcode(0xDE, 16, "CB SET 3,(HL)", OpcodeType.CB)
    @Opcode(0xDF, 8, "CB SET 3,A", OpcodeType.CB)
    @Opcode(0xE0, 8, "CB SET 4,B", OpcodeType.CB)
    @Opcode(0xE1, 8, "CB SET 4,C", OpcodeType.CB)
    @Opcode(0xE2, 8, "CB SET 4,D", OpcodeType.CB)
    @Opcode(0xE3, 8, "CB SET 4,E", OpcodeType.CB)
    @Opcode(0xE4, 8, "CB SET 4,H", OpcodeType.CB)
    @Opcode(0xE5, 8, "CB SET 4,L", OpcodeType.CB)
    @Opcode(0xE6, 16, "CB SET 4,(HL)", OpcodeType.CB)
    @Opcode(0xE7, 8, "CB SET 4,A", OpcodeType.CB)
    @Opcode(0xE8, 8, "CB SET 5,B", OpcodeType.CB)
    @Opcode(0xE9, 8, "CB SET 5,C", OpcodeType.CB)
    @Opcode(0xEA, 8, "CB SET 5,D", OpcodeType.CB)
    @Opcode(0xEB, 8, "CB SET 5,E", OpcodeType.CB)
    @Opcode(0xEC, 8, "CB SET 5,H", OpcodeType.CB)
    @Opcode(0xED, 8, "CB SET 5,L", OpcodeType.CB)
    @Opcode(0xEE, 16, "CB SET 5,(HL)", OpcodeType.CB)
    @Opcode(0xEF, 8, "CB SET 5,A", OpcodeType.CB)
    @Opcode(0xF0, 8, "CB SET 6,B", OpcodeType.CB)
    @Opcode(0xF1, 8, "CB SET 6,C", OpcodeType.CB)
    @Opcode(0xF2, 8, "CB SET 6,D", OpcodeType.CB)
    @Opcode(0xF3, 8, "CB SET 6,E", OpcodeType.CB)
    @Opcode(0xF4, 8, "CB SET 6,H", OpcodeType.CB)
    @Opcode(0xF5, 8, "CB SET 6,L", OpcodeType.CB)
    @Opcode(0xF6, 16, "CB SET 6,(HL)", OpcodeType.CB)
    @Opcode(0xF7, 8, "CB SET 6,A", OpcodeType.CB)
    @Opcode(0xF8, 8, "CB SET 7,B", OpcodeType.CB)
    @Opcode(0xF9, 8, "CB SET 7,C", OpcodeType.CB)
    @Opcode(0xFA, 8, "CB SET 7,D", OpcodeType.CB)
    @Opcode(0xFB, 8, "CB SET 7,E", OpcodeType.CB)
    @Opcode(0xFC, 8, "CB SET 7,H", OpcodeType.CB)
    @Opcode(0xFD, 8, "CB SET 7,L", OpcodeType.CB)
    @Opcode(0xFE, 16, "CB SET 7,(HL)", OpcodeType.CB)
    @Opcode(0xFF, 8, "CB SET 7,A", OpcodeType.CB)
    public static SET_0xC0(opcode: number, cpu: CPU): void {
        const register = cpu.readByteRegisterType(opcode);
        const bit = (opcode & 0b00111000) >> 3;

        let result = 0;
        if ((opcode & 0x7) === 6) {
            result = cpu.MMU.read8(cpu.HL);
        } else {
            result = cpu[register];
        }

        result |= (1 << bit);

        if ((opcode & 0x7) === 6) {
            cpu.MMU.write8(cpu.HL, result);
        } else {
            cpu[register] = result;
        }
    }
}