import { readFileSync } from "fs";
import { Video } from "./core/video/video";
import { Memory } from "./core/memory/memory";
import { CPU } from "./core/cpu/cpu";
import { createLoop } from "./loop";

Video.setupWindow = (display: Video) => {
    display._framebuffer = new Uint8ClampedArray(160 * 144 * 4);
};

Video.render = (display: Video) => {
    // ignore
};

Memory.save = (memory: Memory, identifier: string, data: string) => {
    // ignore
};

Memory.load = (memory: Memory, identifier: string) => {
    return null;
};

const cpu = new CPU();
cpu._collectTrace = true;

if (!cpu.setBios(readFileSync("bios/gbc_bios.bin"))) {
    console.log("Failed to load bios");
    process.exit(0);
}

if (!cpu.setRom(readFileSync("roms/pokemongold.gbc"))) {
    console.log("Failed to load rom");
    process.exit(0);
}

createLoop((func: () => void) => {
    setTimeout(func, 1);
}, {
    cpu
});