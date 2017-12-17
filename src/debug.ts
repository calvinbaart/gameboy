import { CPU, Flags } from "./cpu";
import { _cbopcodes, _opcodes } from "./opcodes";

export interface IInstruction {
    name: string;
    state: { [key: string]: number };
    executed: number;
    callstack: IInstruction[];
    element: HTMLSpanElement;
}

export interface IFunction {
    name: string;
    addr: number;
    executed: number;
    ret: number[];
}

export class Debug
{
    private _cpu: CPU;
    private _instructions: {
        [key: string]: IInstruction
    };
    private _callstack: IInstruction[];
    private _functions: IFunction[];
    private _activeFunc: number[];

    constructor(cpu: CPU) {
        this._cpu = cpu;
        this._instructions = {};
        this._callstack = [];
        this._functions = [];
        this._activeFunc = [];
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

        let PCRaw = this._cpu.PC - 1;
        let PC = `${PCRaw.toString(16)}`;

        if (PC.length < 4) {
            PC = "0".repeat(4 - PC.length) + PC;
        }

        PC = `${PC}`;

        if (this._instructions[PC] === undefined) {
            let element = document.createElement("span");
            element.innerHTML = `<div class='location'>${PC}</div><div class='instruction'>${name}</div></div>`;

            const keys = Object.keys(this._instructions);
            keys.sort((a, b) => (PCRaw - parseInt(a, 16)) - (PCRaw - parseInt(b, 16)));
            
            // if (keys.length > 0) {
            //     if (parseInt(keys[0], 16) < PCRaw) {
            //         document.getElementById("instructions").insertBefore(element, this._instructions[keys[0]].element.nextElementSibling);
            //     } else {
            //         document.getElementById("instructions").insertBefore(element, this._instructions[keys[0]].element);
            //     }
            // } else {
            //     document.getElementById("instructions").appendChild(element);
            // }

            this._instructions[PC] = {
                name: name,
                state: {
                    "A": this._cpu.A,
                    "B": this._cpu.B,
                    "C": this._cpu.C,
                    "D": this._cpu.D,
                    "E": this._cpu.E,
                    "H": this._cpu.H,
                    "L": this._cpu.L,
                    "F": this._cpu.F,
                    "AF": this._cpu.AF,
                    "BC": this._cpu.BC,
                    "DE": this._cpu.DE,
                    "HL": this._cpu.HL,
                    "SP": this._cpu.SP,
                    "PC": this._cpu.PC
                },
                executed: 1,
                callstack: this._callstack.slice(0),
                element: element
            };
        } else {
            this._instructions[PC].executed++;
        }

        this._callstack.push({
            name: name,
            state: {
                "A": this._cpu.A,
                "B": this._cpu.B,
                "C": this._cpu.C,
                "D": this._cpu.D,
                "E": this._cpu.E,
                "H": this._cpu.H,
                "L": this._cpu.L,
                "F": this._cpu.F,
                "AF": this._cpu.AF,
                "BC": this._cpu.BC,
                "DE": this._cpu.DE,
                "HL": this._cpu.HL,
                "SP": this._cpu.SP,
                "PC": this._cpu.PC
            },
            executed: 1,
            callstack: null,
            element: null
        });

        if (this._callstack.length >= 5000) {
            this._callstack.shift();
        }
    }

    public func(addr: number, active: boolean = true): void {
        if (this._functions[addr] === undefined) {
            this._functions[addr] = {
                name: `func_0x${addr}`,
                addr: addr,
                ret: [],
                executed: active ? 1 : 0
            };
        } else if (active) {
            this._functions[addr].executed++;
        }

        if (active) {
            this._activeFunc.push(addr);
        }
    }

    public funcRet(addr: number): void {
        const active = this._activeFunc.pop();

        if (this._functions[active].ret.indexOf(addr) === -1) {
            this._functions[active].ret.push(addr);
        }
    }

    private debug(instruction: IInstruction): void {
        const registers = {
            "A": instruction.state.A.toString(16),
            "B": instruction.state.B.toString(16),
            "C": instruction.state.C.toString(16),
            "D": instruction.state.D.toString(16),
            "E": instruction.state.E.toString(16),
            "H": instruction.state.H.toString(16),
            "L": instruction.state.L.toString(16),
            "F": instruction.state.F.toString(16),
            "AF": instruction.state.AF.toString(16),
            "BC": instruction.state.BC.toString(16),
            "DE": instruction.state.DE.toString(16),
            "HL": instruction.state.HL.toString(16),
            "SP": instruction.state.SP.toString(16),
            "PC": instruction.state.PC.toString(16)
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

        // if(instruction.state.F & )
        if (instruction.state.F & Flags.AddSubFlag) {
            flags.push("N");
        } else {
            flags.push("NN");
        }

        if (instruction.state.F & Flags.CarryFlag) {
            flags.push("C");
        } else {
            flags.push("NC");
        }

        if (instruction.state.F & Flags.HalfCarryFlag) {
            flags.push("H");
        } else {
            flags.push("NH");
        }

        if (instruction.state.F & Flags.ZeroFlag) {
            flags.push("Z");
        } else {
            flags.push("NZ");
        }

        console.log(`${instruction.name} [${regs.join(", ")}, ${flags.join(" ")}]`);
    }
}