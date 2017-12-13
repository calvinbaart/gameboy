import { CPU } from "./cpu";

const cpu = new CPU();
if (!cpu.loadBios()) {
    console.log("Failed to load bios");
    process.exit(0);
}

if (!cpu.loadRom()) {
    console.log("Failed to load rom");
    process.exit(0);
}

let global: any = {};
if (process.env.APP_ENV !== "browser") {
    global = {
        requestAnimationFrame: function (callback) {
            return setTimeout(callback, (1.0 / 60) * 1000);
        }
    };
} else {
    global = window;
}

let stopEmulation = false;
const loop = () => {
    const cycles = Math.floor((4194304 / 60) / 4);

    if (stopEmulation) {
        for (let i = 0; i < cycles; i++) {
            cpu.Display.tick();
        }

        global.requestAnimationFrame(loop);

        return;
    }

    while (cpu.cycles < cycles) {
        if (!cpu.step()) {
            stopEmulation = true;
            break;
        }
    }

    cpu.cycles -= cycles;
    global.requestAnimationFrame(loop);
};

global.requestAnimationFrame(loop);