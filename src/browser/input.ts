import { CPU } from "../core/cpu/cpu";
import { Key } from "../core/cpu/key";

export class Input {
    public static setup() {
        document.addEventListener("keyup", (e) => {
            const cpu: CPU | null = (window as any).cpu;

            if (cpu === null) {
                return;
            }

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
            const cpu: CPU | null = (window as any).cpu;

            if (cpu === null) {
                return;
            }

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
}