import { describe, expect, it } from 'vitest';
import { Device, SCREEN_SAVER_MS } from '../src/sim/device';
import { slotIndex } from '../src/sim/screenModel';

function poweredDevice(clock = { t: 0 }): Device {
  const d = new Device({ now: () => clock.t });
  d.togglePower();
  d.tick(3000);
  return d;
}

const L = (row: number) => slotIndex('left', row);
const R = (row: number) => slotIndex('right', row);

function labels(d: Device): string[] {
  return d.screen().slots.map((s) => s?.label ?? '');
}

describe('power and home', () => {
  it('boots to the Home screen with all channels available', () => {
    const d = poweredDevice();
    const s = d.screen();
    expect(s.title).toBe('Chattanooga Group Vectra Genisys');
    expect(s.slots[L(1)]?.label).toBe('Electrotherapy');
    expect(s.status?.rows.map((r) => r.status)).toEqual(['Available', 'Available', 'Available', 'Available', 'No Appl.']);
    expect(s.status?.rows[0].framed).toBe(true);
  });

  it('ignores input while off', () => {
    const d = new Device();
    d.pressSoftKey(L(1));
    expect(d.route.kind).toBe('home');
    expect(d.screen().kind).toBe('off');
  });
});

describe('electrotherapy setup', () => {
  it('interferential allocates channels 1 and 2 and shows Treatment Review', () => {
    const d = poweredDevice();
    d.pressSoftKey(L(1)); // Electrotherapy
    d.pressSoftKey(L(1)); // Interferential
    const s = d.screen();
    expect(s.title).toBe('Treatment Review Ch 1-2');
    expect(d.channelStatus(1)).toBe('Setup');
    expect(d.channelStatus(2)).toBe('Setup');
    expect(s.status?.timer).toBe('20:00');
  });

  it('backing out of an unstarted setup frees the channels', () => {
    const d = poweredDevice();
    d.pressSoftKey(L(1));
    d.pressSoftKey(L(1));
    d.pressBack();
    expect(d.route.kind).toBe('estim');
    expect(d.channelStatus(1)).toBe('Available');
  });

  it('single channel waveforms take the next free channel', () => {
    const d = poweredDevice();
    d.pressSoftKey(L(1));
    d.pressSoftKey(L(1)); // IFC on 1-2
    d.pressHome();
    d.pressSoftKey(L(1));
    d.pressSoftKey(R(1)); // Premod
    expect(d.screen().title).toBe('Treatment Review Ch 3');
  });

  it('choice parameters cycle and sweep off swaps Beat Low for Beat Freq', () => {
    const d = poweredDevice();
    d.pressSoftKey(L(1));
    d.pressSoftKey(L(1));
    d.pressSoftKey(R(5)); // Edit
    expect(labels(d)[L(1)]).toBe('Sweep\nOn');
    d.pressSoftKey(L(1));
    expect(labels(d)[L(1)]).toBe('Sweep\nOff');
    expect(labels(d)[L(3)]).toBe('Beat Freq.\n100 Hz');
    expect(labels(d)[L(4)]).toBe('');
  });

  it('numeric parameters are edited with up/down and accepted', () => {
    const d = poweredDevice();
    d.pressSoftKey(L(1));
    d.pressSoftKey(L(1));
    d.pressSoftKey(R(5)); // Edit
    d.pressSoftKey(L(3)); // Beat Low 80
    expect(d.screen().title).toBe('Beat Low');
    d.pressSoftKey(R(1)); // up
    d.pressSoftKey(R(1)); // up
    d.pressSoftKey(R(2)); // accept
    expect(labels(d)[L(3)]).toBe('Beat Low\n82 Hz');
  });

  it('Back cancels a numeric edit', () => {
    const d = poweredDevice();
    d.pressSoftKey(L(1));
    d.pressSoftKey(L(1));
    d.pressSoftKey(R(5));
    d.pressSoftKey(L(3));
    d.pressSoftKey(R(3)); // down
    d.pressBack();
    expect(labels(d)[L(3)]).toBe('Beat Low\n80 Hz');
  });

  it('beat low cannot exceed beat high', () => {
    const d = poweredDevice();
    d.pressSoftKey(L(1));
    d.pressSoftKey(L(1));
    d.pressSoftKey(R(5));
    d.pressSoftKey(L(3));
    for (let i = 0; i < 200; i++) d.pressSoftKey(R(1));
    d.pressSoftKey(R(2));
    expect(labels(d)[L(3)]).toBe('Beat Low\n149 Hz');
  });
});

describe('treatment lifecycle', () => {
  function startIfc(d: Device) {
    d.pressSoftKey(L(1));
    d.pressSoftKey(L(1));
    d.turnKnob(10);
    d.pressStart();
  }

  it('knob sets linked intensity on both IFC channels', () => {
    const d = poweredDevice();
    d.pressSoftKey(L(1));
    d.pressSoftKey(L(1));
    d.turnKnob(10);
    expect(d.activeTreatment?.intensity).toEqual([5, 5]);
    d.turnKnob(-100);
    expect(d.activeTreatment?.intensity).toEqual([0, 0]);
  });

  it('runs, pauses, and completes when the timer expires', () => {
    const d = poweredDevice();
    startIfc(d);
    expect(d.channelStatus(1)).toBe('Running');
    d.tick(60_000);
    expect(d.screen().status?.timer).toBe('19:00');
    d.pressPause();
    d.tick(60_000);
    expect(d.screen().status?.timer).toBe('19:00');
    d.pressPause();
    d.tick(19 * 60_000);
    expect(d.channelStatus(1)).toBe('Completed');
    expect(d.activeTreatment?.intensity).toEqual([0, 0]);
  });

  it('Stop shows the Completed Treatment Review screen', () => {
    const d = poweredDevice();
    startIfc(d);
    d.pressHome();
    d.pressStop();
    expect(d.screen().title).toBe('Completed Treatment Review Ch 1-2');
    expect(labels(d)[L(1)]).toBe('Save to\nPatient Card');
    expect(labels(d)[R(1)]).toBe('Start New\nTreatment');
    d.pressSoftKey(R(1));
    expect(d.channelStatus(1)).toBe('Available');
    expect(d.route.kind).toBe('estim');
  });

  it('patient interrupt pauses channels 1/2 and shows a message', () => {
    const d = poweredDevice();
    startIfc(d);
    d.patientInterrupt();
    expect(d.channelStatus(1)).toBe('Paused');
    expect(d.screen().message?.tone).toBe('pink');
    d.pressSoftKey(L(1)); // any button clears
    expect(d.screen().message).toBeNull();
    expect(d.channelStatus(1)).toBe('Paused');
  });

  it('changing treatment time while running adjusts the remaining time', () => {
    const d = poweredDevice();
    startIfc(d);
    d.tick(60_000);
    const t = d.activeTreatment!;
    d.setParam(t, 'time', 25);
    expect(d.screen().status?.timer).toBe('24:00');
  });
});

describe('channel modes', () => {
  it('reciprocal VMS grows to a channel pair', () => {
    const d = poweredDevice();
    d.pressSoftKey(L(1));
    d.pressSoftKey(L(3)); // VMS / VMS Burst
    d.pressSoftKey(L(1)); // VMS
    expect(d.screen().title).toBe('Treatment Review Ch 1');
    d.pressSoftKey(R(5)); // Edit
    d.pressSoftKey(L(1)); // Channel Mode -> Reciprocal
    expect(d.channelStatus(2)).toBe('Setup');
    d.pressSoftKey(L(1)); // -> Co-Contract
    d.pressSoftKey(L(1)); // -> Single
    expect(d.channelStatus(2)).toBe('Available');
  });

  it('reciprocal intensities are set per channel', () => {
    const d = poweredDevice();
    d.pressSoftKey(L(1));
    d.pressSoftKey(L(3));
    d.pressSoftKey(L(1));
    d.pressSoftKey(R(5));
    d.pressSoftKey(L(1)); // Reciprocal
    d.turnKnob(4);
    d.pressSoftKey(R(1)); // Set Intensity -> Second Channel
    d.turnKnob(2);
    expect(d.activeTreatment?.intensity).toEqual([2, 1]);
    d.pressSoftKey(R(1)); // Set Intensity -> back to First Channel
    expect(labels(d)[R(1)]).toBe('Set Intensity\nFirst Channel');
    d.turnKnob(2);
    expect(d.activeTreatment?.intensity).toEqual([3, 1]);
    expect(d.selectedChannel).toBe(1);
  });

  it('Russian reciprocal can switch Set Intensity back and forth', () => {
    const d = poweredDevice();
    d.pressSoftKey(L(1)); // Electrotherapy
    d.pressSoftKey(R(3)); // Russian
    d.pressSoftKey(R(5)); // Edit
    d.pressSoftKey(L(1)); // Reciprocal
    for (const [expected, ch] of [['Second Channel', 2], ['First Channel', 1], ['Second Channel', 2]] as const) {
      d.pressSoftKey(R(1));
      expect(labels(d)[R(1)]).toBe(`Set Intensity\n${expected}`);
      expect(d.selectedChannel).toBe(ch);
    }
  });

  it('Select Channel on Home keeps Set Intensity in step', () => {
    const d = poweredDevice();
    d.pressSoftKey(L(1));
    d.pressSoftKey(R(3)); // Russian on Ch 1
    d.pressSoftKey(R(5));
    d.pressSoftKey(L(1)); // Reciprocal -> Ch 1-2
    d.pressHome();
    d.pressSoftKey(L(5)); // Select Channel -> Ch 2
    expect(d.activeTreatment?.params.setIntensity).toBe('Second Channel');
    d.turnKnob(2);
    expect(d.activeTreatment?.intensity).toEqual([0, 1]);
  });
});

describe('operator utilities', () => {
  it('Home + Back together opens Utilities', () => {
    const clock = { t: 0 };
    const d = poweredDevice(clock);
    d.pressHome();
    clock.t = 100;
    d.pressBack();
    expect(d.route.kind).toBe('utilities');
  });

  it('Home then Back slowly is just two presses', () => {
    const clock = { t: 0 };
    const d = poweredDevice(clock);
    d.pressHome();
    clock.t = 2000;
    d.pressBack();
    expect(d.route.kind).toBe('home');
  });

  it('clinic name can be edited from the keyboard', () => {
    const clock = { t: 0 };
    const d = poweredDevice(clock);
    d.pressHome();
    d.pressBack();
    d.pressSoftKey(L(1)); // Clinic Name
    // Clear existing name.
    for (let i = 0; i < 40; i++) d.pressSoftKey(L(5));
    d.pressSoftKey(L(1)); // row 1 -> ' '
    d.pressSoftKey(L(1)); // 'A'
    d.pressSoftKey(R(4)); // accept
    d.pressSoftKey(L(2)); // 'N'
    d.pressSoftKey(R(4));
    d.pressSoftKey(R(5)); // save
    expect(d.settings.clinicName).toBe('AN');
  });
});

describe('screen saver', () => {
  it('blanks after idle time and the first press only wakes it', () => {
    const d = poweredDevice();
    d.tick(SCREEN_SAVER_MS);
    expect(d.screen().kind).toBe('saver');
    d.pressSoftKey(L(1));
    expect(d.screen().kind).toBe('screen');
    expect(d.route.kind).toBe('home');
  });

  it('does not start while a treatment is running', () => {
    const d = poweredDevice();
    d.pressSoftKey(L(1));
    d.pressSoftKey(L(1));
    d.pressStart();
    d.tick(SCREEN_SAVER_MS);
    expect(d.screen().kind).toBe('screen');
  });
});

describe('behaviour confirmed by the service manual and training videos', () => {
  it('pausing drops intensity to zero and Start resumes', () => {
    const d = poweredDevice();
    d.pressSoftKey(L(1));
    d.pressSoftKey(L(1));
    d.turnKnob(10);
    d.pressStart();
    d.pressPause();
    expect(d.channelStatus(1)).toBe('Paused');
    expect(d.activeTreatment?.intensity).toEqual([0, 0]);
    d.pressStart();
    expect(d.channelStatus(1)).toBe('Running');
  });

  it('shows the Completed Treatment Review when the timer runs out', () => {
    const d = poweredDevice();
    d.pressSoftKey(L(1));
    d.pressSoftKey(L(1));
    d.pressStart();
    d.pressHome();
    d.tick(20 * 60_000);
    expect(d.screen().title).toBe('Completed Treatment Review Ch 1-2');
  });

  it('timer drops the leading zero under a minute', () => {
    const d = poweredDevice();
    d.pressSoftKey(L(1));
    d.pressSoftKey(L(1));
    d.pressStart();
    d.tick(19 * 60_000 + 40_000);
    expect(d.screen().status?.timer).toBe(':20');
  });

  it('co-contract sets both channels together', () => {
    const d = poweredDevice();
    d.pressSoftKey(L(1));
    d.pressSoftKey(R(3)); // Russian
    d.pressSoftKey(R(5));
    d.pressSoftKey(L(1)); // Reciprocal
    d.pressSoftKey(L(1)); // Co-Contract
    expect(labels(d)[R(1)]).toBe('Set Intensity\nBoth Channels');
    d.turnKnob(4);
    expect(d.activeTreatment?.intensity).toEqual([2, 2]);
  });

  it('microcurrent probe uses a seconds timer', () => {
    const d = poweredDevice();
    d.pressSoftKey(L(1));
    d.pressSoftKey(R(2)); // Microcurrent
    d.pressSoftKey(R(5)); // Edit
    expect(labels(d)[R(1)]).toBe('Method\nPads');
    d.pressSoftKey(R(1)); // Probe
    expect(labels(d)[R(5)]).toBe('Treatment Time\n20 sec.');
    expect(d.screen().status?.timer).toBe(':20');
  });

  it('clinical protocols ask for the number of electrodes', () => {
    const d = poweredDevice();
    d.pressLibrary();
    d.pressSoftKey(L(1)); // Clinical Protocols
    d.pressSoftKey(R(1)); // Shoulder
    d.pressSoftKey(L(1)); // Acute Pain
    expect(d.route.kind).toBe('electrodeCount');
    d.pressSoftKey(L(4)); // 2 Electrodes
    expect(d.screen().title).toBe('Treatment Review Ch 1');
    expect(d.activeTreatment?.waveform).toBe('premod');
  });
});
