import * as wasm from "ebur128-crate"

export interface InputData {
    task: "loudnessIntegrated" | "truePeak" | "loudnessMatch"
    samplerate: number
    channelData: Float32Array[]
    targetLoudness?: number, // 目标响度 LUFS 默认 -23
    maxTruePeak?: number, // 最大峰值电平 dTB 默认  -1
    tolerance?: number // 容差 LU 默认 0.5
}

export interface OutputData {
    result: number
}

export interface OutputDataFull {
    result: {
        channelData: Float32Array[]
        samplerate: number
    }
}

onmessage = async (e: MessageEvent<InputData>) => {
    let result: number

    const backchannel = e.ports[0]
    if (e.data.task === 'loudnessMatch') {
        let channelDatas: Float32Array[] = []
        for (let i = 0; i < e.data.channelData.length; i++) {
            // 这组数据来自 Adobe Audition
            const { channelData, samplerate, targetLoudness = -23 } = e.data
            // 在wasm中，rust对二维数组的支持不太理想
            let normalizedData = wasm.ebur128_loudness_match(samplerate, targetLoudness, channelData[i])
            // e.data.channelData[i] = normalizedData
            channelDatas[i] = normalizedData
        }
        console.log('返回', channelDatas)
        backchannel.postMessage({
            result: {
                channelData: channelDatas,
                samplerate: e.data.samplerate
            }
        })

        backchannel.close()
    }
    if (e.data.task === "loudnessIntegrated") {
        switch (e.data.channelData.length) {
            case 1:
                result = wasm.ebur128_integrated_mono(e.data.samplerate, e.data.channelData[0])
                break
            case 2:
                result = wasm.ebur128_integrated_stereo(
                    e.data.samplerate,
                    e.data.channelData[0],
                    e.data.channelData[1]
                )
                break
            default:
                throw new Error("unsupported number of channels")
        }
    } else {
        switch (e.data.channelData.length) {
            case 1:
                result = wasm.ebur128_true_peak_mono(e.data.samplerate, e.data.channelData[0])
                break
            case 2:
                result = wasm.ebur128_true_peak_stereo(
                    e.data.samplerate,
                    e.data.channelData[0],
                    e.data.channelData[1]
                )
                break
            default:
                throw new Error("unsupported number of channels")
        }
    }

    const out: OutputData = {
        result
    }
    backchannel.postMessage(out)

    backchannel.close()

}

wasm.default().then(() => {
    postMessage("ready")
})
