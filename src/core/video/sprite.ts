export interface Sprite {
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
};