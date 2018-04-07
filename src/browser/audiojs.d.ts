declare module 'audiojs' {
    export interface IAudioOptions {
        inputSampleRate?: number;
        outputSampleRate?: number;

        channelCount?: number;

        minBufferSize?: number | null;
        maxBufferSize?: number | null;

        sampleCountPerCallback?: number;

        formatCallback?: (sample: number) => number;
        underrunCallback?: (numSamples: number) => number[];
    }

    export class AudioServer {
        setVolume(volume: number): void;

        writeAudio(samples: number[]): void;
        writeAudioNoCallback(samples: number[]): void;

        remainingBuffer(): number;
        executeCallback(): void;

        refillResampleBuffer(): void;
    }

    export function createAudioServer(options?: IAudioOptions): Promise<AudioServer>;
}