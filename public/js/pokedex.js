// ============================================================
// POKEDEX.JS - Agent type registry and stats tracker
// Pokemon-style Pokedex UI for all agent types encountered
// ============================================================

import { AGENT_COLORS, PALETTES } from './world.js';

const AGENT_TYPE_INFO = {
  'general-purpose': {
    name: 'CODER', num: '001',
    desc: 'A versatile agent that can write code, fix bugs, and implement features.',
    habitat: 'CODE LAB',
  },
  'Explore': {
    name: 'EXPLORER', num: '002',
    desc: 'Searches through codebases with unmatched speed and thoroughness.',
    habitat: 'LIBRARY',
  },
  'Plan': {
    name: 'PLANNER', num: '003',
    desc: 'Designs architectures and implementation strategies with precision.',
    habitat: "PROF'S LAB",
  },
  'test-runner': {
    name: 'TESTER', num: '004',
    desc: 'Battles bugs relentlessly, running test suites until victory.',
    habitat: 'BATTLE ARENA',
  },
  'claude-code-guide': {
    name: 'GUIDE', num: '005',
    desc: 'A knowledgeable agent that researches docs and answers questions.',
    habitat: 'CODE LAB',
  },
};

export class Pokedex {
  constructor() {
    this.entries = new Map(); // type -> { seen, spawned, completed, totalTime }
    this.visible = false;
    this.selectedIndex = 0;
    this.scrollOffset = 0;
    this.load();
  }

  load() {
    try {
      const saved = localStorage.getItem('agent-world-pokedex');
      if (saved) {
        const data = JSON.parse(saved);
        for (const [type, stats] of Object.entries(data)) {
          this.entries.set(type, stats);
        }
      }
    } catch (e) { /* ignore */ }
  }

  save() {
    try {
      const data = {};
      for (const [type, stats] of this.entries) {
        data[type] = stats;
      }
      localStorage.setItem('agent-world-pokedex', JSON.stringify(data));
    } catch (e) { /* ignore */ }
  }

  onAgentSeen(type) {
    if (!this.entries.has(type)) {
      this.entries.set(type, { seen: 0, spawned: 0, completed: 0, totalTime: 0 });
    }
    const e = this.entries.get(type);
    e.seen++;
    e.spawned++;
    this.save();
  }

  onAgentCompleted(type, elapsed) {
    const e = this.entries.get(type);
    if (e) {
      e.completed++;
      e.totalTime += elapsed;
      this.save();
    }
  }

  toggle() {
    this.visible = !this.visible;
    return this.visible;
  }

  navigate(dir) {
    if (!this.visible) return;
    const types = this.getAllTypes();
    this.selectedIndex = Math.max(0, Math.min(types.length - 1, this.selectedIndex + dir));
  }

  getAllTypes() {
    return Object.keys(AGENT_TYPE_INFO);
  }

  render(ctx, w, h) {
    if (!this.visible) return;

    // Full screen overlay
    ctx.fillStyle = '#c82020';
    ctx.fillRect(0, 0, w, h);

    // Inner screen
    const margin = 16;
    ctx.fillStyle = '#f8f0d0';
    ctx.fillRect(margin, margin, w - margin * 2, h - margin * 2);
    ctx.strokeStyle = '#282020';
    ctx.lineWidth = 2;
    ctx.strokeRect(margin + 2, margin + 2, w - margin * 2 - 4, h - margin * 2 - 4);

    // Title
    ctx.fillStyle = '#c82020';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('AGENT DEX', w / 2, margin + 24);

    const types = this.getAllTypes();
    const listX = margin + 12;
    const listY = margin + 40;
    const entryH = 32;
    const listW = 180;

    // Entry list (left side)
    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const info = AGENT_TYPE_INFO[type];
      const entry = this.entries.get(type);
      const y = listY + i * entryH;
      const seen = entry && entry.seen > 0;

      // Selection highlight
      if (i === this.selectedIndex) {
        ctx.fillStyle = '#e8d8a0';
        ctx.fillRect(listX, y, listW, entryH - 2);
        // Arrow
        ctx.fillStyle = '#282020';
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('>', listX + 4, y + 10);
      }

      // Number and name
      ctx.fillStyle = seen ? '#282020' : '#a0a0a0';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`#${info.num}`, listX + 16, y + 8);
      ctx.fillText(seen ? info.name : '???', listX + 52, y + 8);

      // Mini seen/caught indicator
      if (seen) {
        ctx.fillStyle = '#c82020';
        ctx.fillRect(listX + listW - 16, y + 6, 8, 8);
      }
    }

    // Detail panel (right side)
    const detailX = listX + listW + 16;
    const detailY = listY;
    const detailW = w - detailX - margin - 12;

    ctx.strokeStyle = '#282020';
    ctx.lineWidth = 1;
    ctx.strokeRect(detailX - 4, detailY - 4, detailW + 8, h - margin * 2 - 44);

    const selectedType = types[this.selectedIndex];
    const info = AGENT_TYPE_INFO[selectedType];
    const entry = this.entries.get(selectedType);
    const colors = AGENT_COLORS[selectedType] || AGENT_COLORS['default'];
    const seen = entry && entry.seen > 0;

    if (seen) {
      // Sprite preview (large)
      this.drawLargeSprite(ctx, detailX + detailW / 2 - 32, detailY + 8, colors);

      // Info
      ctx.fillStyle = '#282020';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`#${info.num} ${info.name}`, detailX + detailW / 2, detailY + 92);

      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      const ix = detailX + 8;
      ctx.fillText(`SEEN:  ${entry.seen}`, ix, detailY + 116);
      ctx.fillText(`DONE:  ${entry.completed}`, ix, detailY + 136);

      const avgTime = entry.completed > 0 ? Math.round(entry.totalTime / entry.completed / 1000) : 0;
      ctx.fillText(`AVG:   ${avgTime}s`, ix, detailY + 156);
      ctx.fillText(`AREA:  ${info.habitat}`, ix, detailY + 176);

      // Description
      ctx.fillStyle = '#505050';
      ctx.font = '8px monospace';
      // Word wrap description
      const words = info.desc.split(' ');
      let line = '';
      let ly = detailY + 204;
      for (const word of words) {
        const test = line + (line ? ' ' : '') + word;
        if (ctx.measureText(test).width > detailW - 16 && line) {
          ctx.fillText(line, ix, ly);
          line = word;
          ly += 14;
        } else {
          line = test;
        }
      }
      if (line) ctx.fillText(line, ix, ly);
    } else {
      ctx.fillStyle = '#a0a0a0';
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('???', detailX + detailW / 2, detailY + 80);
      ctx.font = '10px monospace';
      ctx.fillText('Not yet seen', detailX + detailW / 2, detailY + 110);
    }

    // Footer
    ctx.fillStyle = '#808080';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[UP/DN] Navigate  [P] Close', w / 2, h - margin - 8);
  }

  drawLargeSprite(ctx, x, y, colors) {
    const s = 4;
    const p = (c, px, py, pw, ph) => {
      ctx.fillStyle = c;
      ctx.fillRect(x + px * s, y + py * s, (pw || 1) * s, (ph || 1) * s);
    };

    p(colors.hat, 5, 0, 6, 1);
    p(colors.hat, 4, 1, 8, 3);
    p(colors.hatD, 4, 3, 8, 1);
    p(PALETTES.agentSkin, 5, 4, 6, 4);
    p(PALETTES.agentSkinS, 5, 7, 6, 1);
    p(PALETTES.agentEye, 6, 5, 2, 2);
    p(PALETTES.agentEye, 10, 5, 2, 2);
    p('#f8f8f8', 6, 5, 1, 1);
    p('#f8f8f8', 10, 5, 1, 1);
    p(colors.shirt, 4, 8, 8, 4);
    p(colors.shirtD, 4, 11, 8, 1);
    p(PALETTES.agentSkin, 3, 8, 1, 3);
    p(PALETTES.agentSkin, 12, 8, 1, 3);
    p(colors.pants, 5, 12, 3, 2);
    p(colors.pants, 9, 12, 3, 2);
    p(colors.shoes, 5, 14, 3, 2);
    p(colors.shoes, 9, 14, 3, 2);
  }
}
