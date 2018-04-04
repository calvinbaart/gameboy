import { CPU } from "../cpu/cpu";
import { ColorPalette, Color } from "./color";
import { VideoRegister } from "./videoregister";
import { VideoMode } from "./videomode";
import { Interrupt } from "../cpu/interrupt";

const GameboyColorPalette = [
    0xEB, 0xC4, 0x60, 0x00
];

interface ISprite {
    x: number;
    y: number;
    tile: number;
    flags: number;

    vram: number;
    flipX: boolean;
    flipY: boolean;

    colorPalette: number;
    palette: number;

    priority: boolean;
}

export class Video {
    private _cpu: CPU;
    private _registers: Uint8Array;

    private _backgroundTilemap: number;
    private _windowTilemap: number;
    private _activeTileset: number;
    public _framebuffer: Uint8ClampedArray;
    private _framebufferNumbers: Uint8ClampedArray;
    private _priorityBuffer: boolean[];
    private _cycles: number;
    private _cyclesExtra: number;
    private _vblank: number;
    private _scanlineTransferred: boolean;

    private _backgroundPalette: ColorPalette[];
    private _spritePalette: ColorPalette[];
    private _gbcMode: boolean;

    private _hdmaSource: number;
    private _hdmaTarget: number;
    private _hdmaMode: number;
    private _hdmaStatus: number;

    private _sprites: ISprite[];

    public static setupWindow: (display: Video) => void;
    public static render: (display: Video) => void;

    constructor(cpu: CPU) {
        this._cpu = cpu;
        this._registers = new Uint8Array(VideoRegister.HDMA5 + 1);
        this._cycles = 0;
        this._cyclesExtra = 0;
        this._vblank = 0;
        this._scanlineTransferred = false;
        this._gbcMode = false;

        this._backgroundTilemap = 0;
        this._windowTilemap = 0;
        this._activeTileset = 0;
        this._hdmaSource = 0;
        this._hdmaTarget = 0;
        this._hdmaMode = 0;
        this._hdmaStatus = 0;
        this._framebuffer = new Uint8ClampedArray(160 * 144 * 4);
        
        this._backgroundPalette = [];
        this._spritePalette = [];
        this._framebufferNumbers = new Uint8ClampedArray(160 * 144);
        this._sprites = [];

        for (let i = 0; i < 0x40; i++) {
            this._sprites[i] = {
                x: 0,
                y: 0,
                tile: 0,
                flags: 0,

                vram: 0,
                flipX: false,
                flipY: false,

                colorPalette: 0,
                palette: 0,

                priority: false
            };
        }

        for (let i = 0; i <= 0x07; i++) {
            this._backgroundPalette.push({
                color: [
                    { red: 0x1F, green: 0x1F, blue: 0x1F },
                    { red: 0x1F, green: 0x1F, blue: 0x1F },
                    { red: 0x1F, green: 0x1F, blue: 0x1F },
                    { red: 0x1F, green: 0x1F, blue: 0x1F }
                ],
                colorActual: [
                    { red: GameboyColorPalette[0], green: GameboyColorPalette[0], blue: GameboyColorPalette[0] },
                    { red: GameboyColorPalette[0], green: GameboyColorPalette[0], blue: GameboyColorPalette[0] },
                    { red: GameboyColorPalette[0], green: GameboyColorPalette[0], blue: GameboyColorPalette[0] },
                    { red: GameboyColorPalette[0], green: GameboyColorPalette[0], blue: GameboyColorPalette[0] }
                ]
            });

            this._spritePalette.push({
                color: [
                    { red: 0x1F, green: 0x1F, blue: 0x1F },
                    { red: 0x1F, green: 0x1F, blue: 0x1F },
                    { red: 0x1F, green: 0x1F, blue: 0x1F },
                    { red: 0x1F, green: 0x1F, blue: 0x1F }
                ],
                colorActual: [
                    { red: GameboyColorPalette[0], green: GameboyColorPalette[0], blue: GameboyColorPalette[0] },
                    { red: GameboyColorPalette[0], green: GameboyColorPalette[0], blue: GameboyColorPalette[0] },
                    { red: GameboyColorPalette[0], green: GameboyColorPalette[0], blue: GameboyColorPalette[0] },
                    { red: GameboyColorPalette[0], green: GameboyColorPalette[0], blue: GameboyColorPalette[0] }
                ]
            });
        }

        this._cpu.MMU.addRegister(0xFF40, this._readRegister.bind(this, VideoRegister.LCDC), this._writeRegister.bind(this, VideoRegister.LCDC));
        this._cpu.MMU.addRegister(0xFF41, this._readRegister.bind(this, VideoRegister.STAT), this._writeRegister.bind(this, VideoRegister.STAT));
        this._cpu.MMU.addRegister(0xFF42, this._readRegister.bind(this, VideoRegister.SCY), this._writeRegister.bind(this, VideoRegister.SCY));
        this._cpu.MMU.addRegister(0xFF43, this._readRegister.bind(this, VideoRegister.SCX), this._writeRegister.bind(this, VideoRegister.SCX));
        this._cpu.MMU.addRegister(0xFF44, this._readRegister.bind(this, VideoRegister.LY), this._writeRegister.bind(this, VideoRegister.LY));
        this._cpu.MMU.addRegister(0xFF45, this._readRegister.bind(this, VideoRegister.LYC), this._writeRegister.bind(this, VideoRegister.LYC));
        this._cpu.MMU.addRegister(0xFF46, this._readRegister.bind(this, VideoRegister.DMA), this._writeRegister.bind(this, VideoRegister.DMA));
        this._cpu.MMU.addRegister(0xFF47, this._readRegister.bind(this, VideoRegister.BGP), this._writeRegister.bind(this, VideoRegister.BGP));
        this._cpu.MMU.addRegister(0xFF48, this._readRegister.bind(this, VideoRegister.OBP0), this._writeRegister.bind(this, VideoRegister.OBP0));
        this._cpu.MMU.addRegister(0xFF49, this._readRegister.bind(this, VideoRegister.OBP1), this._writeRegister.bind(this, VideoRegister.OBP1));
        this._cpu.MMU.addRegister(0xFF4A, this._readRegister.bind(this, VideoRegister.WY), this._writeRegister.bind(this, VideoRegister.WY));
        this._cpu.MMU.addRegister(0xFF4B, this._readRegister.bind(this, VideoRegister.WX), this._writeRegister.bind(this, VideoRegister.WX));

        //GBC
        this._cpu.MMU.addRegister(0xFF51, this._readRegister.bind(this, VideoRegister.HDMA1), this._writeRegister.bind(this, VideoRegister.HDMA1));
        this._cpu.MMU.addRegister(0xFF52, this._readRegister.bind(this, VideoRegister.HDMA2), this._writeRegister.bind(this, VideoRegister.HDMA2));
        this._cpu.MMU.addRegister(0xFF53, this._readRegister.bind(this, VideoRegister.HDMA3), this._writeRegister.bind(this, VideoRegister.HDMA3));
        this._cpu.MMU.addRegister(0xFF54, this._readRegister.bind(this, VideoRegister.HDMA4), this._writeRegister.bind(this, VideoRegister.HDMA4));
        this._cpu.MMU.addRegister(0xFF55, this._readRegister.bind(this, VideoRegister.HDMA5), this._writeRegister.bind(this, VideoRegister.HDMA5));
        this._cpu.MMU.addRegister(0xFF68, this._readRegister.bind(this, VideoRegister.BCPS), this._writeRegister.bind(this, VideoRegister.BCPS));
        this._cpu.MMU.addRegister(0xFF69, this._readRegister.bind(this, VideoRegister.BCPD), this._writeRegister.bind(this, VideoRegister.BCPD));
        this._cpu.MMU.addRegister(0xFF6A, this._readRegister.bind(this, VideoRegister.OCPS), this._writeRegister.bind(this, VideoRegister.OCPS));
        this._cpu.MMU.addRegister(0xFF6B, this._readRegister.bind(this, VideoRegister.OCPD), this._writeRegister.bind(this, VideoRegister.OCPD));

        Video.setupWindow(this);

        for (let i = 0; i < (160 * 144 * 4); i += 4) {
            this._framebuffer[i + 0] = 235;
            this._framebuffer[i + 1] = 235;
            this._framebuffer[i + 2] = 235;
            this._framebuffer[i + 3] = 255;
        }

        this._priorityBuffer = Array(160 * 144).fill(false);

        this._registers[VideoRegister.BGP] = 0xFC;
        this._registers[VideoRegister.SCX] = 0;
        this._registers[VideoRegister.SCY] = 0;
        this._registers[VideoRegister.WX] = 0;
        this._registers[VideoRegister.WY] = 0;
        this._registers[VideoRegister.LY] = 0x91;

        this._registers[VideoRegister.BCPD] = 0;
        this._registers[VideoRegister.BCPS] = 0;
        this._registers[VideoRegister.OCPD] = 0;
        this._registers[VideoRegister.OCPS] = 0;
        this._registers[VideoRegister.HDMA1] = 0;
        this._registers[VideoRegister.HDMA2] = 0;
        this._registers[VideoRegister.HDMA3] = 0;
        this._registers[VideoRegister.HDMA4] = 0;
        this._registers[VideoRegister.HDMA5] = 1 << 7;
    }

    public performHDMA() {
        for (let i = 0; i < 0x10; i++) {
            this._cpu.MMU.write8(this._hdmaTarget + i, this._cpu.MMU.read8(this._hdmaSource + i));
        }

        this._hdmaTarget += 0x10;
        this._hdmaSource += 0x10;

        if (this._hdmaTarget == 0xA000) {
            this._hdmaTarget = 0x8000;
        }

        if (this.hdmaLength === 0) {
            this.hdmaInProgress = false;
        }

        this.hdmaLength--;
        this._hdmaSource &= 0xFFF0;

        if (this._hdmaSource == 0x8000) {
            this._hdmaSource = 0xA000;
        }

        this._registers[VideoRegister.HDMA1] = this._hdmaSource >> 8;
        this._registers[VideoRegister.HDMA2] = this._hdmaSource & 0xF0;
        this._registers[VideoRegister.HDMA3] = this._hdmaTarget >> 8;
        this._registers[VideoRegister.HDMA4] = this._hdmaTarget & 0xF0;
    }

    public tick(delta: number) {
        const control = this._readRegister(VideoRegister.LCDC);

        if (!(control & (1 << 7))) {
            this._registers[VideoRegister.LY] = 0;
            this.mode = 0;
            this._cycles = 0;
            return;
        }

        this._backgroundTilemap = (control & (1 << 3)) ? 1 : 0;
        this._windowTilemap = (control & (1 << 6)) ? 1 : 0;
        this._activeTileset = (control & (1 << 4)) ? 1 : 0;
        this._cycles += delta;
        this._cyclesExtra += delta;

        switch (this.mode) {
            case VideoMode.HBlank:
                if (this._cycles >= 204) {
                    if (this.hdmaInProgress) {
                        this.performHDMA();
                    }
                    
                    this._cycles -= 204;
                    this._registers[VideoRegister.LY]++;

                    if (this._registers[VideoRegister.LY] === this._registers[VideoRegister.LYC]) {
                        this._registers[VideoRegister.STAT] |= 1 << 2;
                    } else {
                        this._registers[VideoRegister.STAT] &= ~(1 << 2);
                    }

                    if (this._registers[VideoRegister.LY] === 144) {
                        this._render();
                        this._vblank = 0;

                        this.mode = VideoMode.VBlank;
                        this._cpu.requestInterrupt(Interrupt.VBlank);

                        if ((this._registers[VideoRegister.STAT] & (1 << 4)) !== 0) {
                            this._cpu.requestInterrupt(Interrupt.LCDStat);
                        }
                    } else {
                        if ((this._registers[VideoRegister.STAT] & (1 << 5)) !== 0) {
                            this._cpu.requestInterrupt(Interrupt.LCDStat);
                        }

                        if ((this._registers[VideoRegister.STAT] & (1 << 6)) !== 0 && this._registers[VideoRegister.LY] === this._registers[VideoRegister.LYC]) {
                            this._cpu.requestInterrupt(Interrupt.LCDStat);
                        }

                        this.mode = VideoMode.ReadingOAM;
                    }
                }
                break;

            case VideoMode.VBlank:
                while (this._cyclesExtra > 456) {
                    this._cyclesExtra -= 456;
                    this._vblank++;
                }

                if (this._cycles >= 4560) {
                    this._cycles -= 4560;
                    this.mode = VideoMode.ReadingOAM;
                }
                break;

            case VideoMode.ReadingOAM:
                if (this._cycles >= 80) {
                    this._cycles -= 80;
                    this._scanlineTransferred = false;
                    this.mode = VideoMode.ReadingOAMVRAM;
                }
                break;

            case VideoMode.ReadingOAMVRAM:
                if (this._cycles >= 160 && !this._scanlineTransferred) {
                    this._renderScanline();
                    this._scanlineTransferred = true;
                }

                if (this._cycles >= 172) {
                    this._cycles -= 172;
                    this.mode = VideoMode.HBlank;

                    if ((this._registers[VideoRegister.STAT] & (1 << 3)) !== 0) {
                        this._cpu.requestInterrupt(Interrupt.LCDStat);
                    }
                }
                break;
        }
    }

    private setColorPaletteData(data: number, background: boolean): void {
        this._gbcMode = true;

        let ps = this._registers[background ? VideoRegister.BCPS : VideoRegister.OCPS];
        const increment = (ps & 0x80) ? true : false;
        const hl = (ps & 0x1) != 0;
        const index = (ps >> 1) & 0x03;
        const pal = (ps >> 3) & 0x07;

        if (hl) {
            const blue = (data >> 2) & 0x1F;
            const halfGreen = (data & 0x03) << 3;

            if (background) {
                this._backgroundPalette[pal].color[index].blue = blue;
                this._backgroundPalette[pal].color[index].green =
                    (this._backgroundPalette[pal].color[index].green & 0x07) | halfGreen;

                this._backgroundPalette[pal].colorActual[index].blue = Math.round((this._backgroundPalette[pal].color[index].blue / 31) * GameboyColorPalette[0]);
                this._backgroundPalette[pal].colorActual[index].green = Math.round((this._backgroundPalette[pal].color[index].green / 31) * GameboyColorPalette[0]);
            } else {
                this._spritePalette[pal].color[index].blue = blue;
                this._spritePalette[pal].color[index].green =
                    (this._spritePalette[pal].color[index].green & 0x07) | halfGreen;

                this._spritePalette[pal].colorActual[index].blue = Math.round((this._spritePalette[pal].color[index].blue / 31) * GameboyColorPalette[0]);
                this._spritePalette[pal].colorActual[index].green = Math.round((this._spritePalette[pal].color[index].green / 31) * GameboyColorPalette[0]);
            }
        } else {
            const halfGreen = (data >> 5) & 0x07;
            const red = data & 0x1F;

            if (background) {
                this._backgroundPalette[pal].color[index].red = red;
                this._backgroundPalette[pal].color[index].green =
                    (this._backgroundPalette[pal].color[index].green & 0x18) | halfGreen;
                
                this._backgroundPalette[pal].colorActual[index].red = Math.round((this._backgroundPalette[pal].color[index].red / 31) * GameboyColorPalette[0]);
                this._backgroundPalette[pal].colorActual[index].green = Math.round((this._backgroundPalette[pal].color[index].green / 31) * GameboyColorPalette[0]);
            } else {
                this._spritePalette[pal].color[index].red = red;
                this._spritePalette[pal].color[index].green =
                    (this._spritePalette[pal].color[index].green & 0x18) | halfGreen;

                this._spritePalette[pal].colorActual[index].red = Math.round((this._spritePalette[pal].color[index].red / 31) * GameboyColorPalette[0]);
                this._spritePalette[pal].colorActual[index].green = Math.round((this._spritePalette[pal].color[index].green / 31) * GameboyColorPalette[0]);
            }
        }

        if (increment) {
            ps = (ps & 0x80) | ((ps + 1) & 0x3F);

            this._registers[background ? VideoRegister.BCPS : VideoRegister.OCPS] = ps;
        }
    }

    private _renderScanline(): void {
        this._renderBackground();
        this._renderWindow();
        this._renderSprites();
    }

    private _renderSprites(): void {
        if ((this._registers[VideoRegister.LCDC] & (1 << 1)) === 0) {
            return;
        }

        const width = 8;
        const height = (this._registers[VideoRegister.LCDC] & (1 << 2)) ? 16 : 8;
        const tileBase = 0x8000;

        const LY = this._registers[VideoRegister.LY];

        for (let i = 0; i < 40; i++) {
            const sprite = this._sprites[i];
            const tile = height === 16 ? sprite.tile & ~0x01 : sprite.tile;

            if (LY < sprite.y || LY >= sprite.y + height) {
                continue;
            }

            let spriteY = LY - sprite.y;

            if (sprite.flipY) {
                spriteY = height - spriteY - 1;
            }

            for (let spriteX = 0; spriteX < width; spriteX++) {
                const pixelX = sprite.x + spriteX;
                const tileAddr = tileBase + tile * 16 + (spriteY * 2);

                if (pixelX < 0 || pixelX >= 160) {
                    continue;
                }
                
                const byte1 = this._cpu.MMU.readVideoRam(tileAddr, sprite.vram);
                const byte2 = this._cpu.MMU.readVideoRam(tileAddr + 1, sprite.vram);

                let bit = 7 - spriteX;

                if (sprite.flipX) {
                    bit = 7 - (7 - spriteX);
                }

                const colorNum = (this._bitGet(byte2, bit) << 1) | (this._bitGet(byte1, bit));

                let color: Color | null = null;
                if (!this.gbcMode) {
                    color = this._getColor(this._registers[sprite.palette], colorNum, true);
                } else {
                    color = this._getColorGBC(sprite.colorPalette, colorNum, false);
                }    

                if (color === null) {
                    continue;
                }

                const baseIndex = (LY * 160) + pixelX;
                const index = baseIndex * 4;

                if (sprite.priority || (this.gbcMode && this._priorityBuffer[(LY * 160) + pixelX])) {
                    if (this._framebufferNumbers[baseIndex] !== 0) {
                        continue;
                    }
                }

                this._framebuffer[index + 0] = color.red;
                this._framebuffer[index + 1] = color.green;
                this._framebuffer[index + 2] = color.blue;
                this._framebuffer[index + 3] = 255;
            }
        }
    }

    private _renderWindow(): void {
        if ((this._registers[VideoRegister.LCDC] & (1 << 5)) === 0) {
            return;
        }

        const LY = this._registers[VideoRegister.LY];
        const BGP = this._registers[VideoRegister.BGP];

        const base = this._windowTilemap ? 0x9C00 : 0x9800;
        const tileBase = this._activeTileset ? 0x8000 : 0x9000;

        const wx = this._registers[VideoRegister.WX] - 7;
        const wy = this._registers[VideoRegister.WY];

        if (wx > 159) {
            return;
        }

        if ((wy > 143) || (wy > LY)) {
            return;
        }
        
        const winY = LY - wy;
        const tileY = Math.floor(winY / 8) % 32;
        const tileYOffset = winY % 8;

        let tx = -1;
        let byte1 = 0;
        let byte2 = 0;
        let tileFlipX = false;
        let tileFlipY = false;
        let tilePriority = false;
        let tileBank = 0;
        let tilePalette = 0;

        for (let x = 0; x < 160; x++) {
            if ((wx + x) < 0 || (wx + x) >= 160) {
                continue;
            }

            const tileX = Math.floor(x / 8) % 32;

            if (tx !== tileX) {
                let tileMapAddr = base + (tileY * 32) + tileX;
                let tileNumber = this._cpu.MMU.readVideoRam(tileMapAddr, 0);

                if (this.gbcMode) {
                    const tileAttribute = this._cpu.MMU.readVideoRam(tileMapAddr, 1);
                    tilePalette = tileAttribute & 0x07;
                    tileBank = (tileAttribute >> 3) & 0x01;
                    tileFlipX = ((tileAttribute >> 5) & 0x01) === 1;
                    tileFlipY = ((tileAttribute >> 6) & 0x01) === 1;
                    tilePriority = ((tileAttribute >> 7) & 0x01) === 1;
                }

                // Read tileValue as signed
                if (!this._activeTileset) {
                    let msb_mask = 1 << (8 - 1);
                    tileNumber = (tileNumber ^ msb_mask) - msb_mask;
                }

                const offset = tileFlipY ? 7 - tileYOffset : tileYOffset;
                const tileAddr = tileBase + tileNumber * 0x10 + (offset * 2);

                byte1 = this._cpu.MMU.readVideoRam(tileAddr, tileBank);
                byte2 = this._cpu.MMU.readVideoRam(tileAddr + 1, tileBank);

                tx = tileX;
            }

            const bit = 7 - (x % 8);

            const colorNum = (this._bitGet(byte2, bit) << 1) | (this._bitGet(byte1, bit));
            const baseIndex = (LY * 160) + wx + x;
            const index = baseIndex * 4;

            let color: Color;
            if (!this.gbcMode) {
                color = this._getColor(BGP, colorNum, false) as Color;
            } else {
                this._priorityBuffer[(LY * 160) + wx + x] = tilePriority;
                color = this._getColorGBC(tilePalette, colorNum, true) as Color;
            }

            this._framebuffer[index + 0] = color.red;
            this._framebuffer[index + 1] = color.green;
            this._framebuffer[index + 2] = color.blue;
            this._framebuffer[index + 3] = 255;

            this._framebufferNumbers[baseIndex] = colorNum;
        }
    }

    private _renderBackground(): void {
        if ((this._registers[VideoRegister.LCDC] & (1 << 0)) === 0 && !this.gbcMode) {
            return;
        }

        const LY = this._registers[VideoRegister.LY];
        const SCX = this._registers[VideoRegister.SCX];
        const SCY = this._registers[VideoRegister.SCY];
        const BGP = this._registers[VideoRegister.BGP];

        const base = this._backgroundTilemap ? 0x9C00 : 0x9800;
        const tileBase = this._activeTileset ? 0x8000 : 0x9000;

        const tileY = Math.floor((LY + SCY) / 8) % 32;
        const tileYOffset = (LY + SCY) % 8;

        let tx = -1;
        let byte1 = 0;
        let byte2 = 0;
        let tileFlipX = false;
        let tileFlipY = false;
        let tilePriority = false;
        let tileBank = 0;
        let tilePalette = 0;

        for (let x = 0; x < 160; x++) {
            const tileX = Math.floor((SCX + x) / 8) % 32;

            if (tx !== tileX) {
                let tileMapAddr = base + (tileY * 32) + tileX;
                let tileNumber = this._cpu.MMU.readVideoRam(tileMapAddr, 0);

                if (this.gbcMode) {
                    const tileAttribute = this._cpu.MMU.readVideoRam(tileMapAddr, 1);
                    tilePalette = tileAttribute & 0x07;
                    tileBank = (tileAttribute & (1 << 3)) ? 1 : 0;
                    tileFlipX = ((tileAttribute >> 5) & 0x01) === 1;
                    tileFlipY = ((tileAttribute >> 6) & 0x01) === 1;
                    tilePriority = ((tileAttribute >> 7) & 0x01) === 1;
                } else {
                    tileFlipX = false;
                    tileFlipY = false;
                    tilePriority = false;
                    tilePalette = 0;
                    tileBank = 0;
                }

                // Read tileValue as signed
                if (!this._activeTileset) {
                    let msb_mask = 1 << (8 - 1);
                    tileNumber = (tileNumber ^ msb_mask) - msb_mask;
                }

                const offset = tileFlipY ? 7 - tileYOffset : tileYOffset;
                const tileAddr = tileBase + tileNumber * 0x10 + (offset * 2);

                byte1 = this._cpu.MMU.readVideoRam(tileAddr, tileBank);
                byte2 = this._cpu.MMU.readVideoRam(tileAddr + 1, tileBank);

                tx = tileX;
            }

            const tmp_x = ((SCX + x) % 8);
            const bit = tileFlipX ? 7 - (7 - tmp_x) : 7 - tmp_x;

            const colorNum = (this._bitGet(byte2, bit) << 1) | (this._bitGet(byte1, bit));
            const baseIndex = (LY * 160) + x;
            const index = baseIndex * 4;

            let color: Color;
            if (!this.gbcMode) {
                color = this._getColor(BGP, colorNum, false) as Color;
            } else {
                this._priorityBuffer[(LY * 160) + x] = tilePriority;
                color = this._getColorGBC(tilePalette, colorNum, true) as Color;
            }

            this._framebuffer[index + 0] = color.red;
            this._framebuffer[index + 1] = color.green;
            this._framebuffer[index + 2] = color.blue;
            this._framebuffer[index + 3] = 255;

            this._framebufferNumbers[baseIndex] = colorNum;
        }
    }

    private _bitGet(input: number, bit: number): number {
        return input & (1 << bit) ? 1 : 0;
    }

    private _getColor(palette: number, bit: number, transparent: boolean): Color | null {
        const hi = ((bit << 1) + 1);
        const lo = (bit << 1);
        const color = (this._bitGet(palette, hi) << 1) | (this._bitGet(palette, lo));

        if (bit === 0 && transparent) {
            return null;
        }

        return {
            red: GameboyColorPalette[color],
            green: GameboyColorPalette[color],
            blue: GameboyColorPalette[color]
        };
    }

    private _getColorGBC(palette: number, bit: number, background: boolean): Color | null {
        if (bit === 0 && !background) {
            return null;
        }

        if (background) {
            return this._backgroundPalette[palette].colorActual[bit];
        }


        return this._spritePalette[palette].colorActual[bit];
    }

    private _render(): void {
        Video.render(this);
    }

    private _readRegister(register: VideoRegister): number {
        return this._registers[register];
    }

    private _writeRegister(register: VideoRegister, value: number): void {
        switch (register) {
            case VideoRegister.DMA:
                this._cpu.MMU.performOAMDMATransfer(value * 0x100);
                break;
            
            case VideoRegister.LCDC:
                if (!(value & (1 << 7))) {
                    for (let x = 0; x < 160; x++) {
                        for (let y = 0; y < 144; y++) {
                            const index = ((y * 160) + x) * 4;

                            this._framebuffer[index + 0] = GameboyColorPalette[0];
                            this._framebuffer[index + 1] = GameboyColorPalette[0];
                            this._framebuffer[index + 2] = GameboyColorPalette[0];
                            this._framebuffer[index + 3] = 0xFF;
                        }
                    }

                    this._render();
                }    
                break;

            case VideoRegister.BCPD:
                this.setColorPaletteData(value, true);
                break;

            case VideoRegister.OCPD:
                this.setColorPaletteData(value, false);
                break;
            
            case VideoRegister.HDMA5:
                this._registers[register] = value;

                if (this.hdmaInProgress) {
                    if ((value & (1 << 7)) === 0 && this._hdmaMode === 1) {
                        this.hdmaInProgress = false;
                    }
                } else {
                    this._hdmaSource = (this._registers[VideoRegister.HDMA1] << 8) | (this._registers[VideoRegister.HDMA2] & 0xF0);
                    this._hdmaTarget = ((this._registers[VideoRegister.HDMA3] & 0x1F) << 8) | (this._registers[VideoRegister.HDMA4] & 0xF0);
                    this._hdmaTarget |= 0x8000;

                    this._hdmaMode = (value & 0x80) === 0 ? 0 : 1;
                    this.hdmaInProgress = true;
                    this.hdmaLength = value & 0b01111111;
                }
                return;
        }

        this._registers[register] = value;
    }

    public oamWrite(position: number, data: number): void {
        const sprite = Math.floor(position / 4);
        const attrib = position - (sprite * 4);

        switch (attrib) {
            case 0:
                this._sprites[sprite].y = data - 16;
                break;
            
            case 1:
                this._sprites[sprite].x = data - 8;
                break;
            
            case 2:
                this._sprites[sprite].tile = data;
                break;
            
            case 3:
                this._sprites[sprite].flags = data;
                this._sprites[sprite].vram = this.gbcMode ? ((data & (1 << 3)) === 0 ? 0 : 1) : 0;
                this._sprites[sprite].flipX = data & (1 << 5) ? true : false;
                this._sprites[sprite].flipY = data & (1 << 6) ? true : false;
                this._sprites[sprite].colorPalette = data & 0x07;
                this._sprites[sprite].palette = data & (1 << 4) ? VideoRegister.OBP1 : VideoRegister.OBP0;
                this._sprites[sprite].priority = (data & (1 << 7)) !== 0;
                break;
        }
    }

    public get mode(): VideoMode {
        return this._registers[VideoRegister.STAT] & 0x03;
    }

    public set mode(val: VideoMode) {
        this._registers[VideoRegister.STAT] = ((this._registers[VideoRegister.STAT] & ~0x03) | val);
    }

    public get gbcMode(): boolean {
        return this._cpu._inBootstrap ? this._gbcMode : this._cpu.gbcMode;
    }

    public get hdmaLength(): number {
        return this._hdmaStatus & 0b01111111;
    }

    public set hdmaLength(val: number) {
        this._hdmaStatus = (this._hdmaStatus & (1 << 7)) | (val & 0b01111111);
    }

    public get hdmaInProgress(): boolean {
        return (this._hdmaStatus & (1 << 7)) ? false : true;
    }

    public set hdmaInProgress(val: boolean) {
        if (!val) {
            this._hdmaStatus |= 1 << 7;
        } else {
            this._hdmaStatus &= ~(1 << 7);
        }
    }
}
