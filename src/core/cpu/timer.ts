import { CPU } from "./cpu";
import { Interrupt } from "./interrupt";

export class Timer
{
    private _cpu: CPU;
    private _div: number;
    private _tima: number;
    private _tma: number;
    private _tac: number;

    // internal
    private _divCycles: number;
    private _timerCycles: number;

    constructor(cpu: CPU) {
        this._cpu = cpu;
        this._div = 0;
        this._tima = 0;
        this._tma = 0;
        this._tac = 0;

        this._divCycles = 0;
        this._timerCycles = 0;

        cpu.MMU.addRegister(0xFF07, this._readTAC.bind(this), this._writeTAC.bind(this));
        cpu.MMU.addRegister(0xFF04, this._readDIV.bind(this), this._writeDIV.bind(this));
        cpu.MMU.addRegister(0xFF05, this._readTIMA.bind(this), this._writeTIMA.bind(this));
        cpu.MMU.addRegister(0xFF06, this._readTMA.bind(this), this._writeTMA.bind(this));
    }

    public tick(cycles: number): void {
        this._divCycles += cycles;

        while (this._divCycles >= 256) {
            this._divCycles -= 256;
            this._div = (this._div + 1) & 0xFF;
        }

        if ((this._tac & 0x04) == 0) {
            return;
        }

        this._timerCycles += cycles;

        let ticksNeeded = 256;
        
        //4096 = per 256 = 1024
        //16384 = per 64 = 256
        //65536 = per 16 = 64
        //262144 = per 4 = 16
        
        switch (this._tac & 0x03) {
            case 0: //4096 hz
                ticksNeeded = 1024;
                break;
            
            case 3: //16384 hz
                ticksNeeded = 256;
                break;

            case 2: //65536 hz
                ticksNeeded = 64;
                break;

            case 1: //262144 hz
                ticksNeeded = 16;
                break;
        }

        while (this._timerCycles >= ticksNeeded) {
            this._timerCycles -= ticksNeeded;

            if (this._tima === 0xFF) {
                this._tima = this._tma;
                this._cpu.requestInterrupt(Interrupt.Timer);
            } else {
                this._tima++;
            }
        }
    }

    private _readTAC(): number {
        return this._tac | 0b11111000;
    }

    private _readDIV(): number {
        return this._div;
    }

    private _readTIMA(): number {
        return this._tima;
    }

    private _readTMA(): number {
        return this._tma;
    }

    private _writeTAC(val: number): void {
        this._tac = val & 0xFF;
    }

    private _writeDIV(val: number): void {
        // writing any value to div resets it
        this._div = 0;
    }

    private _writeTIMA(val: number): void {
        this._tima = val & 0xFF;
    }

    private _writeTMA(val: number): void {
        this._tma = val & 0xFF;
    }
}