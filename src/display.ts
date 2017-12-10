import { CPU } from "./cpu";

export class Display {
    private _cpu: CPU;

    constructor(cpu: CPU) {
        this._cpu = cpu;
        this._cpu.MMU.mapMemory(0x8000, 0x9FFF, this.read.bind(this), this.write.bind(this));
    }

    public read(position: number, length: number): Buffer {
        console.log("READ VRAM");
        return this._cpu.MMU.readBuffer(0x8000 + position, length);
    }

    public write(position: number, buffer: Buffer): void {
        this._cpu.MMU.writeBuffer(0x8000 + position, buffer);
    }
}
