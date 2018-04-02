import { CPU } from "./cpu";

export interface Instruction {
    isCB: boolean;
    opcode: number;
    pc: number;
    ticks: number;
    cpu: CPU;

    registers: Uint8Array | null;
    registers16: Uint16Array | null;
    opcodeName: string;

    exec: ((instruction: Instruction) => void) | null;
};