interface IDomNodeStyle {
    width: string | number;
    height: string | number;
}

interface IDomNode {
    appendChild(child: IDomNode): void;
    removeChild(child: IDomNode): void;

    style: IDomNodeStyle;
}

export class ImageData {
    private _width: number;
    private _height: number;
    private _data: Uint8ClampedArray;

    constructor(width: number, height: number) {
        this._width = width;
        this._height = height;
        this._data = new Uint8ClampedArray(this._width * this._height * 4);
    }

    get width() {
        return this._width;
    }

    get height() {
        return this._height;
    }

    get data() {
        return this._data;
    }
}

export class CanvasRenderingContext2D {
    public fillRect(x: number, y: number, width: number, height: number): void {

    }

    public createImageData(width: number, height: number): ImageData {
        return new ImageData(width, height);
    }

    public putImageData(data: ImageData): void {
        
    }
}

export class Canvas implements IDomNode {
    public style: IDomNodeStyle = { width: 0, height: 0 };

    public appendChild(child: IDomNode): void {
    }

    public removeChild(child: IDomNode): void {
    }

    public getContext(type: string): CanvasRenderingContext2D {
        return new CanvasRenderingContext2D();
    }
}

export class DivNode implements IDomNode {
    public style: IDomNodeStyle = { width: 0, height: 0 };

    public appendChild(child: IDomNode): void {
    }

    public removeChild(child: IDomNode): void {
    }
}

export class Document implements IDomNode {
    public style: IDomNodeStyle = { width: 0, height: 0 };

    public appendChild(child: IDomNode): void {
    }

    public removeChild(child: IDomNode): void {
    }

    public createElement(type: string): IDomNode {
        return new Canvas();
    }
    
    public getElementById(id: string): IDomNode {
        return new DivNode();
    }
}

export const document = new Document();