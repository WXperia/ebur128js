#![cfg(target_arch = "wasm32")]

mod analyzer;
pub mod utils;

use ebur128::Mode;
use utils::{interleave_channels, set_panic_hook};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn ebur128_integrated_mono(sample_rate: u32, samples: &[f32]) -> f64 {
    set_panic_hook();
    let channels = 1;

    let data = interleave_channels(vec![samples]);

    let an = analyzer::setup_analyzer(sample_rate, channels, data, Mode::I);

    an.loudness_global()
        .unwrap_or_else(|_| panic!("Error getting loudness"))
}

#[wasm_bindgen]
pub fn ebur128_integrated_stereo(sample_rate: u32, left: &[f32], right: &[f32]) -> f64 {
    set_panic_hook();
    if left.len() != right.len() {
        panic!("left and right channel must have the same length");
    }

    let channels = 2;

    let data = interleave_channels(vec![left, right]);

    let an = analyzer::setup_analyzer(sample_rate, channels, data, Mode::I);

    an.loudness_global()
        .unwrap_or_else(|_| panic!("Error getting loudness"))
}

#[wasm_bindgen]
pub fn ebur128_true_peak_mono(sample_rate: u32, samples: &[f32]) -> f32 {
    set_panic_hook();
    let channels = 1;

    let data = interleave_channels(vec![samples]);

    let an = analyzer::setup_analyzer(sample_rate, channels, data, Mode::TRUE_PEAK);

    let peak = an
        .true_peak(0)
        .unwrap_or_else(|_| panic!("Error getting loudness"));

    20.0 * peak.log10() as f32
}

// Returns the true peak of both channels in a list
#[wasm_bindgen]
pub fn ebur128_true_peak_stereo(sample_rate: u32, left: &[f32], right: &[f32]) -> f32 {
    set_panic_hook();
    if left.len() != right.len() {
        panic!("left and right channel must have the same length");
    }

    let channels = 2;

    let data = interleave_channels(vec![left, right]);

    let an = analyzer::setup_analyzer(sample_rate, channels, data, Mode::TRUE_PEAK);

    let left_peak = an
        .true_peak(0)
        .unwrap_or_else(|_| panic!("Error getting true peak"));
    let right_peak = an
        .true_peak(1)
        .unwrap_or_else(|_| panic!("Error getting true peak"));

    let maxpeak = f64::max(left_peak, right_peak);

    20.0 * maxpeak.log10() as f32
}
pub fn process_sample(input: f32) -> f32 {
    let adjusted_gain = input.abs();

    // 削峰填谷的操作
    if adjusted_gain > -1.0 {
        // 调整后的增益大于 -1dB，使用原来的值
        input
    } else if adjusted_gain >= -12.0 && adjusted_gain <= -25.0 {
        // 调整后的增益在 -12 至 -25dB 之间，使用 1.5 倍的增益
        2.0 * input
    } else {
        // 其他情况，使用调整后的增益
        input
    }
}

#[wasm_bindgen]
pub fn ebur128_loudness_match(sample_rate: u32, target_loudness: f32, samples: &[f32]) -> Vec<f32> {
    set_panic_hook();
    let channels = 1;

    let processed_samples: Vec<f32> = samples.iter().map(|&sample| process_sample(sample)).collect();

    let data = interleave_channels(vec![&processed_samples]);

    let an = analyzer::setup_analyzer(sample_rate, channels, data, Mode::I);

    let loudness = an.loudness_global().unwrap_or_else(|_| panic!("Error getting loudness"));
    let gain = 10.0f64.powf(((target_loudness - loudness as f32) / 20.0) as f64);

    processed_samples.iter().map(|&sample| {
        let adjusted_sample = (sample as f64 * gain) as f32;
        if adjusted_sample > 0.99 {
            0.99
        } else {
            adjusted_sample
        }
    }).collect()
}