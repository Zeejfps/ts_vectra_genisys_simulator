import type { Device } from '../sim/device';

// What main.ts needs from a view of the physical unit (3D, or the flat fallback).

export type HardwareKey = 'home' | 'back' | 'library' | 'start' | 'pause' | 'stop';

export interface UnitView {
  /** Redraw the LCD and LED from the device state. */
  render(): void;
  /** Called every animation frame. */
  frame(now: number): void;
  /** Visual feedback for a knob turn triggered from outside (keyboard). */
  nudgeKnob(detents: number): void;
  softKeyDown(index: number): void;
  softKeyUp(): void;
  /** Press a hardware key as if tapped (keyboard shortcuts). */
  pressHardware(key: HardwareKey): void;
}

/** Knob rotation (degrees) per detent. */
export const DEGREES_PER_DETENT = 12;

export function hardwareAction(device: Device, key: HardwareKey): void {
  const actions: Record<HardwareKey, () => void> = {
    home: () => device.pressHome(),
    back: () => device.pressBack(),
    library: () => device.pressLibrary(),
    start: () => device.pressStart(),
    pause: () => device.pressPause(),
    stop: () => device.pressStop(),
  };
  actions[key]();
}
