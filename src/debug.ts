import { CPU, Flags } from "./cpu";
import { _cbopcodes, _opcodes } from "./opcodes";

export class Debug
{
    private _cpu: CPU;
    private _instructions: string[];

    constructor(cpu: CPU) {
        this._cpu = cpu;
        this._instructions = [];
    }

    public instruction(code: number, code2?: number) {
        let pc = this._cpu.PC.toString(16);

        if(pc.length < 4) {
            pc = "0".repeat(4 - pc.length) + pc;
        }

        let name = "";
        if(code === 0xCB) {
            if(_cbopcodes[code2] !== undefined) {
                name = _cbopcodes[code2][2];
            } else {
                name = `unknown opcode CB 0x${code2.toString(16)}`;
            }
        } else {
            if(_opcodes[code] !== undefined) {
                name = _opcodes[code][2];
            } else {
                name = `unknown opcode 0x${code2.toString(16)}`;
            }
        }

        this.debug(name);
        this._instructions.push(name);
        // document.getElementById("instructions").innerText = this._instructions.join("\r\n");
    }

    private debug(opcode: string): void {
        const registers = {
            "A": this._cpu.A.toString(16),
            "B": this._cpu.B.toString(16),
            "C": this._cpu.C.toString(16),
            "D": this._cpu.D.toString(16),
            "E": this._cpu.E.toString(16),
            "H": this._cpu.H.toString(16),
            "L": this._cpu.L.toString(16),
            "F": this._cpu.F.toString(16),
            "BC": this._cpu.BC.toString(16),
            "DE": this._cpu.DE.toString(16),
            "HL": this._cpu.HL.toString(16),
            "SP": this._cpu.SP.toString(16),
            "PC": this._cpu.PC.toString(16)
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

        let flags = [];

        if (this._cpu.isFlagSet(Flags.AddSubFlag)) {
            flags.push("N");
        } else {
            flags.push("NN");
        }

        if (this._cpu.isFlagSet(Flags.CarryFlag)) {
            flags.push("C");
        } else {
            flags.push("NC");
        }

        if (this._cpu.isFlagSet(Flags.HalfCarryFlag)) {
            flags.push("H");
        } else {
            flags.push("NH");
        }

        if (this._cpu.isFlagSet(Flags.ZeroFlag)) {
            flags.push("Z");
        } else {
            flags.push("NZ");
        }

        console.log(`${opcode} [${regs.join(", ")}, ${flags.join(" ")}]`);
    }
}