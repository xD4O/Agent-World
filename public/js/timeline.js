// ============================================================
// TIMELINE.JS - Event recorder and replay system
// Records all agent events, provides scrubber UI for playback
// ============================================================

export class Timeline {
  constructor() {
    this.events = [];
    this.recording = true;
    this.visible = false;
    this.startTime = Date.now();

    // Replay state
    this.replaying = false;
    this.replayPos = 0; // 0-1 normalized position
    this.replaySpeed = 1;
  }

  record(type, data) {
    if (!this.recording) return;
    this.events.push({
      type,
      data: JSON.parse(JSON.stringify(data)),
      time: Date.now() - this.startTime,
    });
  }

  toggle() {
    this.visible = !this.visible;
    return this.visible;
  }

  getDuration() {
    if (this.events.length === 0) return 0;
    return this.events[this.events.length - 1].time;
  }

  getEventCount() {
    return this.events.length;
  }

  // Get events in a time range (for scrubbing)
  getEventsInRange(startMs, endMs) {
    return this.events.filter(e => e.time >= startMs && e.time <= endMs);
  }

  setPosition(normalized) {
    this.replayPos = Math.max(0, Math.min(1, normalized));
  }

  render(ctx, w, h) {
    if (!this.visible) return;

    const barH = 80;
    const barY = h - barH;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, barY, w, barH);

    // Title
    ctx.fillStyle = '#f0a040';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('TIMELINE', 12, barY + 16);

    const dur = this.getDuration();
    const durStr = dur > 0 ? `${(dur / 1000).toFixed(0)}s` : '0s';
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.fillText(`${this.events.length} events / ${durStr}`, 100, barY + 16);

    // Scrubber track
    const trackX = 12;
    const trackY = barY + 28;
    const trackW = w - 24;
    const trackH = 20;

    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(trackX, trackY, trackW, trackH);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.strokeRect(trackX, trackY, trackW, trackH);

    // Event markers on track
    if (dur > 0) {
      for (const event of this.events) {
        const x = trackX + (event.time / dur) * trackW;
        let color = '#666';
        if (event.type === 'spawn') color = '#40f040';
        else if (event.type === 'done') color = '#40c0f0';
        else if (event.type === 'remove') color = '#f04040';
        else if (event.type === 'update') color = '#f0a040';
        else if (event.type === 'thought') color = '#c040f0';

        ctx.fillStyle = color;
        ctx.fillRect(x, trackY + 2, 4, trackH - 4);
      }
    }

    // Playhead
    const playheadX = trackX + this.replayPos * trackW;
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(playheadX - 2, trackY - 4, 6, trackH + 8);

    // Legend
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    const legendY = barY + 60;
    const items = [
      ['SPAWN', '#40f040'], ['DONE', '#40c0f0'],
      ['REMOVE', '#f04040'], ['UPDATE', '#f0a040'],
      ['THOUGHT', '#c040f0']
    ];
    let lx = 12;
    for (const [label, color] of items) {
      ctx.fillStyle = color;
      ctx.fillRect(lx, legendY, 8, 8);
      ctx.fillStyle = '#888';
      ctx.fillText(label, lx + 12, legendY + 2);
      lx += 80;
    }

    // Controls hint
    ctx.fillStyle = '#555';
    ctx.textAlign = 'right';
    ctx.fillText('[T] Close  [</>] Scrub', w - 12, legendY + 2);
  }

  handleClick(x, y, w, h) {
    if (!this.visible) return false;
    const barH = 80;
    const barY = h - barH;
    const trackX = 12;
    const trackY = barY + 28;
    const trackW = w - 24;
    const trackH = 20;

    if (y >= trackY && y <= trackY + trackH && x >= trackX && x <= trackX + trackW) {
      this.replayPos = (x - trackX) / trackW;
      return true;
    }
    return false;
  }
}
