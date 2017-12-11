import { CPU } from "./cpu";

const cpu = new CPU();
if (!cpu.loadBios()) {
    console.log("Failed to load bios");
    process.exit(0);
}

let global: any = {};
if (process.env.APP_ENV !== "browser") {
    global = {
        requestAnimationFrame: function (callback) {
            return setTimeout(callback, 1 / 60);
        }
    };
} else {
    global = window;
}

let stopEmulation = false;
const loop = () => {
    const cycles = 3000;//Math.floor(4194304 / 60);

    if (stopEmulation) {
        cpu.Display.render();
        window.requestAnimationFrame(loop);

        return;
    }

    // while (cpu.cycles < cycles) {
    for (let i = 0; i < cycles / 8; i++) {
        if (!cpu.step()) {
            stopEmulation = true;
            return;
        }

        cpu.Display.render();
    }
    // }

    cpu.Display.render();
    // cpu.cycles -= cycles;
    window.requestAnimationFrame(loop);
};

window.requestAnimationFrame(loop);