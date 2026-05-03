// ============================================================
// WEATHER.JS - Weather particle effects system
// Tied to agent activity: sunny=normal, rain=error, storm=failures,
// snow=idle, cherry blossoms=big completion
// ============================================================

const WEATHER_TYPES = {
  CLEAR: 'clear',
  RAIN: 'rain',
  STORM: 'storm',
  SNOW: 'snow',
  CHERRY: 'cherry',
  SUN: 'sun',
};

class WeatherParticle {
  constructor(x, y, vx, vy, color, size, type) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.color = color;
    this.size = size;
    this.type = type;
    this.life = 1;
    this.wobble = Math.random() * Math.PI * 2;
  }
}

export class WeatherSystem {
  constructor(canvasW, canvasH) {
    this.w = canvasW;
    this.h = canvasH;
    this.particles = [];
    this.type = WEATHER_TYPES.CLEAR;
    this.intensity = 0; // 0-1
    this.targetType = WEATHER_TYPES.CLEAR;
    this.transitionTimer = 0;
    this.thunderFlash = 0;
    this.thunderTimer = 0;
    this.spawnTimer = 0;
  }

  setWeather(type, intensity) {
    this.targetType = type;
    this.intensity = Math.max(0, Math.min(1, intensity || 0.5));
    if (this.type !== type) {
      this.transitionTimer = 2; // 2 second transition
      this.type = type;
    }
  }

  // Auto-set weather based on activity
  updateFromActivity(activeAgents, errorCount, idleTime, justCompleted) {
    if (justCompleted) {
      this.setWeather(WEATHER_TYPES.CHERRY, 0.8);
      setTimeout(() => this.setWeather(WEATHER_TYPES.CLEAR, 0), 5000);
    } else if (errorCount > 2) {
      this.setWeather(WEATHER_TYPES.STORM, 0.9);
    } else if (errorCount > 0) {
      this.setWeather(WEATHER_TYPES.RAIN, 0.6);
    } else if (idleTime > 30) {
      this.setWeather(WEATHER_TYPES.SNOW, 0.4);
    } else if (activeAgents > 3) {
      this.setWeather(WEATHER_TYPES.SUN, 0.5);
    } else {
      this.setWeather(WEATHER_TYPES.CLEAR, 0);
    }
  }

  update(dt) {
    this.spawnTimer += dt;
    this.transitionTimer = Math.max(0, this.transitionTimer - dt);

    // Spawn new particles
    const spawnRate = this.type === WEATHER_TYPES.STORM ? 0.005 :
                      this.type === WEATHER_TYPES.RAIN ? 0.015 :
                      this.type === WEATHER_TYPES.SNOW ? 0.04 :
                      this.type === WEATHER_TYPES.CHERRY ? 0.05 : 0.1;

    if (this.type !== WEATHER_TYPES.CLEAR && this.spawnTimer > spawnRate) {
      this.spawnTimer = 0;
      this.spawnParticle();
    }

    // Thunder
    if (this.type === WEATHER_TYPES.STORM) {
      this.thunderTimer -= dt;
      if (this.thunderTimer <= 0) {
        this.thunderFlash = 0.6;
        this.thunderTimer = 3 + Math.random() * 5;
      }
      this.thunderFlash = Math.max(0, this.thunderFlash - dt * 3);
    } else {
      this.thunderFlash = 0;
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.wobble += dt * 3;
      p.life -= dt * 0.3;

      if (p.type === 'cherry' || p.type === 'snow') {
        p.x += Math.sin(p.wobble) * 0.5;
      }

      if (p.y > this.h + 5 || p.x < -5 || p.x > this.w + 5 || p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Limit particles
    if (this.particles.length > 200) {
      this.particles.splice(0, this.particles.length - 200);
    }
  }

  spawnParticle() {
    const x = Math.random() * (this.w + 40) - 20;

    switch (this.type) {
      case WEATHER_TYPES.RAIN:
      case WEATHER_TYPES.STORM: {
        const speed = this.type === WEATHER_TYPES.STORM ? 250 : 180;
        this.particles.push(new WeatherParticle(
          x, -5,
          this.type === WEATHER_TYPES.STORM ? -30 : -10,
          speed + Math.random() * 50,
          this.type === WEATHER_TYPES.STORM ? '#8090c0' : '#90a8d0',
          1, 'rain'
        ));
        break;
      }
      case WEATHER_TYPES.SNOW:
        this.particles.push(new WeatherParticle(
          x, -5,
          (Math.random() - 0.5) * 10,
          20 + Math.random() * 15,
          Math.random() > 0.5 ? '#f0f0f8' : '#d8d8e8',
          Math.random() > 0.7 ? 3 : 2, 'snow'
        ));
        break;
      case WEATHER_TYPES.CHERRY:
        this.particles.push(new WeatherParticle(
          x, -5,
          10 + Math.random() * 15,
          15 + Math.random() * 20,
          Math.random() > 0.5 ? '#f8a0b0' : '#f0c0c8',
          Math.random() > 0.5 ? 3 : 2, 'cherry'
        ));
        break;
      case WEATHER_TYPES.SUN:
        if (Math.random() > 0.7) {
          this.particles.push(new WeatherParticle(
            x, -5,
            5, 30 + Math.random() * 10,
            '#f8f0a0', 1, 'sun'
          ));
        }
        break;
    }
  }

  render(ctx) {
    if (this.type === WEATHER_TYPES.CLEAR && this.particles.length === 0) return;

    // Thunder flash
    if (this.thunderFlash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.thunderFlash})`;
      ctx.fillRect(0, 0, this.w, this.h);
    }

    // Draw particles
    for (const p of this.particles) {
      const alpha = Math.min(1, p.life);
      ctx.globalAlpha = alpha * this.intensity;

      if (p.type === 'rain') {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 8);
      } else if (p.type === 'snow') {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size * 2, p.size * 2);
      } else if (p.type === 'cherry') {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size * 2, p.size * 2);
        if (p.size > 2) {
          ctx.fillStyle = '#f88098';
          ctx.fillRect(Math.round(p.x) + 2, Math.round(p.y), 2, 2);
        }
      } else if (p.type === 'sun') {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 4);
      }
    }

    ctx.globalAlpha = 1;

    // Storm dark overlay
    if (this.type === WEATHER_TYPES.STORM) {
      ctx.fillStyle = `rgba(20,20,40,${0.15 * this.intensity})`;
      ctx.fillRect(0, 0, this.w, this.h);
    }
  }
}

export { WEATHER_TYPES };
