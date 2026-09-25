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

function reviewLines(d: Device): string[] {
  const block = d.screen().blocks.find((b) => b.type === 'text');
  return block?.type === 'text' ? block.lines : [];
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

  it('Treatment Review lists IFC settings in the unit order with a combined frequency', () => {
    const d = poweredDevice();
    d.pressSoftKey(L(1));
    d.pressSoftKey(L(1));
    expect(reviewLines(d)).toEqual([
      'Waveform:\tInterferential',
      'CC/CV:\tCV',
      'Carrier Freq:\t4000 Hz',
      'Frequency:\t80/150 Hz',
      'Vector Scan:\tOff',
      'Treatment Time:\t20 minutes',
    ]);
  });

  it('Completed review shows times and amplitude, and the status area drops the timer', () => {
    const d = poweredDevice();
    startIfc(d);
    d.pressStop();
    const lines = reviewLines(d);
    expect(lines).not.toContain('CC/CV:\tCV');
    expect(lines.slice(-3)[0]).toMatch(/^Start\/End Time:\t\d{1,2}:\d{2}:\d{2} [AP]M \/ \d{1,2}:\d{2}:\d{2} [AP]M$/);
    expect(lines.slice(-2)).toEqual(['Amplitude:\t5.0 / 5.0 V CV', 'Treatment Time:\t20 minutes']);
    const status = d.screen().status;
    expect(status?.timer).toBeNull();
    expect(status?.intensities).toEqual([]);
    expect(status?.rows[0].status).toBe('Completed');
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
    d.pressSoftKey(R(1)); // Set Intensity -> 2nd Channel
    d.turnKnob(2);
    expect(d.activeTreatment?.intensity).toEqual([2, 1]);
    d.pressSoftKey(R(1)); // Set Intensity -> back to 1st Channel
    expect(labels(d)[R(1)]).toBe('Set Intensity\n1st Channel');
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
    for (const [expected, ch] of [['2nd Channel', 2], ['1st Channel', 1], ['2nd Channel', 2]] as const) {
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
    expect(d.activeTreatment?.params.setIntensity).toBe('2nd Channel');
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

  it('running intensity readout follows the ramp and off time', () => {
    const d = poweredDevice();
    d.pressSoftKey(L(1));
    d.pressSoftKey(R(3)); // Russian: 2 sec ramp, 10/50 cycle
    d.turnKnob(20);
    const shown = () => d.screen().status?.rows[0].intensity;
    expect(shown()).toBe('10.0');
    d.pressStart();
    expect(shown()).toBe('0.0');
    d.tick(1000);
    expect(shown()).toBe('5.0');
    d.tick(4000);
    expect(shown()).toBe('10.0');
    d.tick(7000);
    expect(shown()).toBe('0.0');
    expect(d.activeTreatment?.intensity).toEqual([10]);
  });

  it('VMS follows the real unit: Select VMS Type, CC, 20 min and its edit layout', () => {
    const d = poweredDevice();
    d.pressSoftKey(L(1));
    d.pressSoftKey(L(3)); // VMS / VMS Burst
    expect(d.screen().title).toBe('Select VMS Type');
    expect([labels(d)[L(1)], labels(d)[L(2)], labels(d)[L(3)]]).toEqual(['VMS', 'VMS Burst', 'VMS FR']);
    d.pressSoftKey(L(1));
    expect(d.activeTreatment?.params.mode).toBe('CC');
    expect(d.screen().status?.timer).toBe('20:00');
    d.pressSoftKey(R(5)); // Edit
    const l = labels(d);
    expect([l[R(2)], l[R(3)], l[R(4)]]).toEqual(['Cycle Time\n10/50', 'Frequency\n50 pps', 'Ramp\n2 sec']);
    expect(l[L(2)]).toBe('Phase Duration\n200 usec');
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
    expect(d.screen().title).toBe('Shoulder Acute Pain');
    expect([labels(d)[R(1)], labels(d)[R(2)]]).toEqual(['4\nElectrodes', '2\nElectrodes']);
    d.pressSoftKey(R(2)); // 2 Electrodes
    expect(d.screen().title).toBe('Shoulder Acute Pain 2 Electrodes: Ch 1');
    expect(labels(d)[L(1)]).toBe('Waveform\nRationale');
    expect(reviewLines(d)[0]).toBe('Waveform:\tPremod');
    expect(reviewLines(d).some((l) => l.includes('Protocol'))).toBe(false);
    expect(d.activeTreatment?.waveform).toBe('premod');
  });

  it('Cervical offers a shorter protocol list', () => {
    const d = poweredDevice();
    d.pressLibrary();
    d.pressSoftKey(L(1)); // Clinical Protocols
    d.pressSoftKey(L(1)); // Cervical
    expect(labels(d).map((l) => l.replace(/\n/g, ' '))).toEqual([
      'Acute Pain', 'Chronic Pain',
      'Increase Local Circulation', 'Relax Muscle Spasm',
      '', '',
      'Chronic Pain', 'Sub-chronic Pain',
      'Scar Tissue / Adhesions', '',
    ]);
  });

  it('IFC manual vector scan adds Vector Position and weights the channels', () => {
    const d = poweredDevice();
    d.pressSoftKey(L(1));
    d.pressSoftKey(L(1)); // Interferential
    d.pressSoftKey(R(5)); // Edit
    d.pressSoftKey(R(1)); // Vector Scan -> Manual
    expect(labels(d)[R(2)]).toBe('Vector Position\n45 deg.');
    d.pressSoftKey(R(1)); // -> Automatic 40%
    expect(labels(d)[R(1)]).toBe('Vector Scan\nAutomatic 40%');
    expect(labels(d)[R(2)]).toBe('');
    d.turnKnob(20); // 10.0 V
    d.pressStart();
    d.tick(3000); // half the scan period: channel 1 at its dip, channel 2 at full
    expect(d.screen().status?.intensities).toEqual(['6.0', '10.0']);
  });
});
