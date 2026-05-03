// ============================================================
// SOUND.JS - Chiptune Web Audio sound engine
// Procedurally generated GBC-style bleeps and bloops
// ============================================================

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.muted = false;
    this.initialized = false;
  }

  // Must be called from a user interaction (click/keypress)
  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
      this.enabled = true;
    } catch (e) {
      console.warn('[sound] Web Audio not available');
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  play(name) {
    if (!this.initialized || !this.enabled || this.muted) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    switch (name) {
      case 'spawn': this.playSpawn(); break;
      case 'done': this.playDone(); break;
      case 'statusChange': this.playStatusChange(); break;
      case 'select': this.playSelect(); break;
      case 'remove': this.playRemove(); break;
      case 'tick': this.playTick(); break;
    }
  }

  // Rising two-tone beep (Pokemon appear sound)
  playSpawn() {
    const t = this.ctx.currentTime;
    this.playTone(523.25, t, 0.08, 'square', 0.12);       // C5
    this.playTone(659.25, t + 0.08, 0.08, 'square', 0.12); // E5
    this.playTone(783.99, t + 0.16, 0.12, 'square', 0.10); // G5
  }

  // Three-note victory jingle
  playDone() {
    const t = this.ctx.currentTime;
    this.playTone(392.00, t, 0.1, 'square', 0.10);         // G4
    this.playTone(493.88, t + 0.1, 0.1, 'square', 0.10);   // B4
    this.playTone(587.33, t + 0.2, 0.15, 'square', 0.12);  // D5
    this.playTone(783.99, t + 0.35, 0.2, 'square', 0.08);  // G5
  }

  // Short notification pip
  playStatusChange() {
    const t = this.ctx.currentTime;
    this.playTone(880, t, 0.05, 'square', 0.08);
    this.playTone(1100, t + 0.05, 0.06, 'square', 0.06);
  }

  // Click/select sound
  playSelect() {
    const t = this.ctx.currentTime;
    this.playTone(1200, t, 0.03, 'square', 0.08);
  }

  // Descending removal sound
  playRemove() {
    const t = this.ctx.currentTime;
    this.playTone(600, t, 0.06, 'square', 0.08);
    this.playTone(400, t + 0.06, 0.06, 'square', 0.08);
    this.playTone(250, t + 0.12, 0.1, 'square', 0.06);
  }

  // Per-character typewriter tick
  playTick() {
    const t = this.ctx.currentTime;
    this.playTone(3800 + Math.random() * 400, t, 0.015, 'square', 0.03);
  }

  // Core tone generator
  playTone(freq, startTime, duration, type, volume) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.005);
    gain.gain.setValueAtTime(volume, startTime + duration * 0.7);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }
}
