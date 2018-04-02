import { CPU } from "./core/cpu/cpu";

import { createLoop } from "./loop";
import { SaveManager } from "./browser/savemanager";
import { Input } from "./browser/input";
import { Render } from "./browser/render";
import { Storage } from "./browser/storage";

const bios = require("../file-loader.js!../dist/bios/gbc_bios.bin");

let cpu: CPU | null = null;
(window as any).cpu = cpu;

Render.setup();
Storage.setup();
Input.setup();
SaveManager.setup();

(document.getElementById("load") as HTMLElement).onclick = () => {
    (document.getElementById("loadFile") as HTMLInputElement).click();
};

(document.getElementById("loadFile") as HTMLElement).onchange = () => {
    const fileLoader = document.getElementById("loadFile") as HTMLInputElement;

    var fileReader = new FileReader();
    fileReader.onload = function (e) {
        cpu = new CPU();
        cpu.setBios(bios);
        cpu.setRom(new Buffer(fileReader.result as ArrayBuffer));

        (window as any).cpu = cpu;
    }

    fileReader.readAsArrayBuffer((fileLoader.files as FileList)[0]);
};

createLoop(requestAnimationFrame, window);