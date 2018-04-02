import { Video } from "../core/video/video";

let canvas: HTMLCanvasElement | null = null;
let context: CanvasRenderingContext2D | null = null;
let image: ImageData | null = null;

export class Render {
    public static setup() {
        Video.setupWindow = (display: Video) => {
            if (canvas !== null) {
                display._framebuffer = (image as ImageData).data;
                return;
            }

            const element = document.getElementById("emulator");

            if (element === null) {
                return;
            }

            canvas = document.createElement("canvas");
            canvas.width = 160;
            canvas.height = 144;

            setInterval(function () {
                const parentElement = element.parentElement;

                if (parentElement === null) {
                    return;
                }

                const width1 = window.innerWidth - 20;
                const width2 = Math.floor((window.innerHeight - parentElement.offsetTop) / 144) * 160;
                const width = Math.min(width1, width2);

                (canvas as HTMLCanvasElement).style.minWidth = width + "px";
                (canvas as HTMLCanvasElement).style.maxWidth = width + "px";
                (canvas as HTMLCanvasElement).style.width = width + "px";

                const height = Math.floor(width / 160) * 144;

                (canvas as HTMLCanvasElement).style.minHeight = height + "px";
                (canvas as HTMLCanvasElement).style.maxHeight = height + "px";
                (canvas as HTMLCanvasElement).style.height = height + "px";
            }, 50);

            context = canvas.getContext("2d");

            if (context === null) {
                return;
            }

            context.fillStyle = "#dddddd";
            context.fillRect(0, 0, 160, 144);
            context.imageSmoothingEnabled = false;

            image = context.createImageData(160, 144);
            display._framebuffer = image.data;

            element.appendChild(canvas);
        };

        Video.render = (display: Video) => {
            if (context === null || image === null) {
                return;
            }

            context.putImageData(image, 0, 0);
        };
    }
}