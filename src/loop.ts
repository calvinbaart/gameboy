import { CPU } from "./core/cpu/cpu";

let previousTime = Date.now();
let stopEmulation = false;

export function createLoop(nextFrame: (func: any) => void, global: any) {
    function loop() {
        let cpu: CPU | null = global.cpu;

        const time = Date.now();
        const delta = time - previousTime;
        previousTime = time;

        if (cpu === null) {
            nextFrame(loop);
            return;
        }

        let cycles = Math.floor(((4194304 * 3) / 1000.0) * delta);

        if (cycles >= (Math.floor(4194304 / 60) * 3)) {
            cycles = Math.floor(4194304 / 60) * 3;
        }

        if (stopEmulation) {
            cpu.Display.tick(cycles);
            nextFrame(loop);

            return;
        }

        const startCycles = cpu.cycles;
        while ((cpu.cycles - startCycles) < cycles) {
            if (!cpu.step()) {
                stopEmulation = true;
                break;
            }
        }

        nextFrame(loop);
    }

    loop();
}