import { MemoryController, Memory } from "./memory";

export class RomOnlyMemoryController implements MemoryController
{
    private _mmu: Memory;

    constructor(mmu: Memory)
    {
        this._mmu = mmu;
    }

    read(position: number): number
    {
        return this._mmu.readInternal8(position);
    }

    write(position: number, value: number): void
    {
        return this._mmu.writeInternal8(position, value);
    }
}