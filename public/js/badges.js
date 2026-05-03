// ============================================================
// BADGES.JS - Gym badge achievement system
// 8 pixel-art badges earned for milestones, persisted to localStorage
// ============================================================

const BADGE_DEFS = [
  {
    id: 'boulder', name: 'BOULDER BADGE', desc: 'First agent spawned',
    colors: ['#a0a0a0', '#c0c0c0', '#808080'],
    check: (s) => s.totalSpawned >= 1,
  },
  {
    id: 'cascade', name: 'CASCADE BADGE', desc: '10 tasks completed',
    colors: ['#4080d0', '#60a0f0', '#2860a0'],
    check: (s) => s.totalCompleted >= 10,
  },
  {
    id: 'thunder', name: 'THUNDER BADGE', desc: '5 agents at once',
    colors: ['#f0d020', '#f8e840', '#c0a010'],
    check: (s) => s.maxConcurrent >= 5,
  },
  {
    id: 'rainbow', name: 'RAINBOW BADGE', desc: 'Used all agent types',
    colors: ['#40c040', '#80e080', '#209020'],
    check: (s) => s.typesUsed.size >= 5,
  },
  {
    id: 'soul', name: 'SOUL BADGE', desc: 'Task done in under 10s',
    colors: ['#d040d0', '#f080f0', '#a020a0'],
    check: (s) => s.fastestTask < 10000,
  },
  {
    id: 'marsh', name: 'MARSH BADGE', desc: '50 tasks completed',
    colors: ['#d08040', '#f0a060', '#a06020'],
    check: (s) => s.totalCompleted >= 50,
  },
  {
    id: 'volcano', name: 'VOLCANO BADGE', desc: 'Agent with errors recovered',
    colors: ['#e03020', '#f05040', '#b02010'],
    check: (s) => s.errorsRecovered >= 1,
  },
  {
    id: 'earth', name: 'EARTH BADGE', desc: '100 tasks completed',
    colors: ['#50b050', '#70d070', '#308030'],
    check: (s) => s.totalCompleted >= 100,
  },
];

export class BadgeSystem {
  constructor() {
    this.earned = new Set();
    this.stats = {
      totalSpawned: 0,
      totalCompleted: 0,
      maxConcurrent: 0,
      typesUsed: new Set(),
      fastestTask: Infinity,
      errorsRecovered: 0,
      currentAgents: 0,
    };
    this.pendingPopup = null;
    this.popupTimer = 0;
    this.showingBadgeScreen = false;

    this.load();
  }

  load() {
    try {
      const saved = localStorage.getItem('agent-world-badges');
      if (saved) {
        const data = JSON.parse(saved);
        this.earned = new Set(data.earned || []);
        if (data.stats) {
          this.stats.totalSpawned = data.stats.totalSpawned || 0;
          this.stats.totalCompleted = data.stats.totalCompleted || 0;
          this.stats.maxConcurrent = data.stats.maxConcurrent || 0;
          this.stats.typesUsed = new Set(data.stats.typesUsed || []);
          this.stats.fastestTask = data.stats.fastestTask || Infinity;
          this.stats.errorsRecovered = data.stats.errorsRecovered || 0;
        }
      }
    } catch (e) { /* ignore */ }
  }

  save() {
    try {
      localStorage.setItem('agent-world-badges', JSON.stringify({
        earned: [...this.earned],
        stats: {
          ...this.stats,
          typesUsed: [...this.stats.typesUsed],
        },
      }));
    } catch (e) { /* ignore */ }
  }

  onAgentSpawn(agent) {
    this.stats.totalSpawned++;
    this.stats.currentAgents++;
    this.stats.typesUsed.add(agent.type);
    this.stats.maxConcurrent = Math.max(this.stats.maxConcurrent, this.stats.currentAgents);
    this.checkBadges();
  }

  onAgentDone(agent) {
    this.stats.totalCompleted++;
    this.stats.currentAgents = Math.max(0, this.stats.currentAgents - 1);
    const elapsed = Date.now() - agent.createdAt;
    if (elapsed < this.stats.fastestTask) {
      this.stats.fastestTask = elapsed;
    }
    this.checkBadges();
  }

  onAgentRemove() {
    this.stats.currentAgents = Math.max(0, this.stats.currentAgents - 1);
  }

  onErrorRecovered() {
    this.stats.errorsRecovered++;
    this.checkBadges();
  }

  checkBadges() {
    for (const badge of BADGE_DEFS) {
      if (!this.earned.has(badge.id) && badge.check(this.stats)) {
        this.earned.add(badge.id);
        this.pendingPopup = badge;
        this.popupTimer = 4; // 4 second popup
        this.save();
      }
    }
  }

  toggleBadgeScreen() {
    this.showingBadgeScreen = !this.showingBadgeScreen;
    return this.showingBadgeScreen;
  }

  update(dt) {
    if (this.popupTimer > 0) {
      this.popupTimer -= dt;
      if (this.popupTimer <= 0) {
        this.pendingPopup = null;
      }
    }
  }

  // Render badge popup notification
  renderPopup(ctx, w, h) {
    if (!this.pendingPopup || this.popupTimer <= 0) return;

    const badge = this.pendingPopup;
    const fadeIn = Math.min(1, (4 - this.popupTimer) / 0.3);
    const fadeOut = Math.min(1, this.popupTimer / 0.5);
    const alpha = Math.min(fadeIn, fadeOut);

    ctx.globalAlpha = alpha;

    // Popup box at top center
    const bw = 320;
    const bh = 60;
    const bx = (w - bw) / 2;
    const by = 24;

    ctx.fillStyle = '#282020';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#f8d830';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx + 2, by + 2, bw - 4, bh - 4);

    // Badge icon
    this.drawBadgeIcon(ctx, bx + 12, by + 10, badge.colors, 40);

    // Text
    ctx.fillStyle = '#f8d830';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('BADGE EARNED!', bx + 64, by + 16);
    ctx.fillStyle = '#f8f8f8';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(badge.name, bx + 64, by + 36);

    ctx.globalAlpha = 1;
  }

  // Full badge screen overlay
  renderBadgeScreen(ctx, w, h) {
    if (!this.showingBadgeScreen) return;

    // Dark overlay
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.fillStyle = '#f8d830';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GYM BADGES', w / 2, 40);

    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.fillText(`${this.earned.size}/${BADGE_DEFS.length} collected`, w / 2, 64);

    // Badge grid (4x2)
    const cols = 4;
    const cellW = 160;
    const cellH = 110;
    const startX = (w - cols * cellW) / 2;
    const startY = 84;

    for (let i = 0; i < BADGE_DEFS.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * cellW;
      const y = startY + row * cellH;
      const badge = BADGE_DEFS[i];
      const earned = this.earned.has(badge.id);

      // Badge slot
      ctx.fillStyle = earned ? '#2a2a3a' : '#1a1a22';
      ctx.fillRect(x + 4, y + 4, cellW - 8, cellH - 8);
      ctx.strokeStyle = earned ? '#f8d830' : '#333';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 4, y + 4, cellW - 8, cellH - 8);

      if (earned) {
        // Draw badge
        this.drawBadgeIcon(ctx, x + (cellW - 48) / 2, y + 12, badge.colors, 48);
        ctx.fillStyle = '#f8f8f8';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(badge.name, x + cellW / 2, y + 68);
        ctx.fillStyle = '#888';
        ctx.font = '8px monospace';
        ctx.fillText(badge.desc, x + cellW / 2, y + 84);
      } else {
        // Silhouette
        ctx.fillStyle = '#333';
        ctx.fillRect(x + (cellW - 48) / 2, y + 12, 48, 48);
        ctx.fillStyle = '#555';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('???', x + cellW / 2, y + 40);
        ctx.fillStyle = '#555';
        ctx.font = '8px monospace';
        ctx.fillText(badge.desc, x + cellW / 2, y + 84);
      }
    }

    // Footer
    ctx.fillStyle = '#666';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Press [B] to close', w / 2, h - 24);
  }

  drawBadgeIcon(ctx, x, y, colors, size) {
    const s = size / 24;
    // Shield/badge shape
    ctx.fillStyle = colors[0];
    ctx.fillRect(x + 4 * s, y, 16 * s, 4 * s);
    ctx.fillRect(x + 2 * s, y + 4 * s, 20 * s, 12 * s);
    ctx.fillRect(x + 4 * s, y + 16 * s, 16 * s, 4 * s);
    ctx.fillRect(x + 8 * s, y + 20 * s, 8 * s, 4 * s);
    // Inner shine
    ctx.fillStyle = colors[1];
    ctx.fillRect(x + 6 * s, y + 2 * s, 8 * s, 6 * s);
    // Dark accent
    ctx.fillStyle = colors[2];
    ctx.fillRect(x + 6 * s, y + 14 * s, 12 * s, 4 * s);
    // Star center
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(x + 10 * s, y + 8 * s, 4 * s, 4 * s);
  }
}
