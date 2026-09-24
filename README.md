# Vectra Genisys Simulator

A browser replica of the Chattanooga Vectra Genisys electrotherapy unit's user interface. You can explore its screens, settings, and treatment behaviour without the hardware. It is unofficial and for training and exploration only. It is not a medical device.

## Running

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (vitest)
npm run build      # typecheck + production build into dist/
```

## Using it

- **Power On** in the side panel (the real switch is on the rear panel).
- Press the **soft keys** beside the screen to press the on-screen buttons. Keys 1–5 are the left column and 6–0 are the right column.
- **Intensity knob**: drag it round, scroll over it, or use ↑/↓.
- **Start / Pause / Stop** act on the channel that is framed in the yellow status area.
- **Home + Back** pressed together open Operator Utilities (or press `U`).
- The side panel has the Patient Interrupt Switch, a timer speed-up, and an output monitor. The monitor shows the pulse shape and each channel's output level over time.

## What is simulated

| Area | Status |
| --- | --- |
| Home screen, channel selection, View/Edit Channel | ✅ |
| All 10 electrotherapy waveforms: IFC, Premod, Asym/Sym Biphasic, VMS, VMS Burst, Russian, Microcurrent, High Volt, DC | ✅ Parameters and ranges come from the manual |
| Treatment Review, Edit, Waveform Description, Electrode Placement | ✅ Placement uses simple drawings instead of photos |
| Channel allocation: 4-pole IFC and Reciprocal/Co-Contract use channel pairs | ✅ |
| Timer, Start/Pause/Stop, Completed Treatment Review, Patient Interrupt | ✅ |
| Electrotherapy Indications | ✅ Presets are representative, not from the manual |
| Clinical Resources Library → Clinical Protocols (body area → indication) | ✅ Electrotherapy only |
| Operator Utilities: clinic name keyboard, volume, pad contact, US coupling, restore defaults, date/time, version | ✅ |
| Screen saver | ✅ |
| Ultrasound, Combination, sEMG, Patient Data Card, User Protocols, Sequencing | ❌ The simulator shows a "not available" message |

See [docs/device-reference.md](docs/device-reference.md) for details taken from the user manual, and for which behaviours are approximations.

## Code layout

```
src/sim/        device model with no DOM, unit tested
  device.ts       state machine: power, navigation stack, channels, treatments, knob, timers
  screens.ts      builds a ScreenModel (title, 10 soft-key slots, blocks, status panel) per route
  waveforms.ts    waveform catalogue: parameters, ranges, edit-screen layouts, description text
  output.ts       behavioural output model (cycle/ramp envelope, sweep, pulse shapes) for the scope
  indications.ts  Indication presets
src/ui/         DOM rendering
  deviceView.ts   housing, soft keys, hardware buttons, knob; scales a fixed 620x980 canvas
  lcd.ts          renders a ScreenModel into the 330x440 LCD
  scope.ts        output monitor canvases
tests/          vitest specs for the device and output model
```

Screens are pure functions of device state. Each on-screen button carries its own `onPress`, so the physical soft key beside it just calls `device.pressSoftKey(index)`.
