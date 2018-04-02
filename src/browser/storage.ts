import { Memory } from "../core/memory/memory";
import { SaveManager } from "./savemanager";

export interface ISaveData {
    key: string;
    data: number[];
}

export class Storage {
    public static setup() {
        Memory.save = (memory: Memory, identifier: string, data: string) => {
            localStorage.setItem(identifier, data);

            if (!SaveManager.hasEntry(identifier)) {
                SaveManager.createEntry(identifier);
            }
        };

        Memory.load = (memory: Memory, identifier: string) => {
            return localStorage.getItem(identifier);
        };
    }
}