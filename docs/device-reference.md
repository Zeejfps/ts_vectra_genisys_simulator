# Vectra Genisys device reference

Notes taken from the *Vectra Genisys Therapy System User Manual* (Enovis/DJO IFU, "Vectra Genisys IFU.pdf"). The page numbers below are the manual's printed page numbers. Details that no source confirms are listed in [Accuracy and approximations](accuracy.md).

## Physical layout (p. 15, 41)

- Portrait colour LCD. There are **5 soft keys on each side**. On-screen buttons are drawn beside the keys and are pressed with them (the screen is not a touch screen).
- Screen regions: title bar at the top (the clinic name on Home), a centre area with buttons/content, and a yellow channel status area at the bottom.
- Below the display: **Home** (left), **Back** (right), **Clinical Resources Library** (centre, below), and a unit-on LED between Home and Back. The LED is green on mains power, blue when on, and flashes blue during the screen saver.
- Lower housing: **Stop / Pause / Start** buttons stacked on the left, and a large **Intensity Knob** (clockwise = increase).
- Rear: power switch. Front access panel: Ch1/Ch2 lead wires (black/grey), patient interrupt switch, microcurrent probe, and ultrasound applicator.

## Screens

- **Home** (p. 42): Electrotherapy | Indications / Ultrasound | Combination / sEMG | sEMG + Stim / View/Edit Channel | Patient Card / Select Channel | (unused).
- **Electrotherapy** (p. 43): Interferential | Premod / Asymmetrical Biphasic | Microcurrent / VMS / VMS Burst (opens Select VMS Type) | Russian / High Volt | Symmetrical Biphasic / DC | Indications.
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
- **VMS:** Single, **200 usec**, 50 pps, **10/50**, Ramp 2 s, **CC**, **20 min** ("VMS for Muscle Strengthening of the Post TKA Patient" video, 1:34–1:39).
- **Sym Biphasic:** 300 usec, 80 Hz, Burst 0 bps, Freq Modulation 0 Hz, Amplitude Modulation Off, Continuous, CC, 20 min (TENS video, 1:06).
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
- **Russian:** CC/CV at left row 3, Burst Freq at right row 3, Ramp at right row 4, Set Intensity at right row 1. Set Intensity reads "1st Channel" / "2nd Channel"; Duty Cycle reads "50 %" ("Vectra Genisys Part 2" video, 4:26).
- **VMS / VMS Burst:** left Channel Mode, Phase Duration, CC/CV, Anti-Fatigue; right Set Intensity (hidden in Single), Cycle Time, Frequency, Ramp; Treatment Time at right row 5 (TKA video, 1:39).
- **Asym / Sym Biphasic:** left Phase Duration, Frequency, CC/CV, *(empty)*; right Burst Freq, Freq Modulation, Amplitude Modulation, Cycle Time; Treatment Time at right row 5 (TENS videos).
- Phase durations are written "usec", not "µsec", on buttons, the Review list and the number editor.
- **Set Intensity** reads "Both Channels" in Co-Contract (SM). Reciprocal sets the first channel, then the second (video).

**Treatment behaviour**
- Intensity is set with the knob *before* Start (SM, all videos).
- While running, the intensity readout shows the delivered output, not the setpoint: it climbs through the ramp and falls to 0 during the off time of the cycle (observed on a real unit by a clinician; visible in the "Vectra Genisys Part 2" YouTube demo at about 7:30–7:55, where a 1.0 mA VMS stim reads 0.0 → 1.0 → 0.2 → 0.0 in both the Ch 1 row and the main readout).
- Treatments run per channel, e.g. `Ch 1: Running` alongside `Ch 2: Completed`.
- Each in-use channel row ends with the intensity and a small waveform glyph, e.g. `Ch 1: Running 1.0 ⁄\_/` for VMS, in Setup as well as Running ("Vectra Genisys Part 2" video, 1:32 IFC, 4:43 Russian, 7:30 VMS).
- **Pause drops the intensity to 0.0.** Resume with Start ("Reset intensity and press the Start button", UM08 p.63).

**End of treatment**
- A sound plays, and the (green) Completed Treatment Review appears.
- Row 1 has "Save to Patient Card" on the left and "Start New Treatment" on the right (LM p.36, videos).
- The green list drops CC/CV and adds, before Treatment Time, `Start/End Time: 11:48:25 AM / 11:48:33 AM` and `Amplitude: 0.4 / 0.4 V CV` (the intensity at the end). It runs down to row 5. The status area then shows only `Ch 1: Completed`, with no timer or intensities ("Vectra Genisys Part 2" video, 1:56; "Part1", 7:11).
- A microcurrent probe Stop returns to Home.

**Status area and messages**
- The status area has a `US:` row (`No Appl.` with no applicator). Pad contact quality is drawn at the end of that row: an electrode-lead glyph and a thin bar per channel ("Vectra Genisys Part 2" video, 1:32).
- **Treatment Review list:** label and value in two aligned columns, units spelled out ("20 minutes", "2 seconds"), in a fixed order per waveform. IFC: Waveform, CC/CV, Carrier Freq, Frequency (`80/150 Hz`, sweep combined), Vector Scan, Treatment Time. Premod: Waveform, CC/CV, Cycle Time, Frequency, Treatment Time. VMS: Waveform, Channel Mode, CC/CV, Cycle Time, Frequency, Ramp, Phase Duration, Anti-Fatigue, Treatment Time. Russian: Waveform, Channel Mode, CC/CV, Cycle Time, Burst Freq, Duty Cycle, Ramp, Anti-Fatigue, Treatment Time (videos).
- Under a minute the timer shows as `:20`.
- High Volt "Peak Current" display shows `0.00` with the unit `Amps`.
- Ultrasound without an applicator: "Ultrasound applicator is not plugged into unit. Press any button to continue..."
- User Protocols with none saved: "No User Protocols".

**Other**
- Clinical Protocols ask for the number of electrodes for IFC/Premod protocols. The screen is titled with the protocol (e.g. "Cervical Acute Pain") and has **4 Electrodes** at right row 1 and **2 Electrodes** at right row 2, with no other text ("Vectra Genisys Part1" video, 6:12).
- A protocol's Treatment Review is titled with the protocol, e.g. "Cervical Acute Pain 2 Electrodes: Ch 1". Its left row 1 button reads **Waveform Rationale** (UM p.95, video 6:20).
- The Clinical Protocols list varies by body area. Shoulder shows all six e-stim and four ultrasound buttons (UM p.94). Cervical shows only Acute Pain, Chronic Pain, Increase Local Circulation and Relax Muscle Spasm, plus ultrasound Chronic Pain, Sub-chronic Pain and Scar Tissue / Adhesions (video, 6:02).
- **IFC Vector Scan** reads Off, Manual, "Automatic 40%" and presumably "Automatic 100%" (the manual writes 40% / 100%). Manual adds **Vector Position** (45 deg., range 0–90) at right row 2; its editor draws a clover-shaped interference pattern. Automatic 40% varies each channel's intensity down to 60% of the setting, the two channels out of step (e.g. 0.6 / 0.9 readouts) ("IFC Interferential" video, 1:02–1:50).
- High Volt frequency changes in steps of 10 (video).
