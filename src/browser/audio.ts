import { CPU } from "../core/cpu/cpu";
import * as Audiojs from "audiojs";
import { Audio } from "../core/audio/audio";

export class BrowserAudio {
    public static setup() {
        Audiojs.createAudioServer({
            inputSampleRate: 44100,
            channelCount: 1,
            minBufferSize: 1024,
            maxBufferSize: 2048
        }).then(server => {
            Audio.onBufferReady = (buffer) => {
                server.writeAudioNoCallback(buffer);
            };
        });
    }
}
