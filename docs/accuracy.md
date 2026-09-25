# Accuracy and approximations

The simulator follows the Vectra Genisys user manual, the service manual and walkthrough videos of the real unit. The sources are listed in the [device reference](device-reference.md). Some behaviour isn't documented anywhere, so the simulator makes an educated guess. This page lists every such guess, so you know which parts to check against a real unit.

If you've used a real Vectra Genisys and can confirm or correct any of these, please [open an issue on GitHub](https://github.com/Zeejfps/ts_vectra_genisys_simulator/issues).

## Unconfirmed or guessed

- Defaults for Asym/Sym Biphasic and DC.
- Indication presets and Clinical Protocol parameters. No source gives these values.
- Clinical Protocol lists for body areas other than Shoulder and Cervical use the full Shoulder list.
- Vector Scan timing (a 6 s cycle), the Vector Position step (1 deg.), and which channel 0 deg. favours are guesses.
- **VMS FR** appears on the "Select VMS Type" screen (VMS, VMS Burst, VMS FR stacked on the left; TKA video, 1:31) but is not simulated; its icon is approximate.
- Review-list order for Asym/Sym Biphasic, High Volt, Microcurrent and DC is not seen in footage and follows the parameter order.
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
