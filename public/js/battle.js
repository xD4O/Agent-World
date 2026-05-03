// ============================================================
// BATTLE.JS - Pokemon-style battle scene for test runners
// Screen transition, battle UI, HP bars, attack animations
// ============================================================

import { PALETTES, AGENT_COLORS, TILE_SIZE } from './world.js';

const BATTLE_STATES = {
  IDLE: 'idle',
  TRANSITION_IN: 'transition_in',
  INTRO: 'intro',
  FIGHTING: 'fighting',
  ATTACK_PLAYER: 'attack_player',
  ATTACK_ENEMY: 'attack_enemy',
  VICTORY: 'victory',
  DEFEAT: 'defeat',
  TRANSITION_OUT: 'transition_out',
};

// Bug Pokemon sprites (enemy) - simple pixel art
const BUG_COLORS = ['#a03030', '#c04040', '#d06040', '#802020'];

export class BattleScene {
  constructor(canvasW, canvasH, sound) {
    this.w = canvasW;
    this.h = canvasH;
    this.sound = sound;
    this.active = false;
    this.state = BATTLE_STATES.IDLE;
    this.timer = 0;

    // Battle data
    this.agent = null;
    this.agentHP = 100;
    this.agentMaxHP = 100;
    this.enemyHP = 100;
    this.enemyMaxHP = 100;
    this.enemyName = 'BUG';

    // Animation
    this.transitionProgress = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.flashAlpha = 0;
    this.attackFrame = 0;
    this.textQueue = [];
    this.currentText = '';
    this.textTimer = 0;
    this.textCharIndex = 0;

    // Results
    this.testResults = [];
    this.resultIndex = 0;
    this.autoAdvanceTimer = 0;

    // Callback when battle ends
    this.onEnd = null;
  }

  startBattle(agent, onEnd) {
    this.active = true;
    this.agent = agent;
    this.agentHP = 100;
    this.agentMaxHP = 100;
    this.enemyHP = 100;
    this.enemyMaxHP = 100;
    this.enemyName = 'WILD BUG';
    this.state = BATTLE_STATES.TRANSITION_IN;
    this.transitionProgress = 0;
    this.timer = 0;
    this.textQueue = [];
    this.currentText = '';
    this.testResults = [];
    this.resultIndex = 0;
    this.onEnd = onEnd;

    this.queueText(`A wild BUG appeared!`);
    this.queueText(`Go, ${agent.shortId}!`);
    this.queueText(`${agent.shortId} used TEST SUITE!`);
  }

  // Feed test results: array of {pass: true/false, name: string}
  feedResults(results) {
    this.testResults = results;
    this.resultIndex = 0;
  }

  // Auto-generate results from task
  autoGenerateResults(passed, total) {
    const results = [];
    for (let i = 0; i < total; i++) {
      results.push({
        pass: i < passed,
        name: `test_${i + 1}`
      });
    }
    // Shuffle to make it interesting
    for (let i = results.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [results[i], results[j]] = [results[j], results[i]];
    }
    this.feedResults(results);
  }

  queueText(text) {
    this.textQueue.push(text);
  }

  update(dt) {
    if (!this.active) return;
    this.timer += dt;

    switch (this.state) {
      case BATTLE_STATES.TRANSITION_IN:
        this.transitionProgress += dt * 2;
        if (this.transitionProgress >= 1) {
          this.transitionProgress = 1;
          this.state = BATTLE_STATES.INTRO;
          this.timer = 0;
        }
        break;

      case BATTLE_STATES.INTRO:
        this.advanceText(dt);
        if (this.textQueue.length === 0 && !this.currentText) {
          this.state = BATTLE_STATES.FIGHTING;
          this.timer = 0;
          // Auto-generate if no results fed
          if (this.testResults.length === 0) {
            const total = 5 + Math.floor(Math.random() * 10);
            const passed = total - Math.floor(Math.random() * 3);
            this.autoGenerateResults(passed, total);
          }
        }
        break;

      case BATTLE_STATES.FIGHTING:
        this.autoAdvanceTimer += dt;
        if (this.autoAdvanceTimer > 0.8 && this.resultIndex < this.testResults.length) {
          this.autoAdvanceTimer = 0;
          const result = this.testResults[this.resultIndex];
          this.resultIndex++;

          if (result.pass) {
            this.state = BATTLE_STATES.ATTACK_PLAYER;
            this.attackFrame = 0;
            this.queueText(`${result.name} PASSED!`);
            const dmg = Math.ceil(100 / this.testResults.length);
            this.enemyHP = Math.max(0, this.enemyHP - dmg);
            if (this.sound) this.sound.play('statusChange');
          } else {
            this.state = BATTLE_STATES.ATTACK_ENEMY;
            this.attackFrame = 0;
            this.queueText(`${result.name} FAILED!`);
            const dmg = Math.ceil(100 / this.testResults.length);
            this.agentHP = Math.max(0, this.agentHP - dmg);
            if (this.sound) this.sound.play('remove');
          }
        } else if (this.resultIndex >= this.testResults.length) {
          // All results processed
          if (this.enemyHP <= 0 || this.agentHP > this.enemyHP) {
            this.state = BATTLE_STATES.VICTORY;
            this.timer = 0;
            this.queueText(`${this.agent.shortId} wins!`);
            this.queueText('All tests passed!');
            if (this.sound) this.sound.play('done');
          } else {
            this.state = BATTLE_STATES.DEFEAT;
            this.timer = 0;
            this.queueText('Some tests failed...');
          }
        }
        this.advanceText(dt);
        break;

      case BATTLE_STATES.ATTACK_PLAYER:
      case BATTLE_STATES.ATTACK_ENEMY:
        this.attackFrame += dt * 10;
        if (this.state === BATTLE_STATES.ATTACK_PLAYER) {
          this.shakeX = Math.sin(this.attackFrame * 5) * 3;
        } else {
          this.shakeX = -Math.sin(this.attackFrame * 5) * 3;
        }
        this.flashAlpha = Math.max(0, 1 - this.attackFrame * 2);
        if (this.attackFrame > 0.5) {
          this.shakeX = 0;
          this.flashAlpha = 0;
          this.state = BATTLE_STATES.FIGHTING;
        }
        this.advanceText(dt);
        break;

      case BATTLE_STATES.VICTORY:
      case BATTLE_STATES.DEFEAT:
        this.advanceText(dt);
        if (this.timer > 4) {
          this.state = BATTLE_STATES.TRANSITION_OUT;
          this.transitionProgress = 1;
        }
        break;

      case BATTLE_STATES.TRANSITION_OUT:
        this.transitionProgress -= dt * 2;
        if (this.transitionProgress <= 0) {
          this.active = false;
          this.state = BATTLE_STATES.IDLE;
          if (this.onEnd) this.onEnd(this.agentHP > 0);
        }
        break;
    }
  }

  advanceText(dt) {
    if (this.currentText) {
      this.textTimer += dt;
      this.textCharIndex = Math.min(
        this.currentText.length,
        Math.floor(this.textTimer / 0.03)
      );
      if (this.textCharIndex >= this.currentText.length && this.textTimer > 1.5) {
        this.currentText = '';
      }
    }
    if (!this.currentText && this.textQueue.length > 0) {
      this.currentText = this.textQueue.shift();
      this.textCharIndex = 0;
      this.textTimer = 0;
    }
  }

  render(ctx) {
    if (!this.active) return;

    const w = this.w;
    const h = this.h;

    // Transition wipe
    if (this.state === BATTLE_STATES.TRANSITION_IN || this.state === BATTLE_STATES.TRANSITION_OUT) {
      const p = this.transitionProgress;
      // Diagonal stripe wipe
      for (let i = 0; i < 10; i++) {
        const stripH = h / 5;  // 10 strips, each h/5 tall covering 2 strips
        const offset = (i % 2 === 0 ? 1 : -1) * (1 - p) * w;
        ctx.fillStyle = '#181818';
        ctx.fillRect(offset, i * stripH, w, stripH);
      }
      return;
    }

    // Battle background
    ctx.fillStyle = '#f8f8f0';
    ctx.fillRect(0, 0, w, h);

    // Ground
    ctx.fillStyle = '#c8d8a8';
    ctx.fillRect(0, h * 0.45, w, h * 0.55);
    ctx.fillStyle = '#b0c898';
    ctx.fillRect(0, h * 0.45, w, 6);

    // Enemy platform (top right)
    ctx.fillStyle = '#a0b888';
    ctx.fillRect(w * 0.55, h * 0.25, w * 0.35, 16);
    ctx.fillStyle = '#90a878';
    ctx.fillRect(w * 0.57, h * 0.25 + 16, w * 0.31, 8);

    // Player platform (bottom left)
    ctx.fillStyle = '#a0b888';
    ctx.fillRect(w * 0.05, h * 0.6, w * 0.35, 16);
    ctx.fillStyle = '#90a878';
    ctx.fillRect(w * 0.07, h * 0.6 + 16, w * 0.31, 8);

    // Draw enemy "bug" sprite (top right)
    this.drawBugSprite(ctx, w * 0.65 + this.shakeX, h * 0.08, this.enemyHP > 0);

    // Draw agent sprite (bottom left)
    this.drawAgentSprite(ctx, w * 0.1 - this.shakeX, h * 0.38);

    // HP boxes
    // Enemy HP (top left)
    this.drawHPBox(ctx, 16, 20, this.enemyName, this.enemyHP, this.enemyMaxHP, false);

    // Player HP (bottom right)
    this.drawHPBox(ctx, w - 280, h * 0.45, this.agent?.shortId || 'AGENT', this.agentHP, this.agentMaxHP, true);

    // Attack flash
    if (this.flashAlpha > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flashAlpha})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Text box at bottom
    if (this.currentText) {
      const boxY = h - 104;
      ctx.fillStyle = '#f8f0d0';
      ctx.fillRect(8, boxY, w - 16, 96);
      ctx.strokeStyle = '#383028';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, boxY + 2, w - 20, 92);
      ctx.strokeStyle = '#584830';
      ctx.lineWidth = 1;
      ctx.strokeRect(14, boxY + 6, w - 28, 84);

      ctx.fillStyle = '#282020';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(this.currentText.slice(0, this.textCharIndex), 28, boxY + 24);
    }

    // Victory/defeat overlay
    if (this.state === BATTLE_STATES.VICTORY) {
      const alpha = Math.min(0.3, (this.timer - 1) * 0.15);
      if (alpha > 0) {
        ctx.fillStyle = `rgba(255,255,200,${alpha})`;
        ctx.fillRect(0, 0, w, h);
      }
    } else if (this.state === BATTLE_STATES.DEFEAT) {
      const alpha = Math.min(0.3, (this.timer - 1) * 0.15);
      if (alpha > 0) {
        ctx.fillStyle = `rgba(100,0,0,${alpha})`;
        ctx.fillRect(0, 0, w, h);
      }
    }
  }

  drawHPBox(ctx, x, y, name, hp, maxHp, showHP) {
    const bw = 260;
    const bh = 72;

    ctx.fillStyle = '#f8f0d0';
    ctx.fillRect(x, y, bw, bh);
    ctx.strokeStyle = '#383028';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, bw, bh);

    // Name
    ctx.fillStyle = '#282020';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(name, x + 12, y + 12);

    // HP bar background
    ctx.fillStyle = '#383028';
    ctx.fillRect(x + 12, y + 32, bw - 24, 12);

    // HP bar fill
    const ratio = Math.max(0, hp / maxHp);
    const barColor = ratio > 0.5 ? '#40c040' : ratio > 0.2 ? '#e0c020' : '#e04040';
    ctx.fillStyle = barColor;
    ctx.fillRect(x + 14, y + 34, (bw - 28) * ratio, 8);

    // HP label
    ctx.fillStyle = '#282020';
    ctx.font = '10px monospace';
    ctx.fillText('HP', x + 12, y + 28);

    if (showHP) {
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.max(0, hp)}/${maxHp}`, x + bw - 12, y + 56);
      ctx.textAlign = 'left';
    }
  }

  drawBugSprite(ctx, x, y, alive) {
    if (!alive) return;
    const t = Date.now() / 300;
    const bob = Math.sin(t) * 4;

    // Bug body
    ctx.fillStyle = BUG_COLORS[0];
    ctx.fillRect(x + 16, y + 20 + bob, 40, 32);
    ctx.fillRect(x + 24, y + 12 + bob, 24, 8);
    // Eyes
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(x + 26, y + 16 + bob, 8, 8);
    ctx.fillRect(x + 42, y + 16 + bob, 8, 8);
    ctx.fillStyle = '#181818';
    ctx.fillRect(x + 28, y + 18 + bob, 4, 4);
    ctx.fillRect(x + 44, y + 18 + bob, 4, 4);
    // Mandibles
    ctx.fillStyle = BUG_COLORS[2];
    ctx.fillRect(x + 20, y + 28 + bob, 8, 6);
    ctx.fillRect(x + 44, y + 28 + bob, 8, 6);
    // Legs
    ctx.fillStyle = BUG_COLORS[1];
    ctx.fillRect(x + 8, y + 28 + bob, 8, 4);
    ctx.fillRect(x + 56, y + 28 + bob, 8, 4);
    ctx.fillRect(x + 12, y + 40 + bob, 8, 4);
    ctx.fillRect(x + 52, y + 40 + bob, 8, 4);
    // Wings
    ctx.fillStyle = BUG_COLORS[3];
    ctx.fillRect(x + 8, y + 8 + bob, 16, 16);
    ctx.fillRect(x + 48, y + 8 + bob, 16, 16);
  }

  drawAgentSprite(ctx, x, y) {
    if (!this.agent) return;
    const colors = this.agent.colors;
    const t = Date.now() / 500;
    const bob = Math.sin(t) * 2;

    // Larger battle sprite (2x size of overworld, which is already 2x)
    const s = 4;
    const p = (color, px, py, pw, ph) => {
      ctx.fillStyle = color;
      ctx.fillRect(x + px * s, y + py * s + bob, (pw || 1) * s, (ph || 1) * s);
    };

    // Hat
    p(colors.hat, 5, 0, 6, 1);
    p(colors.hat, 4, 1, 8, 3);
    p(colors.hatD, 4, 3, 8, 1);
    // Face
    p(PALETTES.agentSkin, 5, 4, 6, 4);
    p(PALETTES.agentSkinS, 5, 7, 6, 1);
    // Eyes
    p(PALETTES.agentEye, 6, 5, 2, 2);
    p(PALETTES.agentEye, 10, 5, 2, 2);
    p('#f8f8f8', 7, 5, 1, 1);
    p('#f8f8f8', 11, 5, 1, 1);
    // Body
    p(colors.shirt, 4, 8, 8, 4);
    p(colors.shirtD, 4, 11, 8, 1);
    // Arms (battle pose - one arm extended)
    p(PALETTES.agentSkin, 12, 8, 3, 2);
    p(PALETTES.agentSkin, 14, 7, 2, 2);
    p(PALETTES.agentSkin, 2, 8, 2, 3);
    // Pants & shoes
    p(colors.pants, 5, 12, 3, 2);
    p(colors.pants, 9, 12, 3, 2);
    p(colors.shoes, 5, 14, 3, 2);
    p(colors.shoes, 9, 14, 3, 2);
  }
}
