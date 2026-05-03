# Agent World - Pokemon GBC Claude Code Workflow Visualizer

## Project Overview
A web application that visualizes Claude Code's agentic workflows as a Pokemon Gameboy Color-style game world. Subagents appear as pixel-art trainers that walk to designated work areas (buildings) in a tile-based town, pace back and forth while working, and return to the Pokemon Center when done.

## Tech Stack
- **Backend**: Node.js + Express + ws (WebSocket), JSON file persistence
- **Frontend**: Vanilla HTML5 Canvas, CSS, ES Modules (no build step)
- **Style**: Gameboy Color aesthetic - 32x32 pixel tiles at 2x internal resolution, limited palette, pixel-perfect rendering

## Architecture
- `server.js` - Express server (port 3333). Wires REST + WebSocket + MCP onto a single port. Uses `agent-store.js` for state.
- `agent-store.js` - Shared in-memory agent store with file persistence (`data/agents.json`, `data/events.jsonl`). Single source of truth — REST handlers and MCP tools both call into it. Emits change events that `server.js` forwards to all WebSocket clients.
- `mcp-server.js` - MCP (Model Context Protocol) server using Streamable HTTP transport. Mounted at `/mcp`. Stateful sessions (each MCP client gets a session id) but they all share the global agent store. Loaded via dynamic `import()` because the SDK is ESM-only and this project is CJS.
- `public/` - Static frontend served by Express
  - `js/world.js` - Tile definitions, map data, sprite pixel art, color palettes, A* pathfinding
  - `js/agents.js` - Agent entity class with pathfinding, pacing behavior, and animation
  - `js/dialog.js` - Pokemon-style dialog box and thought bubble system
  - `js/engine.js` - Main game loop, rendering, input handling, integrates all systems
  - `js/socket.js` - WebSocket client for real-time server connection
  - `js/particles.js` - Spawn burst, done sparkle, work flash, despawn dissolve effects
  - `js/sound.js` - Chiptune sound effects (Web Audio API)
  - `js/music.js` - Procedural 4-channel chiptune background music
  - `js/weather.js` - Weather particles (rain, snow, storm, cherry blossoms, sun)
  - `js/professor.js` - Professor Oak NPC that narrates events
  - `js/battle.js` - Pokemon-style battle scene for test-runner agents
  - `js/badges.js` - 8 gym badge achievements (persisted to localStorage)
  - `js/pokedex.js` - Agent type registry with stats
  - `js/dashboard.js` - Real-time stats overlay with sparklines
  - `js/timeline.js` - Event recorder with scrubber UI
  - `js/panels.js` - Side panels (left: active agents, right: history)
  - `js/main.js` - Entry point

## API Endpoints
- `POST /api/agents` - Create agent `{id, type, task, thoughts?, progress?}`
- `PUT /api/agents/:id` - Update agent `{status, task, thoughts, progress}`
- `DELETE /api/agents/:id` - Remove agent
- `DELETE /api/agents` - Remove every completed (status=done) agent; active agents are kept. Broadcasts `agent_remove` per cleared agent. (For nuclear "wipe everything" use the MCP `clear_world` tool.)
- `POST /api/agents/:id/thought` - Add thought `{text}`
- `GET /api/agents` - List all agents
- Valid statuses: `walking`, `working`, `thinking`, `done`, `idle`
- Progress: 0-100 (renders as HP-style bar on agent)

## Startup behavior
The world always starts **empty** — `data/agents.json` is truncated at boot and never auto-loaded. Real agents must register themselves fresh each session via REST or MCP. This avoids stale ghosts from prior runs. The `data/agents.json` and `data/events.jsonl` files still get written for the duration of the session and are useful for inspecting state, but are not authoritative across restarts.

## MCP Server (`/mcp`)
Streamable HTTP transport. Any MCP-aware agent can connect at `http://localhost:3333/mcp` and call these tools — they mutate the same shared agent store the REST API uses, so changes appear live in the browser.

**Tools:** `spawn_agent`, `update_agent`, `add_thought`, `complete_agent`, `remove_agent`, `clear_world`, `list_agents`
**Resource:** `world://agents` — JSON snapshot of every agent

Add to a Claude Code config: `claude mcp add --transport http agent-world http://localhost:3333/mcp`

## Agent Types -> Building Destinations
- `general-purpose` -> Code Lab (bottom-left)
- `Explore` -> Library (top-right)
- `Plan` -> Prof Lab (top-left)
- `test-runner` -> Battle Arena (bottom-right)
- All others -> Pokemon Center (center, default idle)

## Key Behaviors
- Agents spawn at the Pokemon Center and pathfind to their building
- While working/thinking, agents **pace back and forth** in front of their building
- When marked done, agents walk back to the Pokemon Center and **linger there indefinitely**. They do NOT auto-despawn — completed work waits for the user to acknowledge it.
- A done agent is dismissed in two ways: (a) click the agent and press the green pulsing **DISMISS ✓** button in the info panel, or (b) refresh the page — every fresh WebSocket connect purges all `done` agents server-side via `store.clearDone()` in `server.js`
- Test-runner agents can trigger a Pokemon battle scene (click on them or the Battle Arena)
- Professor Oak NPC wanders the town and narrates events with speech bubbles

## Controls
| Key | Action |
|-----|--------|
| D | Demo mode (5 agents with full lifecycle) |
| Click | Select agent / Click Pokemon Center for task log / Click Battle Arena |
| Tab/Shift+Tab | Cycle through agents |
| P | Pokedex (agent type registry) |
| B | Gym Badges (achievements) |
| F | Dashboard (real-time stats + sparklines) |
| T | Timeline (event scrubber) |
| 1 / 2 | Toggle left/right side panels |
| M | Mute sound + music |
| Space | Pause/unpause |
| R | Reset rendered agents locally (server state untouched) |
| Shift+R | **Clear Done** — remove every completed agent (active agents kept; same as the "CLEAR DONE ✓" button) |
| Esc | Close overlays |

## Claude Code Integration
A PostToolUse hook in `~/.claude/settings.json` auto-creates agents when subagents are spawned:
```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Agent",
      "hooks": [{
        "type": "command",
        "command": "/path/to/agent-world/hooks/agent-tracker.sh",
        "timeout": 5,
        "async": true
      }]
    }]
  }
}
```

## Running
```bash
npm install && npm start
# Open http://localhost:3333
# Press D for demo mode
```

## Key Conventions
- All sprites defined programmatically as pixel arrays (no external images)
- Native render resolution: 768x576 pixels (24x18 tiles at 32px), CSS-scaled with `image-rendering: pixelated`
- Use `nearest-neighbor` / `pixelated` everywhere to preserve pixel-art crispness
- A* pathfinding on the walkability grid for agent movement
- WebSocket messages are JSON: `{type: "agent_create"|"agent_update"|"agent_remove", data: {...}}`
- Day/night cycle: 60-second full cycle with dawn, day, dusk, night (lit windows)
- Weather system reacts to activity: cherry blossoms on completion, rain on errors, snow when idle
- Persistence: agents saved to `data/agents.json`, events appended to `data/events.jsonl`
- Badge/pokedex/history stats persisted to localStorage
