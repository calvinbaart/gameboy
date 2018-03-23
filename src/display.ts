import { CPU, SpecialRegister, Interrupt } from "./cpu";
const document = require("./browser.js");

const GameboyColorPalette = [
    0xEB, 0xC4, 0x60, 0x00
];

enum DisplayRegister {
    LCDC,
    STAT,
    SCY,
    SCX,
    LY,
    LYC,
    DMA,
    BGP,
    OBP0,
    OBP1,
    WY,
    WX
}

enum DisplayMode {
    HBlank,
    VBlank,
    ReadingOAM,
    ReadingOAMVRAM
}

export class Display {
    private _cpu: CPU;
    private _registers: Uint8Array;
    private _context;
    private _data;

    private _backgroundTilemap: number;
    private _windowTilemap: number;
    private _activeTileset: number;
    private _framebuffer: Uint8ClampedArray;
    private _cycles: number;
    private _cyclesExtra: number;
    private _vblank: number;
    private _scanlineTransferred: boolean;

    constructor(cpu: CPU) {
        this._cpu = cpu;
        this._registers = new Uint8Array(0x0B);
        this._cycles = 0;
        this._cyclesExtra = 0;
        this._vblank = 0;
        this._scanlineTransferred = false;

        this._cpu.MMU.addRegister(0xFF40, this._readRegister.bind(this, DisplayRegister.LCDC), this._writeRegister.bind(this, DisplayRegister.LCDC));
        this._cpu.MMU.addRegister(0xFF41, this._readRegister.bind(this, DisplayRegister.STAT), this._writeRegister.bind(this, DisplayRegister.STAT));
        this._cpu.MMU.addRegister(0xFF42, this._readRegister.bind(this, DisplayRegister.SCY), this._writeRegister.bind(this, DisplayRegister.SCY));
        this._cpu.MMU.addRegister(0xFF43, this._readRegister.bind(this, DisplayRegister.SCX), this._writeRegister.bind(this, DisplayRegister.SCX));
        this._cpu.MMU.addRegister(0xFF44, this._readRegister.bind(this, DisplayRegister.LY), this._writeRegister.bind(this, DisplayRegister.LY));
        this._cpu.MMU.addRegister(0xFF45, this._readRegister.bind(this, DisplayRegister.LYC), this._writeRegister.bind(this, DisplayRegister.LYC));
        this._cpu.MMU.addRegister(0xFF46, this._readRegister.bind(this, DisplayRegister.DMA), this._writeRegister.bind(this, DisplayRegister.DMA));
        this._cpu.MMU.addRegister(0xFF47, this._readRegister.bind(this, DisplayRegister.BGP), this._writeRegister.bind(this, DisplayRegister.BGP));
        this._cpu.MMU.addRegister(0xFF48, this._readRegister.bind(this, DisplayRegister.OBP0), this._writeRegister.bind(this, DisplayRegister.OBP0));
        this._cpu.MMU.addRegister(0xFF49, this._readRegister.bind(this, DisplayRegister.OBP1), this._writeRegister.bind(this, DisplayRegister.OBP1));
        this._cpu.MMU.addRegister(0xFF4A, this._readRegister.bind(this, DisplayRegister.WY), this._writeRegister.bind(this, DisplayRegister.WY));
        this._cpu.MMU.addRegister(0xFF4B, this._readRegister.bind(this, DisplayRegister.WX), this._writeRegister.bind(this, DisplayRegister.WX));

        const tmp = document.createElement("canvas");
        tmp.style.width = "160px";
        tmp.style.height = "144px";
        tmp.width = 160;
        tmp.height = 144;
        this._context = tmp.getContext("2d");
        this._context.fillStyle = "#dddddd";
        this._context.fillRect(0, 0, 160, 144);
        this._data = this._context.createImageData(160, 144);
        this._framebuffer = this._data.data;

        // this._framebuffer = new Uint8ClampedArray(160 * 144 * 4);

        for (let i = 0; i < (160 * 144 * 4); i += 4) {
            this._framebuffer[i + 0] = 235;
            this._framebuffer[i + 1] = 235;
            this._framebuffer[i + 2] = 235;
            this._framebuffer[i + 3] = 255;
        }

        this.BGP = 0xFC;
        this.SCX = 0;
        this.SCY = 0;
        this.LY = 0x91;

        document.getElementById("emulator").appendChild(tmp);
    }

    public tick(delta: number) {
        const control = this._readRegister(DisplayRegister.LCDC);

        if (!(control & (1 << 7))) {
            return;
        }

        this._backgroundTilemap = (control & (1 << 3)) ? 1 : 0;
        this._windowTilemap = (control & (1 << 6)) ? 1 : 0;
        this._activeTileset = (control & (1 << 4)) ? 1 : 0;
        this._cycles += delta;
        this._cyclesExtra += delta;

        if (this.LY === this.LYC) {
            this.STAT |= 0x04;
        }

        switch (this.mode) {
            case DisplayMode.HBlank:
                if (this._cycles >= 204) {
                    this._cycles -= 204;
                    this.LY++;

                    if (this.LY === 144) {
                        this._render();
                        this._vblank = 0;

                        this.mode = DisplayMode.VBlank;
                        this._cpu.requestInterrupt(Interrupt.VBlank);

                        if ((this.LCDC & 0x20) !== 0) {
                            this._cpu.requestInterrupt(Interrupt.LCDStat);
                        }
                    } else {
                        if ((this.LCDC & 0x30) !== 0) {
                            this._cpu.requestInterrupt(Interrupt.LCDStat);
                        }

                        if ((this.LCDC & 0x40) !== 0 && this.LY === this.LYC) {
                            this._cpu.requestInterrupt(Interrupt.LCDStat);
                        }

                        this.mode = DisplayMode.ReadingOAM;
                    }
                }
                break;

            case DisplayMode.VBlank:
                while (this._cyclesExtra > 456) {
                    this._cyclesExtra -= 456;
                    this._vblank++;
                }

                if (this._cycles >= 4560) {
                    this._cycles -= 4560;
                    this.mode = DisplayMode.ReadingOAM;
                }
                break;

            case DisplayMode.ReadingOAM:
                if (this._cycles >= 80) {
                    this._cycles -= 80;
                    this._scanlineTransferred = false;
                    this.mode = DisplayMode.ReadingOAMVRAM;
                }
                break;

            case DisplayMode.ReadingOAMVRAM:
                if (this._cycles >= 160 && !this._scanlineTransferred) {
                    this._renderScanline();
                    this._scanlineTransferred = true;
                }    

                if (this._cycles >= 172) {
                    this._cycles -= 172;
                    this.mode = DisplayMode.HBlank;

                    if ((this.LCDC & 0x10) !== 0) {
                        this._cpu.requestInterrupt(Interrupt.LCDStat);
                    }
                }
                break;
        }
    }

    private _renderScanline(): void {
        this._renderBackground();
        this._renderWindow();
        this._renderSprites();
    }

    private _renderSprites(): void {
        if ((this.LCDC & (1 << 1)) === 0) {
            return;
        }

        // todo
    }

    private _renderWindow(): void {
        if ((this.LCDC & (1 << 5)) === 0) {
            return;
        }

        const base = this._windowTilemap ? 0x9C00 : 0x9800;
        const tileBase = this._activeTileset ? 0x8000 : 0x9000;

        // todo
    }

    private _renderBackground(): void {
        if ((this.LCDC & (1 << 0)) === 0) {
            return;
        }

        const base = this._backgroundTilemap ? 0x9C00 : 0x9800;
        const tileBase = this._activeTileset ? 0x8000 : 0x9000;

        const tileY = Math.floor((this.LY + this.SCY) / 8) % 32;
        const tileYOffset = (this.LY + this.SCY) % 8;

        let tx = -1;
        let byte1 = 0;
        let byte2 = 0;

        for (let x = 0; x < 160; x++) {
            const tileX = Math.floor((this.SCX + x) / 8) % 32;

            if (tx !== tileX) {
                let tileNumber = this._cpu.MMU.read8(base + (tileY * 32) + tileX);

                // Read tileValue as signed
                if (!this._activeTileset) {
                    let msb_mask = 1 << (8 - 1);
                    tileNumber = (tileNumber ^ msb_mask) - msb_mask;
                }

                const tileAddr = tileBase + tileNumber * 0x10 + (tileYOffset * 2);

                byte1 = this._cpu.MMU.read8(tileAddr);
                byte2 = this._cpu.MMU.read8(tileAddr + 1);

                tx = tileX;
            }

            const bit = 7 - ((this.SCX + x) % 8);

            const colorNum = (this._bitGet(byte2, bit) << 1) | (this._bitGet(byte1, bit));
            const color = this._getColor(this.BGP, colorNum);
            const index = ((this.LY * 160) + x) * 4;

            this._framebuffer[index + 0] = color;
            this._framebuffer[index + 1] = color;
            this._framebuffer[index + 2] = color;
            this._framebuffer[index + 3] = 255;
        }
    }

    private _bitGet(input: number, bit: number): number {
        return input & (1 << bit) ? 1 : 0;
    }

    private _getColor(palette: number, bit: number): number {
        const hi = ((bit << 1) + 1);
        const lo = (bit << 1);
        const color = (this._bitGet(palette, hi) << 1) | (this._bitGet(palette, lo));

        return GameboyColorPalette[color];
    }

    private _render(): void {
        this._context.putImageData(this._data, 0, 0);
    }

    private _readRegister(register: DisplayRegister): number {
        // console.log(`${register.toString(16)} (R): ${this._registers[register].toString(16)}`);
        return this._registers[register];
    }

    private _writeRegister(register: DisplayRegister, value: number): void {
        switch (register) {
            case DisplayRegister.DMA:
                if (this.mode === DisplayMode.HBlank) {
                    this._cpu.MMU.performOAMDMATransfer(value * 0x100);
                }    
                break;
            
            // case DisplayRegister.BGP:
            //     console.log(`BGP: ${value.toString(16)}`);
            //     break;
        }

        this._registers[register] = value;
    }

    public get LY() {
        return this._registers[DisplayRegister.LY];
    }

    public set LY(val: number) {
        this._registers[DisplayRegister.LY] = val;
    }

    public get LYC() {
        return this._registers[DisplayRegister.LYC];
    }

    public set LYC(val: number) {
        this._registers[DisplayRegister.LYC] = val;
    }

    public get SCX() {
        return this._registers[DisplayRegister.SCX];
    }

    public set SCX(val: number) {
        this._registers[DisplayRegister.SCX] = val;
    }

    public get SCY() {
        return this._registers[DisplayRegister.SCY];
    }

    public set SCY(val: number) {
        this._registers[DisplayRegister.SCY] = val;
    }

    public get BGP() {
        return this._registers[DisplayRegister.BGP];
    }

    public set BGP(val: number) {
        this._registers[DisplayRegister.BGP] = val;
    }

    public get LCDC() {
        return this._registers[DisplayRegister.LCDC];
    }

    public set LCDC(val: number) {
        this._registers[DisplayRegister.LCDC] = val;
    }

    public get STAT() {
        return this._registers[DisplayRegister.STAT];
    }

    public set STAT(val: number) {
        this._registers[DisplayRegister.STAT] = val;
    }

    public get mode() {
        return this._registers[DisplayRegister.STAT] & 0x03;
    }

    public set mode(val: number) {
        this._registers[DisplayRegister.STAT] = ((this._registers[DisplayRegister.STAT] & ~0x03) | val);
    }
}
