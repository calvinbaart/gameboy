import { Opcodes, OpcodesCB, _opcodes, _cbopcodes } from "./opcodes";

const optimings = "1,3,2,2,1,1,2,1,5,2,2,2,1,1,2,1,\n \
    0,3,2,2,1,1,2,1,3,2,2,2,1,1,2,1,\n \
    2,3,2,2,1,1,2,1,2,2,2,2,1,1,2,1,\n \
    2,3,2,2,3,3,3,1,2,2,2,2,1,1,2,1,\n \
    1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,1,\n \
    1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,1,\n \
    1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,1,\n \
    2,2,2,2,2,2,0,2,1,1,1,1,1,1,2,1,\n \
    1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,1,\n \
    1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,1,\n \
    1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,1,\n \
    1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,1,\n \
    2,3,3,4,3,4,2,4,2,4,3,0,3,6,2,4,\n \
    2,3,3,0,3,4,2,4,2,4,3,0,3,0,2,4,\n \
    3,3,2,0,0,4,2,4,4,1,4,0,0,0,2,4,\n \
    3,3,2,1,0,4,2,4,3,2,4,1,0,0,2,4".split("\n")
    .map(x => x.trim()
        .split(",")
        .filter(y => y.trim().length > 0)
        .map(x => parseInt(x) * 4)
    );
    
const cboptimings = "2,2,2,2,2,2,4,2,2,2,2,2,2,2,4,2,\n \
    2,2,2,2,2,2,4,2,2,2,2,2,2,2,4,2,\n \
    2,2,2,2,2,2,4,2,2,2,2,2,2,2,4,2,\n \
    2,2,2,2,2,2,4,2,2,2,2,2,2,2,4,2,\n \
    2,2,2,2,2,2,3,2,2,2,2,2,2,2,3,2,\n \
    2,2,2,2,2,2,3,2,2,2,2,2,2,2,3,2,\n \
    2,2,2,2,2,2,3,2,2,2,2,2,2,2,3,2,\n \
    2,2,2,2,2,2,3,2,2,2,2,2,2,2,3,2,\n \
    2,2,2,2,2,2,4,2,2,2,2,2,2,2,4,2,\n \
    2,2,2,2,2,2,4,2,2,2,2,2,2,2,4,2,\n \
    2,2,2,2,2,2,4,2,2,2,2,2,2,2,4,2,\n \
    2,2,2,2,2,2,4,2,2,2,2,2,2,2,4,2,\n \
    2,2,2,2,2,2,4,2,2,2,2,2,2,2,4,2,\n \
    2,2,2,2,2,2,4,2,2,2,2,2,2,2,4,2,\n \
    2,2,2,2,2,2,4,2,2,2,2,2,2,2,4,2,\n \
    2,2,2,2,2,2,4,2,2,2,2,2,2,2,4,2".split("\n")
    .map(x => x.trim()
        .split(",")
        .filter(y => y.trim().length > 0)
        .map(x => parseInt(x) * 4)
    );

for (const index in _opcodes) {
    const opcode = parseInt(index);
    const column = opcode & 0xF;
    const row = (opcode >> 4) & 0xF;
    const timing = optimings[row][column];
    const current = _opcodes[opcode][0];

    if (timing !== current) {
        console.log(`mismatch: ${opcode.toString(16)}, current = ${current}, timing = ${timing}`);
    }
}

for (const index in _cbopcodes) {
    const opcode = parseInt(index);
    const column = opcode & 0xF;
    const row = (opcode >> 4) & 0xF;
    const timing = cboptimings[row][column];
    const current = _cbopcodes[opcode][0];

    if (timing !== current) {
        console.log(`cb mismatch: ${opcode.toString(16)}, current = ${current}, timing = ${timing}`);
    }
}