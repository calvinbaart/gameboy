// todo

export class Network {
    public static _onWrite: (val: number) => void;

    private _connected: boolean;
    private _buffer: number[];

    public constructor() {
        this._connected = false;
        this._buffer = [];
    }

    public isConnected() {
        return this._connected;
    }

    public read(): number {
        if (this._buffer.length === 0) {
            return 0xFF;
        }

        return this._buffer.shift() as number;
    }

    public write(val: number) {
        if (!Network._onWrite) {
            return;
        }

        Network._onWrite(val);
    }

    public _onConnect() {
        this._connected = true;
    }

    public _onDisconnect() {
        this._connected = false;
    }

    public _onReceive(val: number) {
        this._buffer.push(val);
    }
}