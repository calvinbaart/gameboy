import { ISaveData } from "./storage";

function saveContent(url: string, fileName: string) {
    var link = document.createElement('a');
    link.download = fileName;
    link.href = url;
    link.click();
}

export class SaveManager {
    public static createEntry(key: string | null): void {
        if (key === null) {
            return;
        }

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
            (document.querySelector(`[data-key=${key}]`) as HTMLElement).remove();
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

        (document.getElementById("saveManagerBody") as HTMLElement).appendChild(el);
    }

    public static hasEntry(key: string | null): boolean {
        if (key === null) {
            return false;
        }

        return document.querySelectorAll(`[data-key=${key}]`).length !== 0;
    }

    public static setup() {
        for (let i = 0; i < localStorage.length; i++) {
            SaveManager.createEntry(localStorage.key(i));
        }

        (document.getElementById("importSave") as HTMLElement).onclick = () => {
            (document.getElementById("loadSave") as HTMLInputElement).click();
        };

        (document.getElementById("loadSave") as HTMLElement).onchange = () => {
            const fileLoader = document.getElementById("loadSave") as HTMLInputElement;

            var fileReader = new FileReader();
            fileReader.onload = function (e) {
                const saveData: ISaveData = JSON.parse(atob(fileReader.result));
                const key = saveData.key;
                const data = JSON.stringify(saveData.data);

                localStorage.setItem(key, data);

                if (!SaveManager.hasEntry(key)) {
                    SaveManager.createEntry(key);
                }
            }
            fileReader.readAsText((fileLoader.files as FileList)[0]);
        };
    }
}