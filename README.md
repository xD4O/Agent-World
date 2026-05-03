# Agent World

A Pokemon Gameboy Color-style web application that visualizes Claude Code's agentic workflows in real-time. Watch your subagents come to life as pixel-art trainers navigating a charming tile-based town, pacing back and forth at their work stations, battling bugs, and earning gym badges.

```
  ╔══════════════════════════════════════╗
  ║       AGENT WORLD v2.0               ║
  ║   Pokemon GBC Claude Visualizer      ║
  ╚══════════════════════════════════════╝
```

## Features

### Core
- **Pixel-Art World** - A 2x-resolution tile-based Pokemon GBC town with 5 buildings, rendered at 768x576 native
- **Animated Agents** - Subagents appear as pixel-art trainers with 4-directional walking, pacing while working, and distinct color palettes per type
- **A\* Pathfinding** - Agents navigate the path network to reach their designated work areas
- **Real-Time Updates** - WebSocket pushes agent state changes instantly
- **Side Panels** - Left panel shows all active agents with status/progress bars; right panel shows event history
- **Persistent State** - Agent data saved to disk, history/stats saved to localStorage

### Pokemon Features
- **Professor Oak NPC** - Wanders the town narrating agent events in speech bubbles
- **Battle Scenes** - Click a working test-runner agent to trigger a Pokemon battle vs bugs, with HP bars and attack animations
- **Gym Badges** - 8 achievements earned for milestones (first spawn, 10 tasks, 5 concurrent agents, etc.)
- **Pokedex** - Registry of all agent types encountered with stats (seen, completed, avg time)
- **Chiptune Music** - Procedural 4-channel background music that speeds up with more active agents
- **Sound Effects** - Spawn jingles, victory fanfares, select clicks, typewriter ticks

### Visual Effects
- **Day/Night Cycle** - 60-second cycle: dawn (pink) → day → dusk (orange) → night (blue with lit windows)
- **Weather System** - Cherry blossoms on task completion, rain on errors, snow when idle, thunderstorms on failures
- **Particles** - Spawn bursts, done sparkles, work flashes, despawn dissolve effects
- **Status Emotes** - Pokemon-style floating bubbles: `!` (working), `...` (thinking), `✓` (done), `Zzz` (idle)
- **HP Progress Bars** - Pokemon-style bars under agents showing task completion percentage
- **Thought Bubbles** - Floating speech showing what each agent is thinking about

### Data & Analytics
- **Dashboard** - Real-time stats overlay with sparkline graphs and activity bars (press `F`)
- **Timeline** - Event recorder with color-coded scrubber track (press `T`)
- **Pokemon Center Log** - Click the Pokemon Center to see all completed tasks

## Agent Types & Buildings

| Agent Type | Building | Color | Purpose |
|---|---|---|---|
| `Plan` | Prof's Lab (blue roof) | Green | Architecture & planning |
| `Explore` | Library (brown roof) | Blue | Codebase research |
| `general-purpose` | Code Lab (purple roof) | Red | Writing code |
| `test-runner` | Battle Arena (orange roof) | Orange | Running tests |
| `claude-code-guide` | Code Lab (purple roof) | Pink | Documentation |

## Quick Start

```bash
cd agent-world
npm install
npm start
# Open http://localhost:3333
```

Press **D** in the browser to launch a full demo with 5 agents, status updates, progress bars, and a battle scene.

> **The world always starts empty.** `data/agents.json` is wiped at boot and never auto-loaded — only real agents that connect via REST or MCP appear in the world. To wipe a running session use the **CLEAR ALL** button (or **Shift+R**), which also clears the persistent event history.

## Controls

| Key | Action |
|---|---|
| `D` | Launch demo (5 agents with full lifecycle) |
| `Click` | Select agent / Pokemon Center for task log / Battle Arena |
| `Tab` / `Shift+Tab` | Cycle through agents |
| `P` | Pokedex (agent type registry) |
| `B` | Gym Badges (achievements) |
| `F` | Dashboard (real-time stats + sparklines) |
| `T` | Timeline (event scrubber) |
| `1` / `2` | Toggle left / right side panels |
| `M` | Mute sound + music |
| `Space` | Pause / unpause |
| `R` | Reset rendered agents locally (server state untouched) |
| `Shift+R` | **Clear All** — wipe server agents + history, reload the page |
| `Esc` | Close overlays |
| `Arrow Keys` | Scrub timeline (when open) |
| `Up/Down` | Navigate Pokedex entries (when open) |

## Claude Code Integration

### Automatic Hook (Recommended)

Add to `~/.claude/settings.json` to automatically track all subagent spawns:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Agent",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/agent-world/hooks/agent-tracker.sh",
            "timeout": 5,
            "async": true
          }
        ]
      }
    ]
  }
}
```

Every time Claude Code spawns a subagent, it will automatically appear in Agent World.

### MCP Server (Recommended for any agent)

Agent World ships with a built-in MCP (Model Context Protocol) server, mounted at `/mcp` on the same port. Any MCP-aware agent — Claude Code, Claude Desktop, custom SDK clients, third-party agents — can connect and have its work visualized live.

Add to your Claude Code or Claude Desktop config:

```json
{
  "mcpServers": {
    "agent-world": {
      "url": "http://localhost:3333/mcp"
    }
  }
}
```

In Claude Code you can also wire it via CLI:

```bash
claude mcp add --transport http agent-world http://localhost:3333/mcp
```

Multiple agents can connect to the same server simultaneously — every connection sees the same shared world. Each tool call mutates the shared agent store and broadcasts to the browser over WebSocket.

#### MCP Tools

| Tool | Purpose |
|---|---|
| `spawn_agent` | Create a trainer in the world. Args: `id`, `type`, `task`, optional `thoughts`, `progress`. |
| `update_agent` | Update status / task / thoughts / progress / type. |
| `add_thought` | Display a thought bubble (sets status to `thinking`). |
| `complete_agent` | Mark done — trainer walks back to Pokemon Center with celebration. |
| `remove_agent` | Despawn entirely (use sparingly; prefer `complete_agent`). |
| `clear_world` | Wipe every agent and reset the event log. Destructive. |
| `list_agents` | List all agents currently in the world. |

#### MCP Resource

| URI | Description |
|---|---|
| `world://agents` | JSON snapshot of every agent in the world. |

#### Try it from Claude

Once connected, ask Claude something like _"spawn a Plan agent named 'design-cache-layer' working on cache architecture"_ and watch the trainer appear at the Prof Lab.

### REST API

Create an agent:
```bash
curl -X POST http://localhost:3333/api/agents \
  -H "Content-Type: application/json" \
  -d '{"id": "my-agent", "type": "Explore", "task": "Finding all API endpoints"}'
```

Update with progress:
```bash
curl -X PUT http://localhost:3333/api/agents/my-agent \
  -H "Content-Type: application/json" \
  -d '{"status": "working", "progress": 50, "thoughts": "Found 12 endpoints"}'
```

Add a thought:
```bash
curl -X POST http://localhost:3333/api/agents/my-agent/thought \
  -H "Content-Type: application/json" \
  -d '{"text": "Analyzing route handlers..."}'
```

Mark as done:
```bash
curl -X PUT http://localhost:3333/api/agents/my-agent \
  -H "Content-Type: application/json" \
  -d '{"status": "done", "progress": 100, "thoughts": "Task complete!"}'
```

Remove:
```bash
curl -X DELETE http://localhost:3333/api/agents/my-agent
```

### API Reference

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `GET` | `/api/agents` | - | List all agents |
| `POST` | `/api/agents` | `{id, type, task, thoughts?, progress?}` | Create agent |
| `PUT` | `/api/agents/:id` | `{status?, task?, thoughts?, progress?, type?}` | Update agent |
| `POST` | `/api/agents/:id/thought` | `{text}` | Add thought (sets status to thinking) |
| `DELETE` | `/api/agents/:id` | - | Remove agent |
| `DELETE` | `/api/agents` | - | Wipe every agent and clear the event log |

**Valid statuses:** `walking`, `working`, `thinking`, `done`, `idle`
**Progress:** `0-100` (renders as HP-style bar)

## Architecture

```
agent-world/
├── server.js              # Express + WebSocket + JSON persistence + mounts MCP
├── agent-store.js         # Shared in-memory agent store (single source of truth)
├── mcp-server.js          # MCP Streamable HTTP server (tools + resources)
├── data/
│   ├── agents.json        # Persisted agent state
│   └── events.jsonl       # Append-only event log
├── hooks/
│   └── agent-tracker.sh   # Claude Code PostToolUse hook
├── public/
│   ├── index.html         # 3-column layout (panels + game)
│   ├── style.css          # GBC aesthetic + side panel styling
│   └── js/
│       ├── main.js        # Entry point
│       ├── engine.js      # Game loop, rendering, integrates all systems
│       ├── world.js       # Tiles, map, sprites, palettes, A* pathfinding
│       ├── agents.js      # Agent entities with pacing behavior
│       ├── dialog.js      # Pokemon dialog boxes + thought bubbles
│       ├── socket.js      # WebSocket client
│       ├── panels.js      # Side panels (active agents + history)
│       ├── particles.js   # Spawn/done/work/despawn particle effects
│       ├── sound.js       # Chiptune sound effects (Web Audio)
│       ├── music.js       # Procedural 4-channel background music
│       ├── weather.js     # Rain, snow, storm, cherry blossoms, sun
│       ├── professor.js   # Professor Oak NPC narrator
│       ├── battle.js      # Pokemon battle scene system
│       ├── badges.js      # 8 gym badge achievements
│       ├── pokedex.js     # Agent type registry + stats
│       ├── dashboard.js   # Real-time stats with sparklines
│       └── timeline.js    # Event recorder with scrubber
└── package.json
```

**17 JS modules, ~5000 lines, zero build step, all pixel art procedural.**

All sprites are defined programmatically as pixel arrays - no external image assets needed. The canvas renders at 768x576 native (2x GBC resolution) and CSS scales with `image-rendering: pixelated` for crisp pixels.
