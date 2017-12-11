import { CPU } from "./cpu";

const GameboyColorPalette = [
    0xEB, 0xC4, 0x60, 0x00
];

let global: any = {};
if (process.env.APP_ENV !== "browser") {
    class CanvasContext2D {
        public fillStyle = "";
        
        public fillRect(x, y, w, h) {

        }
    }

    type CanvasContext = CanvasContext2D;

    interface ICanvas {
        getContext: (type: string) => CanvasContext;
    }

    global = {
        createElement: function (type: string): ICanvas {
            return {
                getContext: (type: string): CanvasContext => {
                    return new CanvasContext2D();
                }
            };
        },
        body: {
            appendChild: (canvas: ICanvas) => {

            }
        }
    };
} else {
    type CanvasContext = CanvasRenderingContext2D;

    global = document;
}

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

    private _backgroundTilemap: number;
    private _windowTilemap: number;
    private _activeTileset: number;
    private _framebuffer: Uint8Array;

    constructor(cpu: CPU) {
        this._cpu = cpu;
        this._framebuffer = new Uint8Array(160 * 144 * 4);
        this._registers = new Uint8Array(0x0B);
        this._registers[DisplayRegister.LY] = 0x90; //force vblank until we emulate this correctly
        
        for (let i = 0; i < this._framebuffer.length; i++) {
            this._framebuffer[i] = 255;
        }

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

        const tmp = global.createElement("canvas");
        this._context = tmp.getContext("2d");
        this._context.fillStyle = "#dddddd";
        this._context.fillRect(0, 0, 160, 144);
        global.body.appendChild(tmp);
    }

    public render() {
        const control = this._readRegister(DisplayRegister.LCDC);

        if (!(control & (1 << 7))) {
            return;
        }

        this._backgroundTilemap = (control & (1 << 3)) ? 1 : 0;
        this._windowTilemap = (control & (1 << 6)) ? 1 : 0;
        this._activeTileset = (control & (1 << 4)) ? 1 : 0;

        switch (this.mode) {
            case DisplayMode.ReadingOAM:
                this.mode = DisplayMode.ReadingOAMVRAM;
                break;
            
            case DisplayMode.ReadingOAMVRAM:
                this._renderScanline();
                this.mode = DisplayMode.HBlank;
                break;
            
            case DisplayMode.HBlank:
                this.LY++;

                if (this.LY === 144) {
                    this._render();
                } else {
                    this.mode = DisplayMode.ReadingOAM;
                }

                break;
            
            case DisplayMode.VBlank:
                this.LY++;

                if (this.LY === 154) {
                    this.LY = 0;
                    this.mode = DisplayMode.ReadingOAM;
                }
                break;
        }

        // if (control & (1 << 0)) {
        //     this._renderTiles();
        // }

        // if (control & (1 << 1)) {
        //     this._renderSprites();
        // }
    }

    private _renderScanline(): void {
        const tileY = (((this.LY + this.SCY) / 8) % 32);
        const tileYOffset = ((this.LY + this.SCY) % 8);

        let base = 0x9800;

        if (this._backgroundTilemap === 1) {
            base = 0x9C00;
        }

        for (let x = 0; x < 160; x++) {
            const tileX = (((this.SCX + x) / 8) % 32);
            const tileIndex = this._cpu.MMU.readUint8(base + (tileY * 32) + x);

            let addr = this._activeTileset === 0 ? this._getTileAddress0(tileIndex) : this._getTileAddress1(tileIndex);

            const byte1 = this._cpu.MMU.readUint8(addr);
            const byte2 = this._cpu.MMU.readUint8(addr + 1);

            const bit = 7 - ((this.SCX + x) % 8);
            const lo = (byte1 & (1 << bit)) ? 0x01 : 0x00;
            const hi = (byte2 & (1 << bit)) ? 0x02 : 0x00;

            // console.log(hi, lo, byte1 & (1 << bit), byte2 & (1 << bit), bit);

            let color = GameboyColorPalette[lo + hi];
            let index = ((this.LY * 160) + x) * 4;
            this._framebuffer[index + 3] = color;
            this._framebuffer[index + 2] = color;
            this._framebuffer[index + 1] = color;
            this._framebuffer[index + 0] = 0xFF;
        }
    }

    private _render(): void {
        for (let i = 0; i < this._framebuffer.length; i += 4) {
            let y = Math.floor((i / 4) / 160);
            let x = (i / 4) - (y * 160);

            let r = this._framebuffer[i].toString(16);
            let g = this._framebuffer[i].toString(16);
            let b = this._framebuffer[i].toString(16);

            while (r.length < 2) {
                r = "0" + r;
            }

            while (g.length < 2) {
                g = "0" + g;
            }

            while (b.length < 2) {
                b = "0" + b;
            }

            this._context.fillStyle = "#" + r + g + b;
            this._context.fillRect(x, y, 1, 1);
        }
    }

    private _renderBackgroundTile(x, y) {
        let base = 0x9800;

        if (this._backgroundTilemap === 1) {
            base = 0x9C00;
        }
        
        let index = this._cpu.MMU.readUint8(base + (y * 32) + x);
        let addr = this._activeTileset === 1 ? this._getTileAddress0(index) : this._getTileAddress1(index);
        let data = this._cpu.MMU.readBuffer(addr, 16);

        for (let i = 0; i < 8; i++) {
            const byte1 = data.readUInt8(i * 2);
            const byte2 = data.readUInt8(i * 2);

            if (byte1 !== 0 || byte2 !== 0) {
                this._context.fillStyle = "#000000";
                this._context.fillRect((x * 8) + i, y * 8, 1, 8);
            }
        }
    }

    private _getTileAddress0(tile) {
        const memoryRegion = 0x8000;
        const sizeOfTileInMemory = 16;

        return memoryRegion + (tile * sizeOfTileInMemory); 
    }

    private _getTileAddress1(tile) {
        const memoryRegion = 0x8800;
        const sizeOfTileInMemory = 16;
        const offset = 128;

        return memoryRegion + ((tile + offset) * sizeOfTileInMemory); 
    }

    private _readRegister(register: DisplayRegister): number {
        if (register === DisplayRegister.LY) {
            return 0x90;
        }

        return this._registers[register];
    }

    private _writeRegister(register: DisplayRegister, value: number): void {
        this._registers[register] = value;
    }

    public get LY() {
        return this._registers[DisplayRegister.LY];
    }

    public set LY(val: number) {
        this._registers[DisplayRegister.LY] = val;
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

    public get mode() {
        return this._registers[DisplayRegister.STAT] & 0x03;
    }

    public set mode(val: number) {
        this._registers[DisplayRegister.STAT] = ((this._registers[DisplayRegister.STAT] & ~0x03) | val);
    }
}
