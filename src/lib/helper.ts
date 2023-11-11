/**
 * get all channels as float32 arrays
 * 
 * clone the channels to work around FF bug
 */
export const getChannels = (audio: AudioBuffer) => {
    return Array.from({ length: audio.numberOfChannels }, (_, i) => audio.getChannelData(i).slice())
}
export const setChannels = (audioCtx: AudioContext, channels: Float32Array[], sampleRate: number): AudioBuffer => {
    const newBuffer = audioCtx.createBuffer(channels.length, channels[0].length, sampleRate);
    channels.forEach((channelData, index) => {
        newBuffer.copyToChannel(channelData, index);
    });
    return newBuffer;
}
/**
 * a mutex that can be used with await
 */
export const newMutex = (): [Promise<void>, () => void] => {
    let resolve: () => void
    const promise = new Promise<void>(res => {
        resolve = res
    })
    return [promise, resolve!]
}
