# Device reference notes

Notes taken from the *Vectra Genisys Therapy System User Manual* (Enovis/DJO IFU, "Vectra Genisys IFU.pdf"). The page numbers below are the manual's printed page numbers.

## Physical layout (p. 15, 41)

- Portrait colour LCD. There are **5 soft keys on each side**. On-screen buttons are drawn beside the keys and are pressed with them (the screen is not a touch screen).
- Screen regions: title bar at the top (the clinic name on Home), a centre area with buttons/content, and a yellow channel status area at the bottom.
- Below the display: **Home** (left), **Back** (right), **Clinical Resources Library** (centre, below), and a unit-on LED between Home and Back. The LED is green on mains power, blue when on, and flashes blue during the screen saver.
- Lower housing: **Stop / Pause / Start** buttons stacked on the left, and a large **Intensity Knob** (clockwise = increase).
- Rear: power switch. Front access panel: Ch1/Ch2 lead wires (black/grey), patient interrupt switch, microcurrent probe, and ultrasound applicator.

## Screens

- **Home** (p. 42): Electrotherapy | Indications / Ultrasound | Combination / sEMG | sEMG + Stim / View/Edit Channel | Patient Card / Select Channel | (unused).
- **Electrotherapy** (p. 43): Interferential | Premod / Asymmetrical Biphasic | Microcurrent / VMS / VMS Burst | Russian / High Volt | Symmetrical Biphasic / DC | Indications.
- **Treatment Review Ch N** (p. 44–45, 55): Waveform Description | Electrode Placement. A green parameter list below, then the intensity readout and Edit.
- **Edit** (p. 45): parameter buttons. The IFC layout is Sweep | Vector Scan / – | – / Beat Low | Carrier Freq. / Beat High | CC/CV / intensity | Treatment Time.
- Status area: `Ch 1: Setup` with per-channel intensity on the left; large mm:ss timer, channel intensities and unit ("Volts CV", "mA CC") on the right. The framed row is the selected channel. With Pad Contact Quality on, bar graphs appear for IFC (dual), Premod and Russian (single).
- Patient interrupt message (p. 46): pink box, "Patient switch for Ch1 and 2 was pressed. Press any button to continue...". A second press of the switch clears the message and leaves the treatment paused.
- Operator Utilities (p. 26–31): Home + Back pressed together. Clinic Name uses a 3-row character keyboard: the row keys frame a character, then Move Left, Accept, Delete, Save. Also Volume (Off, X-Low, Low, Med, High, X-High), Restore Default Protocols, Restore Default Unit Settings, Erase Patient Card, Set Date and Time, US Coupling, Pad Contact Quality, Display Unit Version, and Language.

## Waveform specifications (p. 19–23)

| Waveform | Intensity | Key parameters |
| --- | --- | --- |
| IFC (4p) | 0–100 mA CC / 0–100 V CV | Carrier 2500/4000/5000 Hz; beat 1–200 Hz; sweep low 1–199, high 1–200, 15 s sweep; vector scan Off/Manual/40%/100%; 1–60 min |
| Premod (2p) | 0–100 mA / V | Carrier fixed 2500 Hz; beat/sweep as IFC |
| Asym Biphasic | 0–110 mA / V | Phase 20–1000 µs; 1–250 Hz; burst 0–10 bps; freq mod 0–250 Hz; amp mod Off/40/60/80/100%; cycle 4/4…10/50 |
| Sym Biphasic | 0–80 mA / V | as Asym |
| VMS / VMS Burst | 0–200 mA / V | Single/Reciprocal/Co-Contract; phase 20–400 µs; 1–200 pps; ramp 0.5/1/2/5 s; anti-fatigue; cycle Continuous, 5/5…10/50 |
| Russian | 0–100 mA / V | Carrier 2500 Hz; duty 10–50%; burst 20–100 bps; channel modes; ramp; anti-fatigue |
| Microcurrent | 5–1000 µA | Polarity +/−/alternating; carrier 0.1–1000 Hz; 50% duty, 1 s ramp fixed |
| High Volt (HVPC) | 0–500 V | Polarity; ramp; display volts/peak current; sweep Continuous, 80/120, 1/120, 1/10 pps; 10–120 pps; anti-fatigue |
| DC | 0–4 mA | Polarity reversal at 50% of treatment time; cycle Continuous, 5/60, 10/60; 1–10 min |

## Simulator approximations

These behaviours are not specified in the manual. The simulator uses reasonable guesses:

- Default parameter values for most waveforms.
- Indication and Clinical Protocol presets.
- Knob resolution: 0.5 mA/V per detent, 1 V for HVPC, 5 µA for microcurrent, 0.1 mA for DC.
- Numeric parameters open an arrow-key editor (↑ / Accept / ↓ on the right soft keys), like the list selector on p. 68. Choice parameters cycle through their options on each press, as the manual describes for toggles.
- VMS / VMS Burst opens a two-button chooser.
- Start, Pause and Stop act on the selected (framed) channel only.
- Pressing Back out of a Treatment Review that was never started frees the channel. Pressing Home keeps it in Setup.
- Screen saver starts after 10 minutes idle with no treatment running.
- HVPC "Peak Current" display assumes a 500 Ω load.
- Output monitor waveforms are illustrations of each waveform family, not an electrical model. That includes the amplitude/frequency modulation period, the anti-fatigue variation, and the VMS Burst pulse count.
