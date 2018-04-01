import { CPU, Key } from "./cpu";
import { Display } from "./display";
import { Memory } from "./memory";

let canvas: HTMLCanvasElement = null;
let context: CanvasRenderingContext2D = null;
let image: ImageData = null;

Display.setupWindow = (display: Display) => {
    canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 144;

    context = canvas.getContext("2d");
    context.fillStyle = "#dddddd";
    context.fillRect(0, 0, 160, 144);
    context.imageSmoothingEnabled = false;

    image = context.createImageData(160, 144);
    display._framebuffer = image.data;

    document.getElementById("emulator").appendChild(canvas);
};

Display.render = (display: Display) => {
    context.putImageData(image, 0, 0);
};

Memory.save = (memory: Memory, identifier: string, data: string) => {
    localStorage.setItem(identifier, data);
};

Memory.load = (memory: Memory, identifier: string) => {
    return localStorage.getItem(identifier);
};

const cpu = new CPU();
if (!cpu.setBios(require("../file-loader.js!../dist/bios/gbc_bios.bin"))) {
    console.log("Failed to load bios");
    process.exit(0);
}

if (!cpu.setRom(require("../file-loader.js!../dist/roms/pokemoncrystal.gbc"))) {
    console.log("Failed to load rom");
    process.exit(0);
}

(window as any).cpu = cpu;

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

let previousTime = Date.now();
let stopEmulation = false;
const loop = () => {
    const time = Date.now();
    const delta = time - previousTime;
    previousTime = time;

    let cycles = Math.floor(((4194304 * 2) / 1000.0) * delta);

    if (cycles >= (Math.floor(4194304 / 60) * 3)) {
        cycles = Math.floor(4194304 / 60) * 3;
    }
    
    if (stopEmulation) {
        cpu.Display.tick(cycles);
        requestAnimationFrame(loop);

        return;
    }

    const startCycles = cpu.cycles;
    while ((cpu.cycles - startCycles) < cycles) {
        if (!cpu.step()) {
            stopEmulation = true;
            break;
        }
    }

    requestAnimationFrame(loop);
};

loop();