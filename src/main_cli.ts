import { CPU, Key, Instruction, Register } from "./cpu";
import * as fs from "fs";
import { Display } from "./display";
import { Memory } from "./memory";

Display.setupWindow = (display: Display) => {
    display._framebuffer = new Uint8ClampedArray(160 * 144 * 4);
};

Display.render = (display: Display) => {
    // ignore
};

Memory.save = (memory: Memory, identifier: string, data: string) => {
    // ignore
};

Memory.load = (memory: Memory, identifier: string) => {
    return null;
};

function fixedstring(str: string, length: number): string {
    while (str.length < length) {
        str = "0" + str;
    }

    return str;
}

const trace = fs.openSync("trace.txt", "w+");
CPU.onInstruction = (cpu: CPU, instruction: Instruction) => {
    if (cpu._inBootstrap) {
        return;
    }
    
    let pc: string = fixedstring(instruction.pc.toString(16), 6);
    let registers: string = "";
    // registers += `A:${fixedstring(instruction.registers[Register.A].toString(16), 2)}`
    // registers += `,B:${fixedstring(instruction.registers[Register.B].toString(16), 2)}`
    // registers += `,C:${fixedstring(instruction.registers[Register.C].toString(16), 2)}`
    // registers += `,D:${fixedstring(instruction.registers[Register.D].toString(16), 2)}`
    // registers += `,E:${fixedstring(instruction.registers[Register.E].toString(16), 2)}`
    // registers += `,H:${fixedstring(instruction.registers[Register.H].toString(16), 2)}`
    // registers += `,L:${fixedstring(instruction.registers[Register.L].toString(16), 2)}`
    // registers += `,F:${fixedstring(instruction.registers[Register.F].toString(16), 2)}`
    registers += `,SP:${fixedstring(instruction.registers16[0].toString(16), 4)}`

    fs.writeSync(trace, `[${pc}] ${instruction.opcodeName} [${registers}]\r\n`);
};

const cpu = new CPU();
cpu._collectTrace = true;

if (!cpu.setBios(fs.readFileSync("bios/gbc_bios.bin"))) {
    console.log("Failed to load bios");
    process.exit(0);
}

if (!cpu.setRom(fs.readFileSync("roms/pokemongold.gbc"))) {
    console.log("Failed to load rom");
    process.exit(0);
}

let previousTime = Date.now();
let stopEmulation = false;
const loop = () => {
    const time = Date.now();
    const delta = time - previousTime;
    previousTime = time;

    let cycles = Math.floor((4194304 / 1000.0) * delta) * 1;

    if (stopEmulation) {
        cpu.Display.tick(cycles);
        return;
    }

    const startCycles = cpu.cycles;
    while ((cpu.cycles - startCycles) < cycles) {
        if (!cpu.step()) {
            stopEmulation = true;
            break;
        }
    }

    setTimeout(loop, 1);
};

loop();