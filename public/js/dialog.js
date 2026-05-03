// ============================================================
// DIALOG.JS - Pokemon-style dialog box system
// ============================================================

import { PALETTES, TILE_SIZE, MAP_W, MAP_H } from './world.js';

const CANVAS_W = MAP_W * TILE_SIZE;
const CANVAS_H = MAP_H * TILE_SIZE;
const BOX_H = 112;
const BOX_MARGIN = 8;
const TEXT_PADDING = 16;
const CHAR_DELAY = 30; // ms per character for typewriter effect

export class DialogSystem {
  constructor() {
    this.visible = false;
    this.lines = [];
    this.displayedChars = 0;
    this.totalChars = 0;
    this.lastCharTime = 0;
    this.fullText = '';
    this.header = '';
    this.statusColor = '#282828';
  }

  show(header, text, statusColor) {
    this.header = header;
    this.fullText = text;
    this.totalChars = text.length;
    this.displayedChars = 0;
    this.lastCharTime = Date.now();
    this.visible = true;
    this.statusColor = statusColor || '#282828';
  }

  hide() {
    this.visible = false;
  }

  update() {
    if (!this.visible) return;

    const now = Date.now();
    if (this.displayedChars < this.totalChars) {
      const elapsed = now - this.lastCharTime;
      const charsToAdd = Math.floor(elapsed / CHAR_DELAY);
      if (charsToAdd > 0) {
        this.displayedChars = Math.min(this.totalChars, this.displayedChars + charsToAdd);
        this.lastCharTime = now;
      }
    }
  }

  isComplete() {
    return this.displayedChars >= this.totalChars;
  }

  skipAnimation() {
    this.displayedChars = this.totalChars;
  }

  render(ctx) {
    if (!this.visible) return;

    const x = BOX_MARGIN;
    const y = CANVAS_H - BOX_H - BOX_MARGIN;
    const w = CANVAS_W - BOX_MARGIN * 2;
    const h = BOX_H;

    // Box background
    ctx.fillStyle = '#f8f0d0';
    ctx.fillRect(x, y, w, h);

    // Border (double line - Pokemon style)
    ctx.strokeStyle = '#383028';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.strokeStyle = '#584830';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);

    // Header
    ctx.fillStyle = this.statusColor;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(this.header, x + TEXT_PADDING, y + 12);

    // Separator line
    ctx.fillStyle = '#c8b890';
    ctx.fillRect(x + TEXT_PADDING, y + 36, w - TEXT_PADDING * 2, 2);

    // Text with typewriter effect
    const displayText = this.fullText.slice(0, this.displayedChars);
    ctx.fillStyle = '#282020';
    ctx.font = '14px monospace';

    // Word wrap
    const maxWidth = w - TEXT_PADDING * 2;
    const words = displayText.split(' ');
    let line = '';
    let lineY = y + 48;
    const lineHeight = 20;
    let lineCount = 0;

    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line) {
        ctx.fillText(line, x + TEXT_PADDING, lineY);
        line = word;
        lineY += lineHeight;
        lineCount++;
        if (lineCount >= 4) break; // Max 4 lines
      } else {
        line = testLine;
      }
    }
    if (line && lineCount < 4) {
      ctx.fillText(line, x + TEXT_PADDING, lineY);
    }

    // Blinking cursor if not complete
    if (!this.isComplete() && ((Date.now() / 300) | 0) % 2 === 0) {
      const cursorX = x + TEXT_PADDING + ctx.measureText(line).width + 4;
      ctx.fillStyle = '#282020';
      ctx.fillRect(cursorX, lineY, 6, 10);
    }

    // Arrow indicator when complete
    if (this.isComplete()) {
      const arrowX = x + w - 24;
      const arrowY = y + h - 20 + (((Date.now() / 300) | 0) % 2) * 2;
      ctx.fillStyle = '#383028';
      ctx.fillRect(arrowX, arrowY, 10, 2);
      ctx.fillRect(arrowX + 2, arrowY + 2, 6, 2);
      ctx.fillRect(arrowX + 4, arrowY + 4, 2, 2);
    }
  }
}

// Thought bubble that floats above an agent
export class ThoughtBubble {
  constructor() {
    this.visible = false;
    this.text = '';
    this.x = 0;
    this.y = 0;
    this.alpha = 1;
    this.timer = 0;
    this.duration = 4; // seconds
  }

  show(text, x, y) {
    this.text = text.length > 50 ? text.slice(0, 47) + '...' : text;
    this.x = x;
    this.y = y;
    this.visible = true;
    this.alpha = 1;
    this.timer = 0;
  }

  update(dt, x, y) {
    if (!this.visible) return;
    this.x = x;
    this.y = y;
    this.timer += dt;
    if (this.timer > this.duration - 1) {
      this.alpha = Math.max(0, 1 - (this.timer - (this.duration - 1)));
    }
    if (this.timer >= this.duration) {
      this.visible = false;
    }
  }

  render(ctx) {
    if (!this.visible || this.alpha <= 0) return;

    ctx.font = 'bold 14px monospace';
    const textWidth = ctx.measureText(this.text).width;
    const bw = textWidth + 24;
    const bh = 32;
    const bx = this.x - bw / 2;
    const by = this.y - 60;

    ctx.globalAlpha = this.alpha;

    // Bubble shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(bx + 4, by + 4, bw, bh);

    // Bubble background
    ctx.fillStyle = '#f8f8f0';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#383028';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);
    // Inner highlight
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bx + 1, by + 1, bw - 2, 2);

    // Pointer triangle
    ctx.fillStyle = '#f8f8f0';
    ctx.fillRect(this.x - 4, by + bh, 8, 6);
    ctx.fillRect(this.x - 2, by + bh + 6, 4, 4);
    ctx.fillStyle = '#383028';
    ctx.fillRect(this.x - 6, by + bh, 2, 6);
    ctx.fillRect(this.x + 6, by + bh, 2, 6);
    ctx.fillRect(this.x - 4, by + bh + 6, 2, 4);
    ctx.fillRect(this.x + 4, by + bh + 6, 2, 4);

    // Text
    ctx.fillStyle = '#181818';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x, by + 10);

    ctx.globalAlpha = 1;
  }
}
