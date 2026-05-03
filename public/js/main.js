// ============================================================
// MAIN.JS - Entry point
// ============================================================

import { Engine } from './engine.js';

// Boot sequence
const engine = new Engine();

// ASCII boot message in console
console.log(`
%c╔══════════════════════════════════════╗
║       AGENT WORLD v1.0               ║
║   Pokemon GBC Claude Visualizer      ║
╠══════════════════════════════════════╣
║                                      ║
║  Controls:                           ║
║    [D]     - Launch demo agents      ║
║    [Click] - Select an agent         ║
║    [ESC]   - Deselect / close        ║
║    [Space] - Pause / unpause         ║
║                                      ║
║  API:                                ║
║    POST /api/agents                  ║
║    PUT  /api/agents/:id              ║
║    POST /api/agents/:id/thought      ║
║                                      ║
╚══════════════════════════════════════╝
`, 'color: #88c070; font-family: monospace;');

// Start the game loop
engine.start();

// Expose engine for debugging
window.__engine = engine;
