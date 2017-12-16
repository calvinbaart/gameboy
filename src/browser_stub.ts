interface IDomNodeStyle {
    width: string | number;
    height: string | number;
}

interface IDomNode {
    addChild(child: IDomNode): void;
    removeChild(child: IDomNode): void;

    style: IDomNodeStyle;
}

export class Canvas implements IDomNode {
    public style: IDomNodeStyle;

    public addChild(child: IDomNode): void {
    }

    public removeChild(child: IDomNode): void {
    }
}

export class Document implements IDomNode {
    public style: IDomNodeStyle;

    public addChild(child: IDomNode): void {
    }

    public removeChild(child: IDomNode): void {
    }

    public getElementById(id: string): IDomNode {
        return null;
    }
}

export const document = new Document();