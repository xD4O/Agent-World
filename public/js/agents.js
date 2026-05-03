// ============================================================
// AGENTS.JS - Agent entity management
// ============================================================

import {
  AGENT_COLORS, BUILDINGS, SPAWN_POINT, TILE_SIZE,
  findPath, drawSprite
} from './world.js';

export class Agent {
  constructor(data) {
    this.id = data.id;
    this.type = data.type || 'general-purpose';
    this.task = data.task || '';
    this.thoughts = data.thoughts || '';
    this.status = data.status || 'walking';
    this.createdAt = data.createdAt || Date.now();
    this.progress = data.progress || 0; // 0-100

    // Position in tile coordinates
    this.tileX = SPAWN_POINT.x;
    this.tileY = SPAWN_POINT.y;

    // Pixel position (for smooth movement)
    this.px = this.tileX * TILE_SIZE;
    this.py = this.tileY * TILE_SIZE;

    // Movement
    this.path = [];
    this.pathIndex = 0;
    this.moveSpeed = 2.4; // pixels per frame (2x for 32px tiles)
    this.moving = false;
    this.dir = 0; // 0=down, 1=up, 2=left, 3=right
    this.walkFrame = 0;
    this.walkTimer = 0;

    // Visual
    this.colors = AGENT_COLORS[this.type] || AGENT_COLORS['default'];
    this.selected = false;
    this.bobOffset = 0;
    this.bobTimer = Math.random() * Math.PI * 2;

    // Name for display
    this.displayName = this.type.toUpperCase();
    if (this.id.length > 12) {
      this.shortId = this.id.slice(0, 8) + '..';
    } else {
      this.shortId = this.id;
    }

    // Pacing state (walk back and forth while working)
    this.pacing = false;
    this.paceTimer = 0;
    this.paceDelay = 1.5 + Math.random() * 2; // pause before pacing
    this.paceDirRight = Math.random() > 0.5;
    this.paceOriginX = 0; // set when arriving at building
    this.paceOriginY = 0;
    this.paceRange = TILE_SIZE * 2; // pace 2 tiles left/right

    // Navigate to work area
    this.navigateToWork();
  }

  getBuilding() {
    // Map agent type to building
    if (BUILDINGS[this.type]) return BUILDINGS[this.type];
    return BUILDINGS['general-purpose'] || BUILDINGS['idle'];
  }

  navigateToWork() {
    const building = this.getBuilding();
    const target = building.door;
    this.path = findPath(this.tileX, this.tileY, target.x, target.y);
    this.pathIndex = 0;
    this.moving = this.path.length > 0;
    if (this.moving) this.status = 'walking';
  }

  navigateTo(tx, ty) {
    this.path = findPath(this.tileX, this.tileY, tx, ty);
    this.pathIndex = 0;
    this.moving = this.path.length > 0;
  }

  navigateToSpawn() {
    this.navigateTo(SPAWN_POINT.x, SPAWN_POINT.y);
    this.status = 'done';
  }

  update(dt) {
    this.bobTimer += dt * 2;
    this.bobOffset = Math.sin(this.bobTimer) * 0.5;
    this.walkTimer += dt;

    if (this.moving && this.path.length > 0 && this.pathIndex < this.path.length) {
      const target = this.path[this.pathIndex];
      const targetPx = target.x * TILE_SIZE;
      const targetPy = target.y * TILE_SIZE;

      const dx = targetPx - this.px;
      const dy = targetPy - this.py;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.moveSpeed) {
        // Arrived at waypoint
        this.px = targetPx;
        this.py = targetPy;
        this.tileX = target.x;
        this.tileY = target.y;
        this.pathIndex++;

        if (this.pathIndex >= this.path.length) {
          // Arrived at destination
          this.moving = false;
          if (this.status === 'walking') {
            this.status = 'working';
          }
          this.dir = 0; // Face down when stopped
          // Set pacing origin to current position
          this.paceOriginX = this.px;
          this.paceOriginY = this.py;
          this.paceTimer = 0;
          this.pacing = false;
        }
      } else {
        // Move toward waypoint
        const speed = this.moveSpeed;
        this.px += (dx / dist) * speed;
        this.py += (dy / dist) * speed;

        // Update direction
        if (Math.abs(dx) > Math.abs(dy)) {
          this.dir = dx > 0 ? 3 : 2; // right : left
        } else {
          this.dir = dy > 0 ? 0 : 1; // down : up
        }

        // Walk animation
        if (this.walkTimer > 0.2) {
          this.walkFrame = (this.walkFrame + 1) % 2;
          this.walkTimer = 0;
        }
      }
    } else if (!this.moving && (this.status === 'working' || this.status === 'thinking')) {
      // Pace back and forth in front of building
      this.paceTimer += dt;

      if (!this.pacing && this.paceTimer > this.paceDelay) {
        this.pacing = true;
        this.paceTimer = 0;
      }

      if (this.pacing) {
        const speed = this.moveSpeed * 0.7;
        if (this.paceDirRight) {
          this.px += speed;
          this.dir = 3; // facing right
          if (this.px >= this.paceOriginX + this.paceRange) {
            this.paceDirRight = false;
            // Brief pause at the turn
            this.pacing = false;
            this.paceTimer = this.paceDelay * 0.5;
          }
        } else {
          this.px -= speed;
          this.dir = 2; // facing left
          if (this.px <= this.paceOriginX - this.paceRange) {
            this.paceDirRight = true;
            this.pacing = false;
            this.paceTimer = this.paceDelay * 0.5;
          }
        }

        // Walk animation while pacing
        if (this.walkTimer > 0.2) {
          this.walkFrame = (this.walkFrame + 1) % 2;
          this.walkTimer = 0;
        }
      } else {
        this.walkFrame = 0;
        // Face down when paused between paces
        if (this.paceTimer < 0.3) this.dir = 0;
      }
    } else if (!this.moving) {
      this.walkFrame = 0;
    }
  }

  render(ctx) {
    const renderY = this.py + (this.moving ? 0 : this.bobOffset);
    drawSprite(ctx, this.px, renderY, this.colors, this.dir, this.walkFrame, this.status);

    // Name tag above head
    const nameX = this.px + 16;
    const nameY = this.py - 12;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    // Dark outline for readability
    const name = this.shortId;
    ctx.fillStyle = '#000000';
    ctx.fillText(name, nameX - 2, nameY);
    ctx.fillText(name, nameX + 2, nameY);
    ctx.fillText(name, nameX, nameY - 2);
    ctx.fillText(name, nameX, nameY + 2);
    // White text
    ctx.fillStyle = '#f8f8f8';
    ctx.fillText(name, nameX, nameY);

    // HP-style progress bar (only when working/thinking and progress > 0)
    if (this.progress > 0 && (this.status === 'working' || this.status === 'thinking')) {
      const barW = 36;
      const barH = 6;
      const barX = this.px - 2;
      const barY = this.py + 34;
      const ratio = this.progress / 100;
      const barColor = ratio > 0.5 ? '#40c040' : ratio > 0.2 ? '#e0c020' : '#e04040';

      ctx.fillStyle = '#181818';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = barColor;
      ctx.fillRect(barX + 2, barY + 2, (barW - 4) * ratio, barH - 4);
    }

    // Selection indicator
    if (this.selected) {
      ctx.strokeStyle = '#f8f838';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(this.px - 2, this.py - 2, 36, 36);
      ctx.setLineDash([]);
    }
  }

  // Check if a pixel coordinate hits this agent
  hitTest(px, py) {
    return px >= this.px && px < this.px + TILE_SIZE &&
           py >= this.py && py < this.py + TILE_SIZE + 2;
  }

  updateFromServer(data) {
    if (data.task) this.task = data.task;
    if (data.thoughts !== undefined) this.thoughts = data.thoughts;
    if (data.progress !== undefined) this.progress = data.progress;
    if (data.type && data.type !== this.type) {
      this.type = data.type;
      this.colors = AGENT_COLORS[this.type] || AGENT_COLORS['default'];
      this.navigateToWork();
    }
    if (data.status) {
      const oldStatus = this.status;
      this.status = data.status;
      if (data.status === 'done' && oldStatus !== 'done') {
        this.navigateToSpawn();
      } else if (data.status === 'walking' && oldStatus !== 'walking') {
        this.navigateToWork();
      }
    }
  }
}

// Agent manager
export class AgentManager {
  constructor() {
    this.agents = new Map();
    this.selectedId = null;
  }

  createAgent(data) {
    if (this.agents.has(data.id)) {
      this.agents.get(data.id).updateFromServer(data);
      return this.agents.get(data.id);
    }
    const agent = new Agent(data);
    this.agents.set(data.id, agent);
    return agent;
  }

  updateAgent(data) {
    const agent = this.agents.get(data.id);
    if (agent) agent.updateFromServer(data);
  }

  removeAgent(id) {
    this.agents.delete(id);
    if (this.selectedId === id) this.selectedId = null;
  }

  getAgent(id) {
    return this.agents.get(id);
  }

  getSelected() {
    return this.selectedId ? this.agents.get(this.selectedId) : null;
  }

  selectAt(px, py) {
    // Deselect current
    if (this.selectedId) {
      const prev = this.agents.get(this.selectedId);
      if (prev) prev.selected = false;
    }
    this.selectedId = null;

    // Find clicked agent (reverse order for top-most)
    const entries = [...this.agents.values()].reverse();
    for (const agent of entries) {
      if (agent.hitTest(px, py)) {
        agent.selected = true;
        this.selectedId = agent.id;
        return agent;
      }
    }
    return null;
  }

  deselect() {
    if (this.selectedId) {
      const agent = this.agents.get(this.selectedId);
      if (agent) agent.selected = false;
      this.selectedId = null;
    }
  }

  selectNext() {
    const keys = [...this.agents.keys()];
    if (keys.length === 0) return null;
    this.deselect();
    const idx = this.selectedId ? keys.indexOf(this.selectedId) : -1;
    const nextIdx = (idx + 1) % keys.length;
    const agent = this.agents.get(keys[nextIdx]);
    if (agent) {
      agent.selected = true;
      this.selectedId = agent.id;
    }
    return agent;
  }

  selectPrev() {
    const keys = [...this.agents.keys()];
    if (keys.length === 0) return null;
    this.deselect();
    const idx = this.selectedId ? keys.indexOf(this.selectedId) : 1;
    const prevIdx = (idx - 1 + keys.length) % keys.length;
    const agent = this.agents.get(keys[prevIdx]);
    if (agent) {
      agent.selected = true;
      this.selectedId = agent.id;
    }
    return agent;
  }

  update(dt) {
    for (const agent of this.agents.values()) {
      agent.update(dt);
    }
  }

  render(ctx) {
    // Sort by Y for correct overlap
    const sorted = [...this.agents.values()].sort((a, b) => a.py - b.py);
    for (const agent of sorted) {
      agent.render(ctx);
    }
  }

  get count() {
    return this.agents.size;
  }
}
