import { AudioRegister, Audio } from "./audio";

export interface IAudioChannel {
    isEnabled(): boolean;
    getAudio(): Audio;
    
    readRegister(register: AudioRegister, unmasked: boolean): number;
    writeRegister(register: AudioRegister, value: number): void;
    tick(cycles: number): void;
}