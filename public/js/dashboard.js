// ============================================================
// DASHBOARD.JS - Real-time stats overlay with sparklines
// ============================================================

export class Dashboard {
  constructor() {
    this.visible = false;
    this.stats = {
      activeAgents: 0,
      totalSpawned: 0,
      totalCompleted: 0,
      totalRemoved: 0,
      avgCompletionTime: 0,
      completionTimes: [],
      activityLog: [], // timestamps of events, for sparkline
      agentsOverTime: [], // {time, count} snapshots
    };
    this.snapshotTimer = 0;
  }

  toggle() {
    this.visible = !this.visible;
    return this.visible;
  }

  onSpawn() {
    this.stats.activeAgents++;
    this.stats.totalSpawned++;
    this.stats.activityLog.push(Date.now());
  }

  onComplete(elapsed) {
    this.stats.totalCompleted++;
    this.stats.completionTimes.push(elapsed);
    if (this.stats.completionTimes.length > 50) {
      this.stats.completionTimes.shift();
    }
    this.stats.avgCompletionTime = this.stats.completionTimes.reduce((a, b) => a + b, 0)
      / this.stats.completionTimes.length;
    this.stats.activityLog.push(Date.now());
  }

  onRemove() {
    this.stats.activeAgents = Math.max(0, this.stats.activeAgents - 1);
    this.stats.totalRemoved++;
  }

  update(dt, currentAgentCount) {
    this.stats.activeAgents = currentAgentCount;

    // Take snapshots for sparkline
    this.snapshotTimer += dt;
    if (this.snapshotTimer > 2) {
      this.snapshotTimer = 0;
      this.stats.agentsOverTime.push({ time: Date.now(), count: currentAgentCount });
      if (this.stats.agentsOverTime.length > 60) {
        this.stats.agentsOverTime.shift();
      }
    }

    // Clean old activity log entries (keep last 5 minutes)
    const cutoff = Date.now() - 300000;
    while (this.stats.activityLog.length > 0 && this.stats.activityLog[0] < cutoff) {
      this.stats.activityLog.shift();
    }
  }

  render(ctx, w, h) {
    if (!this.visible) return;

    // Translucent overlay
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.fillStyle = '#40f0f0';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DASHBOARD', w / 2, 32);

    const lx = 40;
    const rx = w / 2 + 20;
    let y = 60;

    // Left column - counters
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px monospace';

    const stat = (label, value, color, x, sy) => {
      ctx.fillStyle = '#888';
      ctx.fillText(label, x, sy);
      ctx.fillStyle = color;
      ctx.fillText(String(value), x + 160, sy);
    };

    stat('ACTIVE:', this.stats.activeAgents, '#40f040', lx, y);
    stat('SPAWNED:', this.stats.totalSpawned, '#f0f040', lx, y + 24);
    stat('COMPLETED:', this.stats.totalCompleted, '#40c0f0', lx, y + 48);
    stat('REMOVED:', this.stats.totalRemoved, '#f04040', lx, y + 72);
    stat('AVG TIME:', `${(this.stats.avgCompletionTime / 1000).toFixed(1)}s`, '#f0a040', lx, y + 96);

    // Events/min
    const recentEvents = this.stats.activityLog.filter(t => t > Date.now() - 60000).length;
    stat('EVENTS/MIN:', recentEvents, '#c040f0', lx, y + 120);

    // Right column - sparkline
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.fillText('AGENTS OVER TIME', rx, y);

    const sparkX = rx;
    const sparkY = y + 16;
    const sparkW = w / 2 - 60;
    const sparkH = 80;

    // Sparkline background
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(sparkX, sparkY, sparkW, sparkH);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(sparkX, sparkY, sparkW, sparkH);

    // Grid lines
    ctx.strokeStyle = '#252535';
    for (let i = 1; i < 4; i++) {
      const gy = sparkY + (sparkH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(sparkX, gy);
      ctx.lineTo(sparkX + sparkW, gy);
      ctx.stroke();
    }

    // Draw sparkline
    const data = this.stats.agentsOverTime;
    if (data.length > 1) {
      const maxCount = Math.max(1, ...data.map(d => d.count));
      ctx.strokeStyle = '#40f0f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < data.length; i++) {
        const px = sparkX + (i / (data.length - 1)) * sparkW;
        const py = sparkY + sparkH - (data[i].count / maxCount) * (sparkH - 8) - 4;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Fill under
      ctx.lineTo(sparkX + sparkW, sparkY + sparkH);
      ctx.lineTo(sparkX, sparkY + sparkH);
      ctx.closePath();
      ctx.fillStyle = 'rgba(64,240,240,0.1)';
      ctx.fill();
    }

    // Activity sparkline
    ctx.fillStyle = '#888';
    ctx.fillText('ACTIVITY (5 MIN)', rx, sparkY + sparkH + 20);

    const actY = sparkY + sparkH + 36;
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(sparkX, actY, sparkW, 60);
    ctx.strokeStyle = '#333';
    ctx.strokeRect(sparkX, actY, sparkW, 60);

    // Activity bars (bucket by 10-second intervals)
    const now = Date.now();
    const buckets = new Array(30).fill(0);
    for (const t of this.stats.activityLog) {
      const age = (now - t) / 1000;
      const bucket = Math.floor(age / 10);
      if (bucket >= 0 && bucket < 30) buckets[29 - bucket]++;
    }
    const maxBucket = Math.max(1, ...buckets);
    const barW = sparkW / 30;
    for (let i = 0; i < 30; i++) {
      const barH = (buckets[i] / maxBucket) * 52;
      ctx.fillStyle = buckets[i] > 0 ? '#40c080' : 'transparent';
      ctx.fillRect(sparkX + i * barW + 1, actY + 56 - barH, barW - 1, barH);
    }

    // Footer
    ctx.fillStyle = '#555';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Press [F] to close', w / 2, h - 16);
  }
}
