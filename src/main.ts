import { CPU, Key } from "./cpu";
import { Display } from "./display";
import { Memory } from "./memory";

let canvas: HTMLCanvasElement = null;
let context: CanvasRenderingContext2D = null;
let image: ImageData = null;

interface ISaveData {
    key: string;
    data: number[];
}

Display.setupWindow = (display: Display) => {
    if (canvas !== null) {
        display._framebuffer = image.data;
        return;
    }

    canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 144;

    setInterval(function () {
        const width1 = window.innerWidth - 20;
        const width2 = Math.floor((window.innerHeight - document.getElementById("emulator").parentElement.offsetTop) / 144) * 160;
        const width = Math.min(width1, width2);

        canvas.style.minWidth = width + "px";
        canvas.style.maxWidth = width + "px";
        canvas.style.width = width + "px";

        const height = Math.floor(width / 160) * 144;

        canvas.style.minHeight = height + "px";
        canvas.style.maxHeight = height + "px";
        canvas.style.height = height + "px";
    }, 50);

    context = canvas.getContext("2d");
    context.fillStyle = "#dddddd";
    context.fillRect(0, 0, 160, 144);
    context.imageSmoothingEnabled = false;

    image = context.createImageData(160, 144);
    display._framebuffer = image.data;

    document.getElementById("emulator").appendChild(canvas);
};

Display.render = (display: Display) => {
    context.putImageData(image, 0, 0);
};

Memory.save = (memory: Memory, identifier: string, data: string) => {
    localStorage.setItem(identifier, data);

    if (document.querySelectorAll(`[data-key=${identifier}]`).length === 0) {
        createSaveManagerEntry(identifier);
    }
};

Memory.load = (memory: Memory, identifier: string) => {
    return localStorage.getItem(identifier);
};

const bios = require("../file-loader.js!../dist/bios/gbc_bios.bin");

let cpu = null;
(window as any).cpu = cpu;

function saveContent(url, fileName) {
    var link = document.createElement('a');
    link.download = fileName;
    link.href = url;
    link.click();
}

function createSaveManagerEntry(key) {
    const el = document.createElement("div");
    el.className = "d-flex justify-content-between mb-1";
    el.setAttribute("data-key", key);

    const name = document.createElement("span");
    name.innerText = key;
    name.className = "col-md-8";
    name.style.lineHeight = "38px";
    el.appendChild(name);

    const deleteButton = document.createElement("button");
    deleteButton.className = "btn btn-danger";
    deleteButton.innerText = "Delete";
    deleteButton.onclick = () => {
        localStorage.removeItem(key);
        document.querySelector(`[data-key=${key}]`).remove();
    };
    el.appendChild(deleteButton);

    const exportButton = document.createElement("button");
    exportButton.className = "btn btn-success";
    exportButton.innerText = "Export";
    exportButton.onclick = () => {
        const saveData: string = JSON.stringify({
            key,
            data: JSON.parse(localStorage.getItem(key) as string)
        });

        const data = btoa(saveData);
        const url = `data:base64,${data}`;

        saveContent(url, key + ".sav");
    };
    el.appendChild(exportButton);

    document.getElementById("saveManagerBody").appendChild(el);
}

for (let i = 0; i < localStorage.length; i++) {
    createSaveManagerEntry(localStorage.key(i));
}

document.getElementById("load").onclick = () => {
    (document.getElementById("loadFile") as HTMLInputElement).click();
};

document.getElementById("importSave").onclick = () => {
    (document.getElementById("loadSave") as HTMLInputElement).click();
};

document.getElementById("loadSave").onchange = () => {
    const fileLoader = document.getElementById("loadSave") as HTMLInputElement;
    
    var fileReader = new FileReader();
    fileReader.onload = function (e) {
        const saveData: ISaveData = JSON.parse(atob(fileReader.result));
        const key = saveData.key;
        const data = JSON.stringify(saveData.data);

        localStorage.setItem(key, data);

        if (document.querySelectorAll(`[data-key=${key}]`).length === 0) {
            createSaveManagerEntry(key);
        }
    }
    fileReader.readAsText(fileLoader.files[0]);
};

document.getElementById("loadFile").onchange = () => {
    const fileLoader = document.getElementById("loadFile") as HTMLInputElement;

    var fileReader = new FileReader();
    fileReader.onload = function (e) {
        cpu = new CPU();
        cpu.setBios(bios);
        cpu.setRom(new Buffer(fileReader.result as ArrayBuffer));

        (window as any).cpu = cpu;
    }
    fileReader.readAsArrayBuffer(fileLoader.files[0]);
};

document.addEventListener("keyup", (e) => {
    if (cpu === null) {
        return;
    }

    switch (e.key) {
        case "z":
            cpu.keyReleased(Key.A);
            break;
        
        case "x":
            cpu.keyReleased(Key.B);
            break;
        
        case "c":
            cpu.keyReleased(Key.Start);
            break;
            
        case "v":
            cpu.keyReleased(Key.Select);
            break;
        
        case "ArrowUp":
            cpu.keyReleased(Key.Up);
            break;

        case "ArrowDown":
            cpu.keyReleased(Key.Down);
            break;

        case "ArrowLeft":
            cpu.keyReleased(Key.Left);
            break;

        case "ArrowRight":
            cpu.keyReleased(Key.Right);
            break;
    }
});

document.addEventListener("keydown", (e) => {
    if (cpu === null) {
        return;
    }

    switch (e.key) {
        case "z":
            cpu.keyPressed(Key.A);
            break;

        case "x":
            cpu.keyPressed(Key.B);
            break;

        case "c":
            cpu.keyPressed(Key.Start);
            break;

        case "v":
            cpu.keyPressed(Key.Select);
            break;

        case "ArrowUp":
            cpu.keyPressed(Key.Up);
            break;

        case "ArrowDown":
            cpu.keyPressed(Key.Down);
            break;

        case "ArrowLeft":
            cpu.keyPressed(Key.Left);
            break;

        case "ArrowRight":
            cpu.keyPressed(Key.Right);
            break;
    }
});

let previousTime = Date.now();
let stopEmulation = false;
const loop = () => {
    const time = Date.now();
    const delta = time - previousTime;
    previousTime = time;

    if (cpu === null) {
        requestAnimationFrame(loop);
        return;
    }

    let cycles = Math.floor(((4194304 * 3) / 1000.0) * delta);

    if (cycles >= (Math.floor(4194304 / 60) * 3)) {
        cycles = Math.floor(4194304 / 60) * 3;
    }
    
    if (stopEmulation) {
        cpu.Display.tick(cycles);
        requestAnimationFrame(loop);

        return;
    }

    const startCycles = cpu.cycles;
    while ((cpu.cycles - startCycles) < cycles) {
        if (!cpu.step()) {
            stopEmulation = true;
            break;
        }
    }

    requestAnimationFrame(loop);
};

loop();