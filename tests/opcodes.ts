import { expect } from 'chai';
import { CPU, Flags } from "../src/cpu";
import { Opcodes, OpcodesCB, _opcodes, _cbopcodes } from "../src/opcodes";

import 'mocha';

describe('Load constant to 8-bit', () => {
    let cpu: CPU = null;

    beforeEach((done) => {
        cpu = new CPU();
        cpu.MMU.write8(1, 0x37);
        cpu.PC = 1;

        done();
    });

    it('LD B,d8', () => {
        _opcodes[0x06][1](0x06, cpu);

        expect(cpu.B).to.equal(0x37);
    });

    it('LD C,d8', () => {
        _opcodes[0x0E][1](0x0E, cpu);

        expect(cpu.C).to.equal(0x37);
    });

    it('LD D,d8', () => {
        _opcodes[0x16][1](0x16, cpu);

        expect(cpu.D).to.equal(0x37);
    });

    it('LD E,d8', () => {
        _opcodes[0x1E][1](0x1E, cpu);

        expect(cpu.E).to.equal(0x37);
    });

    it('LD H,d8', () => {
        _opcodes[0x26][1](0x26, cpu);

        expect(cpu.H).to.equal(0x37);
    });

    it('LD L,d8', () => {
        _opcodes[0x2E][1](0x2E, cpu);

        expect(cpu.L).to.equal(0x37);
    });

    it('LD A,d8', () => {
        _opcodes[0x3E][1](0x3E, cpu);

        expect(cpu.A).to.equal(0x37);
    });
});

describe('Load constant to 16-bit', () => {
    let cpu: CPU = null;

    beforeEach((done) => {
        cpu = new CPU();
        cpu.MMU.write8(1, 0x37);
        cpu.MMU.write8(2, 0x00);
        cpu.PC = 1;

        done();
    });

    it('LD BC,d16', () => {
        _opcodes[0x01][1](0x01, cpu);

        expect(cpu.BC).to.equal(0x37);
    });

    it('LD DE,d16', () => {
        _opcodes[0x11][1](0x11, cpu);

        expect(cpu.DE).to.equal(0x37);
    });

    it('LD HL,d16', () => {
        _opcodes[0x21][1](0x21, cpu);

        expect(cpu.HL).to.equal(0x37);
    });

    it('LD SP,d16', () => {
        _opcodes[0x31][1](0x31, cpu);

        expect(cpu.SP).to.equal(0x37);
    });
});

describe('Load 8-bit to 8-bit', () => {
    let cpu: CPU = null;

    beforeEach((done) => {
        cpu = new CPU();
        cpu.PC = 1;

        done();
    });

    // B, x
    it('LD B,B', () => {
        cpu.B = 0x37;
        _opcodes[0x40][1](0x40, cpu);

        expect(cpu.B).to.equal(0x37);
    });

    it('LD B,C', () => {
        cpu.C = 0x37;
        _opcodes[0x41][1](0x41, cpu);

        expect(cpu.B).to.equal(0x37);
    });

    it('LD B,D', () => {
        cpu.D = 0x37;
        _opcodes[0x42][1](0x42, cpu);

        expect(cpu.B).to.equal(0x37);
    });

    it('LD B,E', () => {
        cpu.E = 0x37;
        _opcodes[0x43][1](0x43, cpu);

        expect(cpu.B).to.equal(0x37);
    });

    it('LD B,H', () => {
        cpu.H = 0x37;
        _opcodes[0x44][1](0x44, cpu);

        expect(cpu.B).to.equal(0x37);
    });

    it('LD B,L', () => {
        cpu.L = 0x37;
        _opcodes[0x45][1](0x45, cpu);

        expect(cpu.B).to.equal(0x37);
    });

    it('LD B,A', () => {
        cpu.A = 0x37;
        _opcodes[0x47][1](0x47, cpu);

        expect(cpu.B).to.equal(0x37);
    });

    // C, x
    it('LD C,B', () => {
        cpu.B = 0x37;
        _opcodes[0x48][1](0x48, cpu);

        expect(cpu.C).to.equal(0x37);
    });

    it('LD C,C', () => {
        cpu.C = 0x37;
        _opcodes[0x49][1](0x49, cpu);

        expect(cpu.C).to.equal(0x37);
    });

    it('LD C,D', () => {
        cpu.D = 0x37;
        _opcodes[0x4A][1](0x4A, cpu);

        expect(cpu.C).to.equal(0x37);
    });

    it('LD C,E', () => {
        cpu.E = 0x37;
        _opcodes[0x4B][1](0x4B, cpu);

        expect(cpu.C).to.equal(0x37);
    });

    it('LD C,H', () => {
        cpu.H = 0x37;
        _opcodes[0x4C][1](0x4C, cpu);

        expect(cpu.C).to.equal(0x37);
    });

    it('LD C,L', () => {
        cpu.L = 0x37;
        _opcodes[0x4D][1](0x4D, cpu);

        expect(cpu.C).to.equal(0x37);
    });

    it('LD C,A', () => {
        cpu.A = 0x37;
        _opcodes[0x4F][1](0x4F, cpu);

        expect(cpu.C).to.equal(0x37);
    });

    // D, x
    it('LD D,B', () => {
        cpu.B = 0x37;
        _opcodes[0x50][1](0x50, cpu);

        expect(cpu.D).to.equal(0x37);
    });

    it('LD D,C', () => {
        cpu.C = 0x37;
        _opcodes[0x51][1](0x51, cpu);

        expect(cpu.D).to.equal(0x37);
    });

    it('LD D,D', () => {
        cpu.D = 0x37;
        _opcodes[0x52][1](0x52, cpu);

        expect(cpu.D).to.equal(0x37);
    });

    it('LD D,E', () => {
        cpu.E = 0x37;
        _opcodes[0x53][1](0x53, cpu);

        expect(cpu.D).to.equal(0x37);
    });

    it('LD D,H', () => {
        cpu.H = 0x37;
        _opcodes[0x54][1](0x54, cpu);

        expect(cpu.D).to.equal(0x37);
    });

    it('LD D,L', () => {
        cpu.L = 0x37;
        _opcodes[0x55][1](0x55, cpu);

        expect(cpu.D).to.equal(0x37);
    });

    it('LD D,A', () => {
        cpu.A = 0x37;
        _opcodes[0x57][1](0x57, cpu);

        expect(cpu.D).to.equal(0x37);
    });

    // E, x
    it('LD E,B', () => {
        cpu.B = 0x37;
        _opcodes[0x58][1](0x58, cpu);

        expect(cpu.E).to.equal(0x37);
    });

    it('LD E,C', () => {
        cpu.C = 0x37;
        _opcodes[0x59][1](0x59, cpu);

        expect(cpu.E).to.equal(0x37);
    });

    it('LD E,D', () => {
        cpu.D = 0x37;
        _opcodes[0x5A][1](0x5A, cpu);

        expect(cpu.E).to.equal(0x37);
    });

    it('LD E,E', () => {
        cpu.E = 0x37;
        _opcodes[0x5B][1](0x5B, cpu);

        expect(cpu.E).to.equal(0x37);
    });

    it('LD E,H', () => {
        cpu.H = 0x37;
        _opcodes[0x5C][1](0x5C, cpu);

        expect(cpu.E).to.equal(0x37);
    });

    it('LD E,L', () => {
        cpu.L = 0x37;
        _opcodes[0x5D][1](0x5D, cpu);

        expect(cpu.E).to.equal(0x37);
    });

    it('LD E,A', () => {
        cpu.A = 0x37;
        _opcodes[0x5F][1](0x5F, cpu);

        expect(cpu.E).to.equal(0x37);
    });

    // H, x
    it('LD H,B', () => {
        cpu.B = 0x37;
        _opcodes[0x60][1](0x60, cpu);

        expect(cpu.H).to.equal(0x37);
    });

    it('LD H,C', () => {
        cpu.C = 0x37;
        _opcodes[0x61][1](0x61, cpu);

        expect(cpu.H).to.equal(0x37);
    });

    it('LD H,D', () => {
        cpu.D = 0x37;
        _opcodes[0x62][1](0x62, cpu);

        expect(cpu.H).to.equal(0x37);
    });

    it('LD H,E', () => {
        cpu.E = 0x37;
        _opcodes[0x63][1](0x63, cpu);

        expect(cpu.H).to.equal(0x37);
    });

    it('LD H,H', () => {
        cpu.H = 0x37;
        _opcodes[0x64][1](0x64, cpu);

        expect(cpu.H).to.equal(0x37);
    });

    it('LD H,L', () => {
        cpu.L = 0x37;
        _opcodes[0x65][1](0x65, cpu);

        expect(cpu.H).to.equal(0x37);
    });

    it('LD H,A', () => {
        cpu.A = 0x37;
        _opcodes[0x67][1](0x67, cpu);

        expect(cpu.H).to.equal(0x37);
    });

    // L, x
    it('LD L,B', () => {
        cpu.B = 0x37;
        _opcodes[0x68][1](0x68, cpu);

        expect(cpu.L).to.equal(0x37);
    });

    it('LD L,C', () => {
        cpu.C = 0x37;
        _opcodes[0x69][1](0x69, cpu);

        expect(cpu.L).to.equal(0x37);
    });

    it('LD L,D', () => {
        cpu.D = 0x37;
        _opcodes[0x6A][1](0x6A, cpu);

        expect(cpu.L).to.equal(0x37);
    });

    it('LD L,E', () => {
        cpu.E = 0x37;
        _opcodes[0x6B][1](0x6B, cpu);

        expect(cpu.L).to.equal(0x37);
    });

    it('LD L,H', () => {
        cpu.H = 0x37;
        _opcodes[0x6C][1](0x6C, cpu);

        expect(cpu.L).to.equal(0x37);
    });

    it('LD L,L', () => {
        cpu.L = 0x37;
        _opcodes[0x6D][1](0x6D, cpu);

        expect(cpu.L).to.equal(0x37);
    });

    it('LD L,A', () => {
        cpu.A = 0x37;
        _opcodes[0x6F][1](0x6F, cpu);

        expect(cpu.L).to.equal(0x37);
    });

    // L, x
    it('LD A,B', () => {
        cpu.B = 0x37;
        _opcodes[0x78][1](0x78, cpu);

        expect(cpu.A).to.equal(0x37);
    });

    it('LD A,C', () => {
        cpu.C = 0x37;
        _opcodes[0x79][1](0x79, cpu);

        expect(cpu.A).to.equal(0x37);
    });

    it('LD A,D', () => {
        cpu.D = 0x37;
        _opcodes[0x7A][1](0x7A, cpu);

        expect(cpu.A).to.equal(0x37);
    });

    it('LD A,E', () => {
        cpu.E = 0x37;
        _opcodes[0x7B][1](0x7B, cpu);

        expect(cpu.A).to.equal(0x37);
    });

    it('LD A,H', () => {
        cpu.H = 0x37;
        _opcodes[0x7C][1](0x7C, cpu);

        expect(cpu.A).to.equal(0x37);
    });

    it('LD A,L', () => {
        cpu.L = 0x37;
        _opcodes[0x7D][1](0x7D, cpu);

        expect(cpu.A).to.equal(0x37);
    });

    it('LD A,A', () => {
        cpu.A = 0x37;
        _opcodes[0x7F][1](0x7F, cpu);

        expect(cpu.A).to.equal(0x37);
    });
});

describe('Load 8-bit from Memory', () => {
    let cpu: CPU = null;

    beforeEach((done) => {
        cpu = new CPU();
        cpu.MMU.write8(1, 0x37);
        cpu.PC = 1;
        cpu.HL = 1;

        done();
    });

    it('LD B,(HL)', () => {
        _opcodes[0x46][1](0x46, cpu);

        expect(cpu.B).to.equal(0x37);
    });

    it('LD C,(HL)', () => {
        _opcodes[0x4E][1](0x4E, cpu);

        expect(cpu.C).to.equal(0x37);
    });

    it('LD D,(HL)', () => {
        _opcodes[0x56][1](0x56, cpu);

        expect(cpu.D).to.equal(0x37);
    });

    it('LD E,(HL)', () => {
        _opcodes[0x5E][1](0x5E, cpu);

        expect(cpu.E).to.equal(0x37);
    });

    it('LD H,(HL)', () => {
        _opcodes[0x66][1](0x66, cpu);

        expect(cpu.H).to.equal(0x37);
    });

    it('LD L,(HL)', () => {
        _opcodes[0x6E][1](0x6E, cpu);

        expect(cpu.L).to.equal(0x37);
    });

    it('LD A,(HL)', () => {
        _opcodes[0x7E][1](0x7E, cpu);

        expect(cpu.A).to.equal(0x37);
    });
});

describe('Load Memory from 8-bit', () => {
    let cpu: CPU = null;

    beforeEach((done) => {
        cpu = new CPU();
        cpu.PC = 1;
        cpu.HL = 1;

        done();
    });

    it('LD (HL),B', () => {
        cpu.B = 0x37;
        _opcodes[0x70][1](0x70, cpu);

        expect(cpu.MMU.read8(1)).to.equal(0x37);
    });

    it('LD (HL),C', () => {
        cpu.C = 0x37;
        _opcodes[0x71][1](0x71, cpu);

        expect(cpu.MMU.read8(1)).to.equal(0x37);
    });

    it('LD (HL),D', () => {
        cpu.D = 0x37;
        _opcodes[0x72][1](0x72, cpu);

        expect(cpu.MMU.read8(1)).to.equal(0x37);
    });

    it('LD (HL),E', () => {
        cpu.E = 0x37;
        _opcodes[0x73][1](0x73, cpu);

        expect(cpu.MMU.read8(1)).to.equal(0x37);
    });

    it('LD (HL),H', () => {
        cpu.H = 0x37;
        _opcodes[0x74][1](0x74, cpu);

        expect(cpu.MMU.read8(0x3701)).to.equal(0x37);
    });

    it('LD (HL),L', () => {
        cpu.L = 0x37;
        _opcodes[0x75][1](0x75, cpu);

        expect(cpu.MMU.read8(0x37)).to.equal(0x37);
    });

    it('LD (HL),A', () => {
        cpu.A = 0x37;
        _opcodes[0x77][1](0x77, cpu);

        expect(cpu.MMU.read8(1)).to.equal(0x37);
    });
});

describe('Decrease 8-bit', () => {
    let cpu: CPU = null;

    beforeEach((done) => {
        cpu = new CPU();
        cpu.PC = 1;

        done();
    });

    it("DEC B", () => {
        cpu.B = 0x38;
        _opcodes[0x05][1](0x05, cpu);

        expect(cpu.B).to.equal(0x37);
    });

    it("DEC C", () => {
        cpu.C = 0x38;
        _opcodes[0x0D][1](0x0D, cpu);

        expect(cpu.C).to.equal(0x37);
    });

    it("DEC D", () => {
        cpu.D = 0x38;
        _opcodes[0x15][1](0x15, cpu);

        expect(cpu.D).to.equal(0x37);
    });

    it("DEC E", () => {
        cpu.E = 0x38;
        _opcodes[0x1D][1](0x1D, cpu);

        expect(cpu.E).to.equal(0x37);
    });

    it("DEC H", () => {
        cpu.H = 0x38;
        _opcodes[0x25][1](0x25, cpu);

        expect(cpu.H).to.equal(0x37);
    });

    it("DEC L", () => {
        cpu.L = 0x38;
        _opcodes[0x2D][1](0x2D, cpu);

        expect(cpu.L).to.equal(0x37);
    });

    it("DEC A", () => {
        cpu.A = 0x38;
        _opcodes[0x3D][1](0x3D, cpu);

        expect(cpu.A).to.equal(0x37);
    });
});

describe('Decrease 16-bit', () => {
    let cpu: CPU = null;

    beforeEach((done) => {
        cpu = new CPU();
        cpu.PC = 1;

        done();
    });

    it("DEC BC", () => {
        cpu.BC = 0x38;
        _opcodes[0x0B][1](0x0B, cpu);

        expect(cpu.BC).to.equal(0x37);
    });

    it("DEC DE", () => {
        cpu.DE = 0x38;
        _opcodes[0x1B][1](0x1B, cpu);

        expect(cpu.DE).to.equal(0x37);
    });

    it("DEC HL", () => {
        cpu.HL = 0x38;
        _opcodes[0x2B][1](0x2B, cpu);

        expect(cpu.HL).to.equal(0x37);
    });

    it("DEC SP", () => {
        cpu.SP = 0x38;
        _opcodes[0x3B][1](0x3B, cpu);

        expect(cpu.SP).to.equal(0x37);
    });
});

describe('Increase 8-bit', () => {
    let cpu: CPU = null;

    beforeEach((done) => {
        cpu = new CPU();
        cpu.PC = 1;

        done();
    });

    it("INC B", () => {
        cpu.B = 0x36;
        _opcodes[0x04][1](0x04, cpu);

        expect(cpu.B).to.equal(0x37);
    });

    it("INC C", () => {
        cpu.C = 0x36;
        _opcodes[0x0C][1](0x0C, cpu);

        expect(cpu.C).to.equal(0x37);
    });

    it("INC D", () => {
        cpu.D = 0x36;
        _opcodes[0x14][1](0x14, cpu);

        expect(cpu.D).to.equal(0x37);
    });

    it("INC E", () => {
        cpu.E = 0x36;
        _opcodes[0x1C][1](0x1C, cpu);

        expect(cpu.E).to.equal(0x37);
    });

    it("INC H", () => {
        cpu.H = 0x36;
        _opcodes[0x24][1](0x24, cpu);

        expect(cpu.H).to.equal(0x37);
    });

    it("INC L", () => {
        cpu.L = 0x36;
        _opcodes[0x2C][1](0x2C, cpu);

        expect(cpu.L).to.equal(0x37);
    });

    it("INC A", () => {
        cpu.A = 0x36;
        _opcodes[0x3C][1](0x3C, cpu);

        expect(cpu.A).to.equal(0x37);
    });
});

describe('Increase 16-bit', () => {
    let cpu: CPU = null;

    beforeEach((done) => {
        cpu = new CPU();
        cpu.PC = 1;

        done();
    });

    it("INC BC", () => {
        cpu.BC = 0x36;
        _opcodes[0x03][1](0x03, cpu);

        expect(cpu.BC).to.equal(0x37);
    });

    it("INC DE", () => {
        cpu.DE = 0x36;
        _opcodes[0x13][1](0x13, cpu);

        expect(cpu.DE).to.equal(0x37);
    });

    it("INC HL", () => {
        cpu.HL = 0x36;
        _opcodes[0x23][1](0x23, cpu);

        expect(cpu.HL).to.equal(0x37);
    });

    it("INC SP", () => {
        cpu.SP = 0x36;
        _opcodes[0x33][1](0x33, cpu);

        expect(cpu.SP).to.equal(0x37);
    });
});

describe('Add HL', () => {
    let cpu: CPU = null;

    beforeEach((done) => {
        cpu = new CPU();
        cpu.PC = 1;
        cpu.HL = 0x37;

        done();
    });

    it("ADD HL,BC", () => {
        cpu.BC = 0x37;
        _opcodes[0x09][1](0x09, cpu);

        expect(cpu.HL).to.equal(0x6E);
    });

    it("ADD HL,DE", () => {
        cpu.DE = 0x37;
        _opcodes[0x19][1](0x19, cpu);

        expect(cpu.HL).to.equal(0x6E);
    });

    it("ADD HL,HL", () => {
        cpu.HL = 0x37;
        _opcodes[0x29][1](0x29, cpu);

        expect(cpu.HL).to.equal(0x6E);
    });

    it("ADD HL,SP", () => {
        cpu.SP = 0x37;
        _opcodes[0x39][1](0x39, cpu);

        expect(cpu.HL).to.equal(0x6E);
    });
});

describe('Add HL', () => {
    let cpu: CPU = null;

    beforeEach((done) => {
        cpu = new CPU();
        cpu.PC = 1;
        cpu.MMU.write8(1, 0x37);

        done();
    });

    it("JR NZ,r8 NZ", () => {
        cpu.disableFlag(Flags.ZeroFlag);

        _opcodes[0x20][1](0x20, cpu);

        expect(cpu.PC).to.equal(0x39);
    });

    it("JR NZ,r8 Z", () => {
        cpu.enableFlag(Flags.ZeroFlag);

        _opcodes[0x20][1](0x20, cpu);

        expect(cpu.PC).to.equal(0x02);
    });

    it("JR Z,r8 NZ", () => {
        cpu.disableFlag(Flags.ZeroFlag);

        _opcodes[0x28][1](0x28, cpu);

        expect(cpu.PC).to.equal(0x02);
    });

    it("JR Z,r8 Z", () => {
        cpu.enableFlag(Flags.ZeroFlag);

        _opcodes[0x28][1](0x28, cpu);

        expect(cpu.PC).to.equal(0x39);
    });

    it("JR NC,r8 NC", () => {
        cpu.disableFlag(Flags.CarryFlag);

        _opcodes[0x30][1](0x30, cpu);

        expect(cpu.PC).to.equal(0x39);
    });

    it("JR NC,r8 C", () => {
        cpu.enableFlag(Flags.CarryFlag);

        _opcodes[0x30][1](0x30, cpu);

        expect(cpu.PC).to.equal(0x02);
    });

    it("JR C,r8 NC", () => {
        cpu.disableFlag(Flags.CarryFlag);

        _opcodes[0x38][1](0x38, cpu);

        expect(cpu.PC).to.equal(0x02);
    });

    it("JR C,r8 C", () => {
        cpu.enableFlag(Flags.CarryFlag);

        _opcodes[0x38][1](0x38, cpu);

        expect(cpu.PC).to.equal(0x39);
    });
});

describe('Add 8-bit to A', () => {
    let cpu: CPU = null;

    beforeEach((done) => {
        cpu = new CPU();
        cpu.PC = 1;
        cpu.A = 0x37;

        done();
    });

    it("ADD A,B", () => {
        cpu.B = 0x37;

        _opcodes[0x80][1](0x80, cpu);

        expect(cpu.A).to.equal(0x6E);
    });

    it("ADD A,C", () => {
        cpu.C = 0x37;

        _opcodes[0x81][1](0x81, cpu);

        expect(cpu.A).to.equal(0x6E);
    });

    it("ADD A,D", () => {
        cpu.D = 0x37;

        _opcodes[0x82][1](0x82, cpu);

        expect(cpu.A).to.equal(0x6E);
    });

    it("ADD A,E", () => {
        cpu.E = 0x37;

        _opcodes[0x83][1](0x83, cpu);

        expect(cpu.A).to.equal(0x6E);
    });

    it("ADD A,H", () => {
        cpu.H = 0x37;

        _opcodes[0x84][1](0x84, cpu);

        expect(cpu.A).to.equal(0x6E);
    });

    it("ADD A,L", () => {
        cpu.L = 0x37;

        _opcodes[0x85][1](0x85, cpu);

        expect(cpu.A).to.equal(0x6E);
    });

    it("ADD A,A", () => {
        cpu.A = 0x37;

        _opcodes[0x87][1](0x87, cpu);

        expect(cpu.A).to.equal(0x6E);
    });
});

describe('Sub 8-bit from A', () => {
    let cpu: CPU = null;

    beforeEach((done) => {
        cpu = new CPU();
        cpu.PC = 1;
        cpu.A = 0x6E;

        done();
    });

    it("SUB A,B", () => {
        cpu.B = 0x37;

        _opcodes[0x90][1](0x90, cpu);

        expect(cpu.A).to.equal(0x37);
    });

    it("SUB A,C", () => {
        cpu.C = 0x37;

        _opcodes[0x91][1](0x91, cpu);

        expect(cpu.A).to.equal(0x37);
    });

    it("SUB A,D", () => {
        cpu.D = 0x37;

        _opcodes[0x92][1](0x92, cpu);

        expect(cpu.A).to.equal(0x37);
    });

    it("SUB A,E", () => {
        cpu.E = 0x37;

        _opcodes[0x93][1](0x93, cpu);

        expect(cpu.A).to.equal(0x37);
    });

    it("SUB A,H", () => {
        cpu.H = 0x37;

        _opcodes[0x94][1](0x94, cpu);

        expect(cpu.A).to.equal(0x37);
    });

    it("SUB A,L", () => {
        cpu.L = 0x37;

        _opcodes[0x95][1](0x95, cpu);

        expect(cpu.A).to.equal(0x37);
    });

    it("SUB A,A", () => {
        cpu.A = 0x37;

        _opcodes[0x97][1](0x97, cpu);

        expect(cpu.A).to.equal(0x0);
    });
});