Getting started
---------------

Make sure that `node.js` is installed.

```
cd vis/
npm ci
npm run build
```

After compilation launch Node server in `../ws-server`.

Notes
-----

### Web audio analysernode

Note <https://stackoverflow.com/questions/38511612/does-analysernode-update-its-current-frequency-data-continuously>

According to above and to Chromium sources FFT is calculated on-demand, over the most recent samples available in the input buffer, 
see <https://chromium.googlesource.com/chromium/blink/+/refs/heads/main/Source/modules/webaudio/RealtimeAnalyser.cpp#151> 

### FFT frequency domain floats

 - FFT calculation in Chromium: <https://chromium.googlesource.com/chromium/blink/+/refs/heads/main/Source/modules/webaudio/RealtimeAnalyser.cpp#185>
 - Conversion to decibels: <https://chromium.googlesource.com/chromium/blink/+/refs/heads/main/Source/modules/webaudio/RealtimeAnalyser.cpp#209>
 - Underlying utility: <https://chromium.googlesource.com/chromium/blink/+/refs/heads/main/Source/platform/audio/AudioUtilities.cpp#43>

Note that FFT bin magnitude is converted into dB by above using `20 * log10f(linear)`


## dB - intensity transformation

from <https://personalpages.manchester.ac.uk/staff/richard.baker/BasicAcoustics/5_addition_of_sound_intensities.html>:

   `I` for intensity `[ W / m2 ]`,

   `dB IL = 10 log_10 ( I / 10^-12 )` thus
   `I = 10^-12 * 10 ^ (dB IL / 10) = 10 ^ (-12 + dB IL / 10)`

If we add two unrelated sounds of the same intensity together, it is equivalent to a `3 dB` increase in the total sound pressure level.
Adding `2 ^ n` intensities will increase `3n dB`
Adding k bands with equal intensities will increase `3log_2(k)`

## Exponential decay

from <https://en.wikipedia.org/wiki/Exponential_decay>

For a quantity `N` decay rate is `dN / dt = - l N`, formula `N(t) = N_0 * e ^ (-l * t)`,
half life is `t_h = ln(2) / l`; `l = ln(2) / t_h`, so
`N(t) = N_0 * e ^ (- ln(2) * t / t_h ) = N_0 * 2 ^ (-t / T_h)`





