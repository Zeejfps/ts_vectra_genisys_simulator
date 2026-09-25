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

## Confirmed by additional sources

These sources were checked in the second research pass:
- **SM**: the Vectra Genisys / Intelect XT service manual. Its section 5 test procedures include screen photos.
- **LM**: the Vectra Genisys Laser Module manual (same screens).
- **UM08**: the 2008 user manual.
- **Videos**: YouTube walkthroughs, including a Chattanooga/DJO clinical-education consultant's IFC/Premod and VMS videos and an Intelect Legend XT lab lecture.

**Parameter editing**
- **Number editor:** press the parameter, then use ↑ / ↵ (Accept) / ↓ on the **right soft keys, rows 1–3** (SM p.41, 45; LM p.32–34; videos).
- **Editor layout:** the title bar shows the parameter name. A small box has a dark header, the value on a green band, and "Range: 5-240" underneath. Holding an arrow repeats.
- **Choice parameters** cycle through their options on each press.
- The intensity knob is never used for parameters.

**Defaults**
- **IFC:** Sweep On, 80/150 Hz, 4000 Hz, Vector Scan Off, CV, 20 min (UM08, videos).
- **Premod:** Sweep On, 80/150, CV, Cycle Time Continuous, 20 min (video).
- **Russian:** 50 bps, Ramp 2 s, CC, 10/50, **20 min** (SM Fig 5.9A, video).
- **VMS:** Single, **200 µs**, 50 pps, **10/50**, Ramp 2 s (video). CV is inferred from the video.
- **High Volt:** **Negative** polarity (probably), Ramp 2 s, Sweep Continuous, 100 pps, Cycle Continuous, Display Volts, 20 min (SM Fig 5.14).
- **Microcurrent:** polarity is not Alternating by default. Probe mode is Negative, 10 Hz, 20 sec (SM Fig 5.17).

**Edit screen layouts**
- **High Volt:**

  | Row | Left | Right |
  |---|---|---|
  | 1 | Polarity | Sweep |
  | 2 | Ramp | Frequency |
  | 3 | Display | Cycle Time |
  | 4 | *(empty)* | *(empty)* |
  | 5 | intensity readout | Treatment Time |

- **Microcurrent:** a Contact Quality graph on the left. On the right: Method (Pads/Probe), Polarity, Frequency, then Treatment Time at row 5. The intensity readout ("0 uA") is at left row 5.
- **Russian:** CC/CV at left row 3, Burst Freq. at right row 3, Ramp at right row 4, Set Intensity at right row 1.
- **Set Intensity** reads "Both Channels" in Co-Contract (SM). Reciprocal sets the first channel, then the second (video).

**Treatment behaviour**
- Intensity is set with the knob *before* Start (SM, all videos).
- While running, the intensity readout shows the delivered output, not the setpoint: it climbs through the ramp and falls to 0 during the off time of the cycle (observed on a real unit by a clinician).
- Treatments run per channel, e.g. `Ch 1: Running` alongside `Ch 2: Completed`.
- **Pause drops the intensity to 0.0.** Resume with Start ("Reset intensity and press the Start button", UM08 p.63).

**End of treatment**
- A sound plays, and the (green) Completed Treatment Review appears.
- Row 1 has "Save to Patient Card" on the left and "Start New Treatment" on the right. The green list includes Start/End Time (LM p.36, videos).
- A microcurrent probe Stop returns to Home.

**Status area and messages**
- The status area has a `US:` row (`No Appl.` with no applicator).
- Under a minute the timer shows as `:20`.
- High Volt "Peak Current" display shows `0.00` with the unit `Amps`.
- Ultrasound without an applicator: "Ultrasound applicator is not plugged into unit. Press any button to continue..."
- User Protocols with none saved: "No User Protocols".

**Other**
- Clinical Protocols ask for the number of electrodes (2 or 4) for stim protocols (video).
- High Volt frequency changes in steps of 10 (video).

## Remaining approximations

These points are still unconfirmed or guessed:
- Defaults for Asym/Sym Biphasic and DC.
- Indication presets and Clinical Protocol parameters. No source gives these values.
- **VMS / VMS Burst:** the simulator opens a two-button chooser. Sources are ambiguous.
- Start/Pause/Stop act on the selected (framed) channel only. No source says whether they act on all channels.
- Anti-Fatigue appears only when Cycle Time is not Continuous. This is inferred from the High Volt and Russian photos.
- Knob resolution is 0.5 mA/V per detent (confirmed for IFC), 1 V for HVPC, 5 µA for microcurrent, and 0.1 mA for DC.
- **2 vs 4 electrodes:** 2 electrodes loads Premod and 4 loads IFC (inferred).
- Pressing Back out of a Treatment Review that was never started frees the channel.
- Screen saver after 10 minutes idle.
- HVPC peak current assumes a 500 Ω load.
- **Display:** colour. The Genisys shipped in colour and monochrome versions (a "Monochromatic LCD" replacement part, 320×240, exists).
- **Output monitor:** it illustrates each waveform family and is not an electrical model.
- **Not simulated:**
  - The Frequency editor's "Toggle Preset Frequencies" button.
  - Saving User Protocols from the Edit screen through the folder key.
  - The microcurrent probe hardware.
