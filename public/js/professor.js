// ============================================================
// PROFESSOR.JS - Professor Oak NPC narrator
// Wanders the town, narrates agent events with speech bubbles
// ============================================================

import { TILE_SIZE, PALETTES, BUILDINGS, SPAWN_POINT, findPath, WALKABLE, MAP } from './world.js';

const NARRATIONS = {
  spawn: [
    (a) => `A wild ${a.type.toUpperCase()} appeared! It's heading to work!`,
    (a) => `Ah! A new agent has arrived! Task: ${a.task?.slice(0,30) || '???'}`,
    (a) => `Welcome, ${a.id}! The ${a.type} lab awaits you!`,
    (a) => `Fascinating! Another ${a.type.toUpperCase()} agent joins the team!`,
  ],
  done: [
    (a) => `Excellent! ${a.id} completed their task!`,
    (a) => `${a.id} reports success! Well done!`,
    (a) => `Another task complete! ${a.id} is heading home!`,
    (a) => `Splendid work by ${a.id}!`,
  ],
  thinking: [
    (a) => `${a.id} seems deep in thought...`,
    (a) => `Hmm, ${a.id} is pondering something...`,
  ],
  idle: [
    () => `The lab is quiet... waiting for new agents.`,
    () => `What a peaceful day in AGENT TOWN!`,
    () => `I wonder what tasks await us next...`,
  ],
};

export class ProfessorNPC {
  constructor() {
    // Position
    this.tileX = SPAWN_POINT.x - 2;
    this.tileY = SPAWN_POINT.y + 1;
    this.px = this.tileX * TILE_SIZE;
    this.py = this.tileY * TILE_SIZE;

    // Movement
    this.path = [];
    this.pathIndex = 0;
    this.moving = false;
    this.dir = 0; // facing down
    this.walkFrame = 0;
    this.walkTimer = 0;
    this.moveSpeed = 1.6;

    // Speech
    this.speechText = '';
    this.speechVisible = false;
    this.speechTimer = 0;
    this.speechQueue = [];
    this.speechDuration = 4;

    // Idle behavior
    this.idleTimer = 0;
    this.wanderTimer = 8 + Math.random() * 10;
  }

  narrate(eventType, agentData) {
    const templates = NARRATIONS[eventType];
    if (!templates) return;
    const template = templates[Math.floor(Math.random() * templates.length)];
    const text = template(agentData || {});
    this.speechQueue.push(text);
  }

  moveTo(tx, ty) {
    const path = findPath(this.tileX, this.tileY, tx, ty);
    if (path.length > 0) {
      this.path = path;
      this.pathIndex = 0;
      this.moving = true;
    }
  }

  moveNearAgent(agentData) {
    // Move near the spawn point to greet the agent
    const tx = SPAWN_POINT.x + (Math.random() > 0.5 ? 1 : -1);
    const ty = SPAWN_POINT.y + 1;
    this.moveTo(tx, ty);
  }

  update(dt) {
    // Movement
    if (this.moving && this.pathIndex < this.path.length) {
      const target = this.path[this.pathIndex];
      const targetPx = target.x * TILE_SIZE;
      const targetPy = target.y * TILE_SIZE;
      const dx = targetPx - this.px;
      const dy = targetPy - this.py;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.moveSpeed) {
        this.px = targetPx;
        this.py = targetPy;
        this.tileX = target.x;
        this.tileY = target.y;
        this.pathIndex++;
        if (this.pathIndex >= this.path.length) {
          this.moving = false;
          this.dir = 0;
        }
      } else {
        this.px += (dx / dist) * this.moveSpeed;
        this.py += (dy / dist) * this.moveSpeed;
        if (Math.abs(dx) > Math.abs(dy)) {
          this.dir = dx > 0 ? 3 : 2;
        } else {
          this.dir = dy > 0 ? 0 : 1;
        }
        this.walkTimer += dt;
        if (this.walkTimer > 0.25) {
          this.walkFrame = (this.walkFrame + 1) % 2;
          this.walkTimer = 0;
        }
      }
    } else {
      this.walkFrame = 0;
    }

    // Speech
    if (this.speechVisible) {
      this.speechTimer -= dt;
      if (this.speechTimer <= 0) {
        this.speechVisible = false;
      }
    }

    if (!this.speechVisible && this.speechQueue.length > 0) {
      this.speechText = this.speechQueue.shift();
      this.speechVisible = true;
      this.speechTimer = this.speechDuration;
    }

    // Idle wandering
    if (!this.moving && this.speechQueue.length === 0) {
      this.idleTimer += dt;
      if (this.idleTimer > this.wanderTimer) {
        this.idleTimer = 0;
        this.wanderTimer = 8 + Math.random() * 15;
        // Wander to a random walkable nearby tile
        const dx = Math.floor(Math.random() * 5) - 2;
        const dy = Math.floor(Math.random() * 5) - 2;
        const nx = this.tileX + dx;
        const ny = this.tileY + dy;
        if (nx > 1 && nx < 22 && ny > 1 && ny < 16 && WALKABLE.has(MAP[ny]?.[nx])) {
          this.moveTo(nx, ny);
        }
        // Occasionally narrate idle
        if (Math.random() > 0.7) {
          this.narrate('idle');
        }
      }
    }
  }

  render(ctx) {
    const X = Math.round(this.px);
    const Y = Math.round(this.py);
    const f = this.walkFrame;

    const p = (color, x, y, w, h) => {
      ctx.fillStyle = color;
      ctx.fillRect(X + x*2, Y + y*2, (w||1)*2, (h||1)*2);
    };

    // Professor sprite - white lab coat, gray hair
    const coat = '#f0f0f0';
    const coatD = '#c8c8c8';
    const hair = '#a0a0a0';
    const hairD = '#808080';
    const skin = '#f8c898';
    const skinD = '#d8a070';
    const eye = '#282828';
    const pants = '#584828';
    const shoes = '#383828';

    // Hair/head
    p(hair, 5, 0, 6, 1);
    p(hair, 4, 1, 8, 3);
    p(hairD, 4, 3, 8, 1);

    if (this.dir === 0 || this.dir === 2 || this.dir === 3) {
      // Face
      p(skin, 5, 4, 6, 4);
      p(skinD, 5, 7, 6, 1);
      // Eyes
      if (this.dir === 0) {
        p(eye, 6, 5, 2, 2);
        p(eye, 10, 5, 2, 2);
        p('#f8f8f8', 6, 5, 1, 1);
        p('#f8f8f8', 10, 5, 1, 1);
      } else if (this.dir === 2) {
        p(eye, 5, 5, 2, 2);
        p('#f8f8f8', 5, 5, 1, 1);
      } else {
        p(eye, 9, 5, 2, 2);
        p('#f8f8f8', 10, 5, 1, 1);
      }
      // Glasses
      p('#c0c0c0', 5, 5, 7, 1);
    } else {
      // Back of head
      p(hairD, 5, 4, 6, 4);
    }

    // Lab coat body
    p(coat, 3, 8, 10, 4);
    p(coatD, 3, 11, 10, 1);
    // Coat sleeves
    if (f === 0) {
      p(coat, 2, 8, 1, 4);
      p(coat, 13, 8, 1, 4);
    } else {
      p(coat, 2, 9, 1, 4);
      p(coat, 13, 7, 1, 4);
    }
    // Hands
    p(skin, 2, 11, 1, 1);
    p(skin, 13, 11, 1, 1);

    // Pants & shoes
    p(pants, 5, 12, 3, 2);
    p(pants, 9, 12, 3, 2);
    if (f === 0) {
      p(shoes, 5, 14, 3, 2);
      p(shoes, 9, 14, 3, 2);
    } else {
      p(shoes, 4, 14, 3, 2);
      p(shoes, 10, 14, 3, 2);
    }

    // Name tag
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText('PROF.OAK', X + 16, Y - 12);
    ctx.fillStyle = '#f8e8a0';
    ctx.fillText('PROF.OAK', X + 14, Y - 14);

    // Speech bubble
    if (this.speechVisible && this.speechText) {
      this.renderSpeech(ctx, X + 16, Y - 24);
    }
  }

  renderSpeech(ctx, cx, cy) {
    const text = this.speechText;
    const maxLineW = 280;
    ctx.font = 'bold 12px monospace';

    // Word wrap
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line + (line ? ' ' : '') + word;
      if (ctx.measureText(test).width > maxLineW && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);

    const lineH = 16;
    const padding = 8;
    const bw = Math.min(maxLineW + padding * 2, 320);
    const bh = lines.length * lineH + padding * 2;
    const bx = cx - bw / 2;
    const by = cy - bh - 16;

    // Fade alpha
    const fade = Math.min(1, this.speechTimer / 0.5);
    ctx.globalAlpha = fade;

    // Bubble
    ctx.fillStyle = '#f8f8e8';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#383028';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#fff';
    ctx.fillRect(bx + 1, by + 1, bw - 2, 2);

    // Pointer
    ctx.fillStyle = '#f8f8e8';
    ctx.fillRect(cx - 4, by + bh, 8, 8);
    ctx.fillStyle = '#383028';
    ctx.fillRect(cx - 6, by + bh, 2, 8);
    ctx.fillRect(cx + 6, by + bh, 2, 8);

    // Text
    ctx.fillStyle = '#282020';
    ctx.textAlign = 'left';
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], bx + padding, by + padding + i * lineH + 4);
    }

    ctx.globalAlpha = 1;
  }
}
