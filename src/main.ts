import { setChannels } from "./lib/helper"
import { LoudnessMeter } from "./lib/loudness"

// @ts-ignore
import toWav from 'audiobuffer-to-wav'
const ebur128 = new LoudnessMeter()

const fileIn = document.getElementById("file") as HTMLInputElement

const decodeTimeOut = document.getElementById("decodingTime") as HTMLTableCellElement

const loudnessOut = document.getElementById("loudness-i") as HTMLTableCellElement

const truePeakOut = document.getElementById("true-peak") as HTMLTableCellElement
const matchOut = document.getElementById("loundness-match") as HTMLTableCellElement
fileIn.addEventListener("change", async () => {
  decodeTimeOut.innerHTML = "解码中..."
  loudnessOut.innerHTML = ""
  truePeakOut.innerHTML = ""
  const file = fileIn.files![0]
  const audioCtx = new AudioContext()
  const decodeStart = performance.now()
  const audioBuffer = await audioCtx.decodeAudioData(await file.arrayBuffer())
  const decodeEnd = performance.now()

  decodeTimeOut.innerText = (decodeEnd - decodeStart).toFixed(2) + "毫秒"

  loudnessOut.innerHTML = "计算中..."
  const loudStart = performance.now()
  let loudness = await ebur128.loudnessIntegrated(audioBuffer)
  const loudEnd = performance.now()

  loudnessOut.innerText = `${loudness.toFixed(2)} LUFS (用时 ${(loudEnd - loudStart).toFixed(2)}毫秒)`

  truePeakOut.innerHTML = "计算中..."
  const peakStart = performance.now()

  let truePeak = await ebur128.truePeak(audioBuffer)
  const peakEnd = performance.now()

  truePeakOut.innerText = `${truePeak.toFixed(2)} dBTP (用时 ${(peakEnd - peakStart).toFixed(2)}毫秒)`

  const startMatch = performance.now()
  let { channelData, samplerate } = await ebur128.loudnessMatch(audioBuffer, -12) as any
  const endH = performance.now()
  const audioContext = new AudioContext();
  let newAudioBuffer = setChannels(audioContext, channelData, samplerate);

  const source = audioContext.createBufferSource();
  source.buffer = newAudioBuffer;
  source.connect(audioContext.destination);
  source.start();

  matchOut.innerText = ` 用时 ${(endH - startMatch).toFixed(2)}毫秒)`
  const wav = toWav(newAudioBuffer)
  const downloadLink = document.createElement('a');
  downloadLink.href = window.URL.createObjectURL(new Blob([wav], {type: 'audio/wav'}));
  downloadLink.download = 'output.wav';
  downloadLink.innerHTML = '下载Wav';
  document.body.appendChild(downloadLink);

})