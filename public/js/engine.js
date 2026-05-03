// ============================================================
// ENGINE.JS - Game loop, rendering, input handling
// Integrates all systems: agents, particles, sound, music,
// weather, professor, battle, badges, pokedex, dashboard, timeline
// ============================================================

import {
  MAP, MAP_W, MAP_H, TILE_SIZE, PALETTES, BUILDINGS,
  renderMap, drawBuildingLabel
} from './world.js';
import { AgentManager } from './agents.js';
import { DialogSystem, ThoughtBubble } from './dialog.js';
import { SocketManager } from './socket.js';
import { ParticleSystem } from './particles.js';
import { SoundManager } from './sound.js';
import { WeatherSystem, WEATHER_TYPES } from './weather.js';
import { MusicEngine } from './music.js';
import { ProfessorNPC } from './professor.js';
import { BattleScene } from './battle.js';
import { BadgeSystem } from './badges.js';
import { Pokedex } from './pokedex.js';
import { Dashboard } from './dashboard.js';
import { Timeline } from './timeline.js';
import { PanelManager } from './panels.js';

const CANVAS_W = MAP_W * TILE_SIZE; // 768
const CANVAS_H = MAP_H * TILE_SIZE; // 576

export class Engine {
  constructor() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;

    // Core systems
    this.agents = new AgentManager();
    this.dialog = new DialogSystem();
    this.thoughts = new Map();
    this.particles = new ParticleSystem();
    this.sound = new SoundManager();
    this.socket = new SocketManager(this.onSocketMessage.bind(this));

    // New systems
    this.weather = new WeatherSystem(CANVAS_W, CANVAS_H);
    this.music = new MusicEngine();
    this.professor = new ProfessorNPC();
    this.battle = new BattleScene(CANVAS_W, CANVAS_H, this.sound);
    this.badges = new BadgeSystem();
    this.pokedex = new Pokedex();
    this.dashboard = new Dashboard();
    this.timeline = new Timeline();
    this.panels = new PanelManager();

    // Wire panel click to agent selection
    this.panels.onAgentClick = (id) => {
      const agent = this.agents.getAgent(id);
      if (agent) {
        this.agents.deselect();
        agent.selected = true;
        this.agents.selectedId = id;
        this.showAgentInfo(agent);
        this.sound.play('select');
        this.refreshPanels();
      }
    };

    // Wire Clear All button
    const clearBtn = document.getElementById('clear-all-btn');
    if (clearBtn) clearBtn.addEventListener('click', () => this.clearAll());

    // Wire single-agent DISMISS button (visible only for done agents)
    const dismissBtn = document.getElementById('info-dismiss-btn');
    if (dismissBtn) dismissBtn.addEventListener('click', () => this.dismissSelected());

    // State
    this.paused = false;
    this.lastTime = 0;
    this.frame = 0;
    this.mapCanvas = null;

    // Day/night cycle
    this.timeOfDay = 0; // 0-1 (0=dawn, 0.25=day, 0.5=dusk, 0.75=night)
    this.dayNightSpeed = 1 / 60; // Full cycle in 60 seconds

    // Hover state
    this.hoverX = -1;
    this.hoverY = -1;
    this.hoveredAgent = null;

    // Activity tracking
    this.idleTime = 0;
    this.errorCount = 0;

    // Building labels
    this.buildingLabels = [
      { name: "PROF'S LAB",    x: 4,  y: 2 },
      { name: 'LIBRARY',       x: 19, y: 2 },
      { name: 'POKE CENTER',   x: 11, y: 8 },
      { name: 'CODE LAB',      x: 4,  y: 13 },
      { name: 'BATTLE ARENA',  x: 19, y: 13 },
    ];

    this.setupInput();
    this.socket.connect();
    this.mapCanvas = renderMap(0);
  }

  setupInput() {
    // Initialize audio on first interaction
    const initAudio = () => {
      this.sound.init();
      this.music.init();
      this.music.start();
      document.removeEventListener('click', initAudio);
      document.removeEventListener('keydown', initAudio);
    };
    document.addEventListener('click', initAudio);
    document.addEventListener('keydown', initAudio);

    // Click
    this.canvas.addEventListener('click', (e) => {
      const { px, py } = this.getCanvasCoords(e);

      // Check overlays first
      if (this.timeline.handleClick(px, py, CANVAS_W, CANVAS_H)) return;

      // Battle scene absorbs clicks
      if (this.battle.active) return;

      // Close overlays on click
      if (this.pokedex.visible) { this.pokedex.toggle(); return; }
      if (this.badges.showingBadgeScreen) { this.badges.toggleBadgeScreen(); return; }
      if (this.dashboard.visible) { this.dashboard.toggle(); return; }

      // Pokemon Center click
      if (this.hitTestBuilding(px, py, 'idle')) {
        this.showCompletedTasks();
        this.sound.play('select');
        return;
      }

      // Battle Arena click - trigger battle for working test agents
      if (this.hitTestBuilding(px, py, 'test-runner')) {
        const tester = [...this.agents.agents.values()].find(
          a => a.type === 'test-runner' && (a.status === 'working' || a.status === 'thinking')
        );
        if (tester) {
          this.startBattle(tester);
          return;
        }
      }

      const agent = this.agents.selectAt(px, py);
      if (agent) {
        this.showAgentInfo(agent);
        this.sound.play('select');
        // Battle for test runners
        if (agent.type === 'test-runner' && agent.status === 'working') {
          this.startBattle(agent);
        }
      } else {
        this.agents.deselect();
        this.dialog.hide();
        this.hideInfoPanel();
      }
    });

    // Hover
    this.canvas.addEventListener('mousemove', (e) => {
      const { px, py } = this.getCanvasCoords(e);
      this.hoverX = px;
      this.hoverY = py;

      let found = false;
      for (const agent of this.agents.agents.values()) {
        if (agent.hitTest(px, py)) {
          this.hoveredAgent = agent;
          this.canvas.style.cursor = 'pointer';
          found = true;
          break;
        }
      }
      if (!found && (this.hitTestBuilding(px, py, 'idle') || this.hitTestBuilding(px, py, 'test-runner'))) {
        this.canvas.style.cursor = 'pointer';
        this.hoveredAgent = null;
        found = true;
      }
      if (!found) {
        this.hoveredAgent = null;
        this.canvas.style.cursor = 'default';
      }
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();

      // Pokedex navigation
      if (this.pokedex.visible) {
        if (key === 'arrowup') { this.pokedex.navigate(-1); return; }
        if (key === 'arrowdown') { this.pokedex.navigate(1); return; }
        if (key === 'p' || key === 'escape') { this.pokedex.toggle(); return; }
        return;
      }

      switch (key) {
        case 'd': this.runDemo(); break;
        case 'r':
          if (e.shiftKey) { this.clearAll(); }
          else { this.reset(); }
          break;
        case 'm':
          const soundMuted = this.sound.toggleMute();
          this.music.toggleMute();
          document.getElementById('title-bar').textContent =
            soundMuted ? 'AGENT WORLD [MUTED]' : 'AGENT WORLD';
          break;
        case 'p': this.pokedex.toggle(); break;
        case 'b': this.badges.toggleBadgeScreen(); break;
        case 'f': this.dashboard.toggle(); break;
        case 't': this.timeline.toggle(); break;
        case 'escape':
          if (this.battle.active) break; // Can't escape battle
          if (this.badges.showingBadgeScreen) { this.badges.toggleBadgeScreen(); break; }
          if (this.dashboard.visible) { this.dashboard.toggle(); break; }
          if (this.timeline.visible) { this.timeline.toggle(); break; }
          this.agents.deselect();
          this.dialog.hide();
          this.hideInfoPanel();
          break;
        case ' ':
          e.preventDefault();
          this.paused = !this.paused;
          break;
        case 'tab':
          e.preventDefault();
          const next = e.shiftKey ? this.agents.selectPrev() : this.agents.selectNext();
          if (next) {
            this.showAgentInfo(next);
            this.sound.play('select');
          }
          break;
        case 'arrowleft':
          if (this.timeline.visible) this.timeline.setPosition(this.timeline.replayPos - 0.02);
          break;
        case 'arrowright':
          if (this.timeline.visible) this.timeline.setPosition(this.timeline.replayPos + 0.02);
          break;
        case '1':
          this.panels.toggleLeft();
          break;
        case '2':
          this.panels.toggleRight();
          break;
      }
    });
  }

  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      px: (e.clientX - rect.left) * (CANVAS_W / rect.width),
      py: (e.clientY - rect.top) * (CANVAS_H / rect.height),
    };
  }

  hitTestBuilding(px, py, buildingKey) {
    const b = BUILDINGS[buildingKey];
    if (!b) return false;
    const dx = b.door.x;
    const dy = b.door.y;
    const left = (dx - 2) * TILE_SIZE;
    const top = (dy - 2) * TILE_SIZE;
    const right = (dx + 3) * TILE_SIZE;
    const bottom = (dy + 1) * TILE_SIZE;
    return px >= left && px <= right && py >= top && py <= bottom;
  }

  startBattle(agent) {
    this.battle.startBattle(agent, (won) => {
      if (won) {
        this.particles.doneBurst(agent);
      }
    });
    this.sound.play('spawn');
  }

  // === Info Display ===

  showCompletedTasks() {
    const doneAgents = [...this.agents.agents.values()].filter(a => a.status === 'done');
    const allAgents = [...this.agents.agents.values()];

    let text = doneAgents.length === 0
      ? 'No completed tasks yet. Agents are still working!'
      : doneAgents.map(a => `${a.shortId}: ${a.task}`).join(' | ');

    const header = `POKE CENTER - ${doneAgents.length}/${allAgents.length} COMPLETE`;
    this.dialog.show(header, text, '#c03030');

    const panel = document.getElementById('info-panel');
    panel.classList.remove('hidden');
    document.getElementById('info-name').textContent = 'POKE CENTER';
    document.getElementById('info-type').textContent = 'TASK LOG';
    document.getElementById('info-task').textContent = doneAgents.length === 0
      ? 'No completed tasks yet.'
      : doneAgents.map(a => `[DONE] ${a.shortId}: ${a.task}`).join('\n');
    document.getElementById('info-thoughts').textContent = doneAgents.length === 0
      ? `${allAgents.length} agent(s) still working...`
      : doneAgents.map(a => a.thoughts ? `"${a.thoughts}"` : '').filter(Boolean).join(' | ');
    const statusEl = document.getElementById('info-status');
    statusEl.textContent = `${doneAgents.length} of ${allAgents.length} tasks complete`;
    statusEl.className = doneAgents.length === allAgents.length ? 'done' : 'working';
  }

  showAgentInfo(agent) {
    const statusColors = {
      walking: '#d08020', working: '#20a020', thinking: '#3060c0',
      done: '#808080', idle: '#a040a0'
    };

    const panel = document.getElementById('info-panel');
    panel.classList.remove('hidden');
    document.getElementById('info-name').textContent = agent.shortId;
    document.getElementById('info-type').textContent = agent.type;
    document.getElementById('info-task').textContent = `TASK: ${agent.task || 'None'}`;
    document.getElementById('info-thoughts').textContent = agent.thoughts ? `"${agent.thoughts}"` : '';
    const statusEl = document.getElementById('info-status');
    statusEl.textContent = agent.progress > 0 ? `${agent.status} (${agent.progress}%)` : agent.status;
    statusEl.className = agent.status;

    const dismissBtn = document.getElementById('info-dismiss-btn');
    if (dismissBtn) dismissBtn.classList.toggle('hidden', agent.status !== 'done');

    const header = `${agent.shortId} [${agent.type.toUpperCase()}]`;
    this.dialog.show(header, agent.task || 'Waiting for assignment...', statusColors[agent.status]);
  }

  // Dismiss the currently-selected done agent. The DELETE call broadcasts an
  // agent_remove event, so all connected browsers see the despawn.
  async dismissSelected() {
    const id = this.agents.selectedId;
    if (!id) return;
    const agent = this.agents.getAgent(id);
    if (!agent || agent.status !== 'done') return;
    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error('[dismiss] failed:', e);
      return;
    }
    this.hideInfoPanel();
    this.dialog.hide();
  }

  hideInfoPanel() {
    document.getElementById('info-panel').classList.add('hidden');
  }

  // === WebSocket Messages ===

  onSocketMessage(msg) {
    if (!msg || !msg.data) return;

    switch (msg.type) {
      case 'init':
        if (!Array.isArray(msg.data)) return;
        // Clear stale state and sync with server truth
        this.agents = new AgentManager();
        this.thoughts.clear();
        for (const data of msg.data) {
          this.agents.createAgent(data);
          this.pokedex.onAgentSeen(data.type);
        }
        this.refreshPanels();
        break;

      case 'agent_create':
        this.agents.createAgent(msg.data);
        this.particles.spawnBurst(msg.data);
        this.sound.play('spawn');
        this.professor.narrate('spawn', msg.data);
        this.professor.moveNearAgent(msg.data);
        this.badges.onAgentSpawn(msg.data);
        this.pokedex.onAgentSeen(msg.data.type);
        this.dashboard.onSpawn();
        this.timeline.record('spawn', msg.data);
        this.panels.addHistory('spawn', msg.data);
        this.weather.updateFromActivity(this.agents.count, this.errorCount, this.idleTime, false);
        this.idleTime = 0;
        this.showThought(msg.data.id, `Spawned! Task: ${msg.data.task || '?'}`);
        this.refreshPanels();
        break;

      case 'agent_update': {
        const prev = this.agents.getAgent(msg.data.id);
        const prevStatus = prev?.status;
        this.agents.updateAgent(msg.data);
        const agent = this.agents.getAgent(msg.data.id);

        if (agent && msg.data.thoughts) {
          this.showThought(msg.data.id, msg.data.thoughts);
          this.panels.addHistory('thought', { id: agent.shortId, thoughts: msg.data.thoughts });
        }

        if (agent && msg.data.status && msg.data.status !== prevStatus) {
          if (msg.data.status === 'done') {
            this.particles.doneBurst(agent);
            this.sound.play('done');
            this.professor.narrate('done', agent);
            this.badges.onAgentDone(agent);
            this.pokedex.onAgentCompleted(agent.type, Date.now() - agent.createdAt);
            this.dashboard.onComplete(Date.now() - agent.createdAt);
            this.weather.updateFromActivity(this.agents.count, this.errorCount, 0, true);
            this.panels.addHistory('done', { id: agent.shortId, thoughts: agent.thoughts, task: agent.task });
          } else if (msg.data.status === 'working') {
            this.particles.workFlash(agent);
            this.sound.play('statusChange');
            this.panels.addHistory('update', { id: agent.shortId, status: 'working' });
          } else if (msg.data.status === 'thinking') {
            this.professor.narrate('thinking', agent);
            this.sound.play('statusChange');
            this.panels.addHistory('update', { id: agent.shortId, status: 'thinking' });
          } else {
            this.sound.play('statusChange');
          }
        }

        this.timeline.record('update', msg.data);
        if (agent && agent.selected) this.showAgentInfo(agent);
        this.refreshPanels();
        break;
      }

      case 'agent_remove':
        if (!msg.data.id) return;
        const removing = this.agents.getAgent(msg.data.id);
        if (removing) {
          this.particles.despawnBurst(removing);
          this.panels.addHistory('remove', { id: removing.shortId });
        }
        this.agents.removeAgent(msg.data.id);
        this.thoughts.delete(msg.data.id);
        this.badges.onAgentRemove();
        this.dashboard.onRemove();
        this.timeline.record('remove', msg.data);
        this.sound.play('remove');
        this.refreshPanels();
        break;

      case 'world_clear':
        this.onWorldClear();
        break;
    }

    // Update music intensity based on agent count
    this.music.setIntensity(this.agents.count / 5);
    this.updateAgentCount();
  }

  showThought(agentId, text) {
    const agent = this.agents.getAgent(agentId);
    if (!agent) return;
    let bubble = this.thoughts.get(agentId);
    if (!bubble) {
      bubble = new ThoughtBubble();
      this.thoughts.set(agentId, bubble);
    }
    bubble.show(text, agent.px + 16, agent.py);
  }

  updateAgentCount() {
    const working = [...this.agents.agents.values()].filter(a => a.status === 'working' || a.status === 'thinking').length;
    document.getElementById('agent-count').textContent =
      `AGENTS: ${this.agents.count}` + (working > 0 ? ` (${working} active)` : '');
  }

  refreshPanels() {
    this.panels.updateAgentList(this.agents.agents, this.agents.selectedId);
  }

  reset() {
    this.agents = new AgentManager();
    this.thoughts.clear();
    this.particles = new ParticleSystem();
    this.dialog.hide();
    this.hideInfoPanel();
    this.updateAgentCount();
  }

  // Hard reset: wipe server state + history, then reload the page.
  // Triggered by the Clear All button or Shift+R.
  async clearAll() {
    if (!confirm('Clear ALL agents and history? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/agents', { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      alert(`Failed to clear: ${e.message}`);
      return;
    }
    this.panels.clearHistory();
    location.reload();
  }

  // Pushed by the server when another client clears the world. Resync without reloading.
  onWorldClear() {
    this.reset();
    this.panels.clearHistory();
    this.timeline.events = [];
    this.refreshPanels();
    console.log('[ws] World cleared by another client');
  }

  // === Demo Mode ===

  async runDemo() {
    const demoAgents = [
      { id: 'explorer-01', type: 'Explore', task: 'Scanning codebase for test files', thoughts: 'Looking through src/...' },
      { id: 'planner-01', type: 'Plan', task: 'Designing authentication system', thoughts: 'Considering OAuth vs JWT...' },
      { id: 'coder-01', type: 'general-purpose', task: 'Implementing user login endpoint', thoughts: 'Writing Express route handler' },
      { id: 'tester-01', type: 'test-runner', task: 'Running integration test suite', thoughts: 'Executing jest --coverage' },
      { id: 'guide-01', type: 'claude-code-guide', task: 'Researching MCP server setup', thoughts: 'Reading documentation...' },
    ];

    for (const data of demoAgents) {
      this.agents.createAgent(data);
      this.particles.spawnBurst(data);
      this.sound.play('spawn');
      this.professor.narrate('spawn', data);
      this.badges.onAgentSpawn(data);
      this.pokedex.onAgentSeen(data.type);
      this.dashboard.onSpawn();
      this.timeline.record('spawn', data);
      this.panels.addHistory('spawn', data);
      this.showThought(data.id, data.thoughts);
      this.refreshPanels();
      await new Promise(r => setTimeout(r, 800));
    }

    this.music.setIntensity(1);
    this.updateAgentCount();
    this.refreshPanels();

    // Simulate progress updates
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += 10;
      for (const agent of this.agents.agents.values()) {
        if (agent.status === 'working' || agent.status === 'walking') {
          agent.progress = Math.min(100, progress + Math.floor(Math.random() * 15));
        }
      }
      if (progress >= 100) clearInterval(progressInterval);
    }, 1500);

    // Status changes
    setTimeout(() => {
      const e = this.agents.getAgent('explorer-01');
      if (e) { e.updateFromServer({ status: 'working', thoughts: 'Found 47 test files!', progress: 60 }); this.particles.workFlash(e); this.showThought('explorer-01', 'Found 47 test files!'); }
    }, 5000);

    setTimeout(() => {
      const p = this.agents.getAgent('planner-01');
      if (p) { p.updateFromServer({ status: 'thinking', thoughts: 'JWT with refresh tokens!', progress: 45 }); this.professor.narrate('thinking', p); this.showThought('planner-01', 'JWT with refresh tokens!'); }
    }, 7000);

    setTimeout(() => {
      const c = this.agents.getAgent('coder-01');
      if (c) { c.updateFromServer({ status: 'working', thoughts: 'Login handler complete!', progress: 75 }); this.particles.workFlash(c); this.showThought('coder-01', 'Login handler complete!'); }
    }, 9000);

    setTimeout(() => {
      const t = this.agents.getAgent('tester-01');
      if (t) {
        t.updateFromServer({ status: 'working', progress: 50 });
        // Auto-trigger battle
        this.startBattle(t);
      }
    }, 10000);

    setTimeout(() => {
      const t = this.agents.getAgent('tester-01');
      if (t) {
        t.updateFromServer({ status: 'done', thoughts: 'All 23 tests passed!', progress: 100 });
        this.particles.doneBurst(t); this.sound.play('done'); this.badges.onAgentDone(t);
        this.pokedex.onAgentCompleted(t.type, 12000); this.dashboard.onComplete(12000);
        this.weather.updateFromActivity(this.agents.count, 0, 0, true);
        this.showThought('tester-01', 'All 23 tests passed!');
      }
    }, 16000);

    setTimeout(() => {
      const e = this.agents.getAgent('explorer-01');
      if (e) {
        e.updateFromServer({ status: 'done', thoughts: 'Done exploring!', progress: 100 });
        this.particles.doneBurst(e); this.sound.play('done'); this.badges.onAgentDone(e);
        this.pokedex.onAgentCompleted(e.type, 14000); this.dashboard.onComplete(14000);
        this.showThought('explorer-01', 'Done exploring!');
      }
    }, 18000);

    setTimeout(() => {
      const c = this.agents.getAgent('coder-01');
      if (c) {
        c.updateFromServer({ status: 'done', thoughts: 'Feature complete!', progress: 100 });
        this.particles.doneBurst(c); this.sound.play('done'); this.badges.onAgentDone(c);
        this.showThought('coder-01', 'Feature complete!');
      }
    }, 20000);
  }

  // === Update Loop ===

  update(dt) {
    if (this.paused) return;

    this.frame++;

    // Day/night cycle
    this.timeOfDay = (this.timeOfDay + this.dayNightSpeed * dt) % 1;

    // Idle tracking
    if (this.agents.count === 0) {
      this.idleTime += dt;
      if (this.idleTime > 30) {
        this.weather.updateFromActivity(0, 0, this.idleTime, false);
      }
    }

    // Update all systems
    this.agents.update(dt);
    this.particles.update(dt);
    this.weather.update(dt);
    this.professor.update(dt);
    this.battle.update(dt);
    this.badges.update(dt);
    this.dashboard.update(dt, this.agents.count);
    this.dialog.update();

    // Thought bubbles
    for (const [id, bubble] of this.thoughts.entries()) {
      const agent = this.agents.getAgent(id);
      if (agent) bubble.update(dt, agent.px + 16, agent.py);
      if (!bubble.visible) this.thoughts.delete(id);
    }

    // Refresh map periodically
    if (this.frame % 60 === 0) {
      this.mapCanvas = renderMap(this.frame);
    }

    // Refresh side panels periodically (for progress updates)
    if (this.frame % 30 === 0) {
      this.refreshPanels();
    }
  }

  // === Render Loop ===

  render() {
    const ctx = this.ctx;

    // If battle is active, render battle scene only
    if (this.battle.active) {
      this.battle.render(ctx);
      return;
    }

    // Clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Map
    if (this.mapCanvas) {
      ctx.drawImage(this.mapCanvas, 0, 0);
    }

    // Day/night tint on map
    this.renderDayNight(ctx);

    // Weather (behind agents)
    this.weather.render(ctx);

    // Building labels
    ctx.save();
    for (const label of this.buildingLabels) {
      this.drawLabel(ctx, label.name, label.x, label.y);
    }
    ctx.restore();

    // Professor NPC
    this.professor.render(ctx);

    // Agents
    this.agents.render(ctx);

    // Particles
    this.particles.render(ctx);

    // Thought bubbles
    for (const bubble of this.thoughts.values()) {
      bubble.render(ctx);
    }

    // Hover tooltip
    if (this.hoveredAgent && !this.hoveredAgent.selected) {
      this.drawHoverTooltip(ctx, this.hoveredAgent);
    }

    // Dialog box
    this.dialog.render(ctx);

    // Badge popup
    this.badges.renderPopup(ctx, CANVAS_W, CANVAS_H);

    // Full-screen overlays (only one at a time)
    this.pokedex.render(ctx, CANVAS_W, CANVAS_H);
    this.badges.renderBadgeScreen(ctx, CANVAS_W, CANVAS_H);
    this.dashboard.render(ctx, CANVAS_W, CANVAS_H);
    this.timeline.render(ctx, CANVAS_W, CANVAS_H);

    // Pause
    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = '#f8f8f8';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', CANVAS_W / 2, CANVAS_H / 2 - 12);
      ctx.font = '12px monospace';
      ctx.fillStyle = '#888';
      ctx.fillText('Press SPACE to resume', CANVAS_W / 2, CANVAS_H / 2 + 16);
    }

    // Connection indicator
    ctx.fillStyle = this.socket.connected ? '#40f040' : '#f04040';
    ctx.fillRect(CANVAS_W - 12, 4, 8, 8);
  }

  renderDayNight(ctx) {
    const t = this.timeOfDay;
    let overlay = null;
    let alpha = 0;

    if (t > 0.4 && t < 0.6) {
      // Dusk (warm orange)
      const p = (t - 0.4) / 0.1;
      const fadeIn = t < 0.5 ? p : (0.6 - t) / 0.1;
      overlay = 'rgba(200,120,40,';
      alpha = fadeIn * 0.12;
    } else if (t >= 0.6 || t < 0.15) {
      // Night (blue-purple)
      let fadeIn;
      if (t >= 0.6) fadeIn = Math.min(1, (t - 0.6) / 0.1);
      else fadeIn = Math.max(0, 1 - t / 0.15);
      overlay = 'rgba(30,20,80,';
      alpha = fadeIn * 0.2;
    }
    // Dawn (0.15-0.25) - gentle pink
    else if (t >= 0.15 && t < 0.3) {
      const fadeIn = t < 0.22 ? (t - 0.15) / 0.07 : (0.3 - t) / 0.08;
      overlay = 'rgba(200,100,120,';
      alpha = fadeIn * 0.08;
    }

    if (overlay && alpha > 0.01) {
      ctx.fillStyle = overlay + alpha + ')';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Lit windows at night
      if ((t >= 0.6 || t < 0.15) && alpha > 0.1) {
        ctx.fillStyle = `rgba(248,216,120,${alpha * 2})`;
        // Window positions (from map data)
        const windows = [[3,3],[5,3],[18,3],[20,3],[3,14],[5,14],[18,14],[20,14],[10,9],[13,9]];
        for (const [wx, wy] of windows) {
          ctx.fillRect(wx * TILE_SIZE + 8, wy * TILE_SIZE + 8, 16, 16);
        }
      }
    }
  }

  drawHoverTooltip(ctx, agent) {
    const text = `${agent.shortId} [${agent.status.toUpperCase()}]`;
    ctx.font = 'bold 12px monospace';
    const tw = ctx.measureText(text).width;
    const tx = Math.min(this.hoverX + 8, CANVAS_W - tw - 16);
    const ty = Math.max(this.hoverY - 24, 8);

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(tx - 4, ty - 4, tw + 8, 20);
    ctx.fillStyle = '#f8f8f8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(text, tx, ty);
  }

  drawLabel(ctx, name, centerX, topY) {
    const px = centerX * TILE_SIZE;
    const py = (topY - 1) * TILE_SIZE + 12;

    ctx.font = 'bold 14px monospace';
    const tw = ctx.measureText(name).width;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(px - tw / 2 - 6, py - 4, tw + 12, 22);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#000';
    ctx.fillText(name, px + 2, py + 2);
    ctx.fillStyle = '#f8f8a0';
    ctx.fillText(name, px, py);
  }

  start() {
    const loop = (time) => {
      const dt = Math.min((time - this.lastTime) / 1000, 0.1);
      this.lastTime = time;
      this.update(dt);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame((time) => {
      this.lastTime = time;
      requestAnimationFrame(loop);
    });
  }
}
