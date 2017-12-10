import { CPU } from "./cpu";

const cpu = new CPU();
if (!cpu.loadBios()) {
    console.log("Failed to load bios");
    process.exit(0);
}

let global = {
    requestAnimationFrame: (callback: () => void) => {
        window.requestAnimationFrame(callback);
    }
};

if (typeof process === 'object') {
    global.requestAnimationFrame = (callback: () => void) => {
        setTimeout(callback, 1);
    };
}

const loop = () => {
    if (!cpu.step()) {
        return;
    }

    global.requestAnimationFrame(loop);
};

global.requestAnimationFrame(loop);