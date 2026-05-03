const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');
const store = require('./agent-store');
const { mountMcp } = require('./mcp-server');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json({ limit: '16kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Catch JSON parse errors - don't leak stack traces
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  next(err);
});

// Mirror every store change to all connected WebSocket clients.
function broadcast(message) {
  const data = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(data);
  });
}
store.onChange(broadcast);

// REST API — kept for backward compat with the bash hook and any existing curl users.

app.get('/api/agents', (req, res) => {
  res.json(store.list());
});

app.post('/api/agents', (req, res) => {
  try {
    const { id, type, task, thoughts, progress } = req.body;
    if (!id || !type) return res.status(400).json({ error: 'id and type required' });
    const { agent, isNew } = store.upsert({ id, type, task, thoughts, progress });
    res.status(isNew ? 201 : 200).json(agent);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/agents/:id', (req, res) => {
  try {
    const agent = store.update(req.params.id, req.body);
    res.json(agent);
  } catch (e) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ error: e.message });
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/agents/:id/thought', (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    const agent = store.addThought(req.params.id, text);
    res.json(agent);
  } catch (e) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ error: e.message });
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/agents/:id', (req, res) => {
  try {
    store.remove(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'NOT_FOUND') return res.status(404).json({ error: e.message });
    res.status(400).json({ error: e.message });
  }
});

// Wipe every agent + the event log. Used by the "Clear All" UI button.
app.delete('/api/agents', (req, res) => {
  const removed = store.clearAll();
  res.json({ ok: true, removed });
});

// WebSocket: push initial state, then forward all store changes.
// Each fresh connection (e.g. a browser page refresh) purges any 'done' agents
// first — completed work lingers visually but doesn't survive a page reload.
wss.on('connection', (ws) => {
  console.log('[ws] Client connected');
  store.clearDone();
  ws.send(JSON.stringify({ type: 'init', data: store.list() }));
  ws.on('close', () => console.log('[ws] Client disconnected'));
});

const PORT = process.env.PORT || 3333;

(async () => {
  try {
    await mountMcp(app);
  } catch (e) {
    console.error('[mcp] Failed to mount MCP server:', e.message);
    console.error('[mcp] REST API and WebSocket will still work. Run `npm install` if you have not.');
  }

  server.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════════╗
  ║   AGENT WORLD - Pokemon GBC Visualizer   ║
  ║                                          ║
  ║   Web:  http://localhost:${PORT}            ║
  ║   MCP:  http://localhost:${PORT}/mcp        ║
  ║   WS:   ws://localhost:${PORT}              ║
  ║                                          ║
  ║   REST: POST /api/agents                 ║
  ║         PUT  /api/agents/:id             ║
  ║         POST /api/agents/:id/thought     ║
  ║                                          ║
  ║   Press D in the app for demo mode       ║
  ╚══════════════════════════════════════════╝
  `);
  });
})();
