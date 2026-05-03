// ============================================================
// MUSIC.JS - Procedural chiptune music engine
// 4-channel GB-style sequencer: bass, lead, arp, drums
// Tempo scales with agent activity
// ============================================================

// Note frequencies
const NOTES = {
  C3:130.81, D3:146.83, E3:164.81, F3:174.61, G3:196.00, A3:220.00, B3:246.94,
  C4:261.63, D4:293.66, E4:329.63, F4:349.23, G4:392.00, A4:440.00, B4:493.88,
  C5:523.25, D5:587.33, E5:659.25, F5:698.46, G5:783.99, A5:880.00, B5:987.77,
  C6:1046.50, R:0, // R = rest
};

// Music patterns (sequences of [note, duration_in_steps])
const PATTERNS = {
  // Calm town theme
  calm_bass: [
    ['C3',4],['E3',4],['G3',4],['E3',4],
    ['F3',4],['A3',4],['G3',4],['E3',4],
    ['C3',4],['G3',4],['E3',4],['C3',4],
    ['D3',4],['F3',4],['G3',4],['G3',4],
  ],
  calm_lead: [
    ['E5',2],['R',2],['G5',2],['E5',2],['C5',4],['R',4],['D5',2],['E5',2],
    ['F5',2],['R',2],['A5',2],['F5',2],['G5',4],['R',4],['E5',2],['D5',2],
    ['C5',2],['E5',2],['G5',4],['E5',2],['D5',2],['C5',4],['R',4],
    ['D5',2],['E5',2],['F5',2],['E5',2],['D5',4],['C5',2],['R',2],
  ],
  calm_arp: [
    ['C4',1],['E4',1],['G4',1],['E4',1],['C4',1],['E4',1],['G4',1],['E4',1],
    ['F4',1],['A4',1],['C5',1],['A4',1],['F4',1],['A4',1],['C5',1],['A4',1],
    ['C4',1],['E4',1],['G4',1],['E4',1],['C4',1],['E4',1],['G4',1],['E4',1],
    ['D4',1],['F4',1],['A4',1],['F4',1],['G4',1],['B4',1],['D5',1],['B4',1],
  ],

  // Active/busy theme (faster, more energetic)
  active_bass: [
    ['C3',2],['C3',2],['E3',2],['G3',2],['A3',2],['A3',2],['G3',2],['E3',2],
    ['F3',2],['F3',2],['A3',2],['C4',2],['G3',2],['G3',2],['B3',2],['D4',2],
  ],
  active_lead: [
    ['G5',1],['E5',1],['G5',1],['A5',1],['G5',2],['E5',2],
    ['F5',1],['D5',1],['F5',1],['G5',1],['A5',2],['G5',2],
    ['E5',1],['C5',1],['E5',1],['G5',1],['A5',1],['G5',1],['E5',1],['C5',1],
    ['D5',1],['E5',1],['F5',1],['E5',1],['D5',2],['C5',2],
  ],

  // Drum patterns (frequency = noise pitch)
  calm_drums: [
    ['C5',1],['R',1],['R',1],['R',1],['A4',1],['R',1],['R',1],['R',1],
    ['C5',1],['R',1],['R',1],['R',1],['A4',1],['R',1],['C5',1],['R',1],
  ],
  active_drums: [
    ['C5',1],['R',1],['A4',1],['R',1],['C5',1],['R',1],['A4',1],['C5',1],
    ['C5',1],['A4',1],['R',1],['A4',1],['C5',1],['R',1],['A4',1],['C5',1],
  ],
};

export class MusicEngine {
  constructor() {
    this.ctx = null;
    this.playing = false;
    this.muted = false;
    this.initialized = false;
    this.volume = 0.06; // Quiet background music
    this.bpm = 140;
    this.stepTime = 60 / this.bpm / 2; // Time per step in seconds
    this.currentStep = 0;
    this.nextStepTime = 0;
    this.intensity = 0; // 0=calm, 1=active
    this.targetIntensity = 0;
    this.masterGain = null;

    // Channel state
    this.channels = {
      bass: { pos: 0, pattern: 'calm_bass', osc: null },
      lead: { pos: 0, pattern: 'calm_lead', osc: null },
      arp:  { pos: 0, pattern: 'calm_arp', osc: null },
      drums:{ pos: 0, pattern: 'calm_drums', osc: null },
    };
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn('[music] Web Audio not available');
    }
  }

  start() {
    if (!this.initialized) this.init();
    if (!this.initialized || this.playing) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.playing = true;
    this.nextStepTime = this.ctx.currentTime + 0.1;
    this.schedule();
  }

  stop() {
    this.playing = false;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
    }
    return this.muted;
  }

  setIntensity(level) {
    this.targetIntensity = Math.max(0, Math.min(1, level));
  }

  schedule() {
    if (!this.playing) return;

    // Lerp intensity
    this.intensity += (this.targetIntensity - this.intensity) * 0.01;

    // Adjust BPM based on intensity
    this.bpm = 120 + this.intensity * 40;
    this.stepTime = 60 / this.bpm / 2;

    while (this.nextStepTime < this.ctx.currentTime + 0.2) {
      this.playStep(this.nextStepTime);
      this.nextStepTime += this.stepTime;
      this.currentStep++;
    }

    requestAnimationFrame(() => this.schedule());
  }

  playStep(time) {
    // Update patterns based on intensity
    if (this.intensity > 0.5) {
      this.channels.bass.pattern = 'active_bass';
      this.channels.lead.pattern = 'active_lead';
      this.channels.drums.pattern = 'active_drums';
    } else {
      this.channels.bass.pattern = 'calm_bass';
      this.channels.lead.pattern = 'calm_lead';
      this.channels.drums.pattern = 'calm_drums';
    }

    this.playChannel('bass', time, 'square', 0.5);
    this.playChannel('lead', time, 'square', 0.35);
    this.playChannel('arp', time, 'triangle', 0.4);
    this.playDrumChannel(time);
  }

  playChannel(name, time, waveType, vol) {
    const ch = this.channels[name];
    const pattern = PATTERNS[ch.pattern];
    if (!pattern) return;

    const entry = pattern[ch.pos % pattern.length];
    const noteName = entry[0];
    const dur = entry[1];
    const freq = NOTES[noteName];

    if (freq > 0) {
      this.playNote(freq, time, this.stepTime * dur * 0.8, waveType, vol * this.volume);
    }

    ch.pos++;
    // Skip ahead for multi-step notes
    if (dur > 1) {
      ch.pos += dur - 1;
    }
  }

  playDrumChannel(time) {
    const ch = this.channels.drums;
    const pattern = PATTERNS[ch.pattern];
    if (!pattern) return;

    const entry = pattern[ch.pos % pattern.length];
    const noteName = entry[0];

    if (noteName !== 'R') {
      const isKick = noteName === 'C5';
      this.playNoise(time, isKick ? 0.04 : 0.02, isKick ? 150 : 800, isKick ? 0.08 : 0.04);
    }

    ch.pos++;
  }

  playNote(freq, startTime, duration, type, vol) {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.005);
    gain.gain.setValueAtTime(vol * 0.7, startTime + duration * 0.5);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }

  playNoise(time, duration, freq, vol) {
    if (!this.ctx || this.muted) return;
    // Use oscillator for drum-like sounds (GBC style)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(1, time + duration);

    gain.gain.setValueAtTime(vol, time);
    gain.gain.linearRampToValueAtTime(0, time + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + duration + 0.01);
  }
}
