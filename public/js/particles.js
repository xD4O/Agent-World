// ============================================================
// PARTICLES.JS - Pixel-art particle effects system
// ============================================================

import { TILE_SIZE, AGENT_COLORS } from './world.js';

class Particle {
  constructor(x, y, vx, vy, color, size, life) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.alive = true;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += 30 * dt; // gravity
    this.life -= dt;
    if (this.life <= 0) this.alive = false;
  }

  render(ctx) {
    if (!this.alive) return;
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(Math.round(this.x), Math.round(this.y), this.size, this.size);
    ctx.globalAlpha = 1;
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  // Spawn burst - expanding ring of bright particles
  spawnBurst(agentData) {
    const colors = AGENT_COLORS[agentData.type] || AGENT_COLORS['default'];
    const cx = (agentData.spawnX || 11) * TILE_SIZE + 16;
    const cy = (agentData.spawnY || 11) * TILE_SIZE + 16;

    const sparkColors = ['#f8f8f8', '#f8f838', colors.hat, '#f8a830'];
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      const speed = 40 + Math.random() * 30;
      const color = sparkColors[i % sparkColors.length];
      this.particles.push(new Particle(
        cx, cy,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 15,
        color, 4, 0.6 + Math.random() * 0.3
      ));
    }

    // Center flash
    for (let i = 0; i < 6; i++) {
      this.particles.push(new Particle(
        cx - 4 + Math.random() * 8,
        cy - 4 + Math.random() * 8,
        (Math.random() - 0.5) * 20,
        -Math.random() * 40,
        '#ffffff', 6, 0.3 + Math.random() * 0.2
      ));
    }
  }

  // Done burst - green sparkles rising
  doneBurst(agent) {
    const cx = agent.px + 16;
    const cy = agent.py + 16;
    const colors = ['#40f040', '#80f880', '#f8f838', '#f8f8f8'];

    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      this.particles.push(new Particle(
        cx, cy,
        Math.cos(angle) * 25 + (Math.random() - 0.5) * 10,
        Math.sin(angle) * 25 - 30,
        colors[i % colors.length], 4, 0.8 + Math.random() * 0.4
      ));
    }

    // Stars
    for (let i = 0; i < 4; i++) {
      this.particles.push(new Particle(
        cx - 12 + Math.random() * 24,
        cy - 8,
        (Math.random() - 0.5) * 15,
        -50 - Math.random() * 30,
        '#f8f838', 6, 1.0
      ));
    }
  }

  // Work flash - brief bright pulse
  workFlash(agent) {
    const cx = agent.px + 16;
    const cy = agent.py + 16;

    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      this.particles.push(new Particle(
        cx, cy,
        Math.cos(angle) * 35,
        Math.sin(angle) * 35,
        i % 2 === 0 ? '#f8f8f8' : agent.colors.hat,
        4, 0.35
      ));
    }
  }

  // Despawn - dissolve effect
  despawnBurst(agent) {
    const cx = agent.px + 16;
    const cy = agent.py + 16;

    for (let i = 0; i < 20; i++) {
      this.particles.push(new Particle(
        cx - 12 + Math.random() * 24,
        cy - 12 + Math.random() * 24,
        (Math.random() - 0.5) * 40,
        -Math.random() * 60,
        i % 3 === 0 ? agent.colors.hat : (i % 3 === 1 ? '#f8f8f8' : '#888888'),
        4, 0.5 + Math.random() * 0.5
      ));
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (!this.particles[i].alive) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx) {
    for (const p of this.particles) {
      p.render(ctx);
    }
  }
}
