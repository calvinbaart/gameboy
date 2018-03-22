import { CPU, Key } from "./cpu";

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
            return setTimeout(callback, 1);
        }
    };
} else {
    global = window;

    document.addEventListener("keyup", (e) => {
        switch (e.key) {
            case "z":
                cpu.keyReleased(Key.A);
                break;
            
            case "x":
                cpu.keyReleased(Key.B);
                break;
            
            case "c":
                cpu.keyReleased(Key.Start);
                break;

            case "v":
                cpu.keyReleased(Key.Select);
                break;
            
            case "ArrowUp":
                cpu.keyReleased(Key.Up);
                break;

            case "ArrowDown":
                cpu.keyReleased(Key.Down);
                break;

            case "ArrowLeft":
                cpu.keyReleased(Key.Left);
                break;

            case "ArrowRight":
                cpu.keyReleased(Key.Right);
                break;
        }
    });

    document.addEventListener("keydown", (e) => {
        switch (e.key) {
            case "z":
                cpu.keyPressed(Key.A);
                break;

            case "x":
                cpu.keyPressed(Key.B);
                break;

            case "c":
                cpu.keyPressed(Key.Start);
                break;

            case "v":
                cpu.keyPressed(Key.Select);
                break;

            case "ArrowUp":
                cpu.keyPressed(Key.Up);
                break;

            case "ArrowDown":
                cpu.keyPressed(Key.Down);
                break;

            case "ArrowLeft":
                cpu.keyPressed(Key.Left);
                break;

            case "ArrowRight":
                cpu.keyPressed(Key.Right);
                break;
        }
    });
}

let stopEmulation = false;
const loop = () => {
    let cycles = Math.floor(4194304 / 60);

    if (stopEmulation) {
        cpu.Display.tick(cycles);
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

loop();