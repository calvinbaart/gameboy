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
    public style: IDomNodeStyle = { width: 0, height: 0 };

    public addChild(child: IDomNode): void {
    }

    public removeChild(child: IDomNode): void {
    }
}

export class DivNode implements IDomNode {
    public style: IDomNodeStyle = { width: 0, height: 0 };

    public addChild(child: IDomNode): void {
    }

    public removeChild(child: IDomNode): void {
    }
}

export class Document implements IDomNode {
    public style: IDomNodeStyle = { width: 0, height: 0 };

    public addChild(child: IDomNode): void {
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