const { randomUUID } = require('node:crypto');
const store = require('./agent-store');

// MCP SDK is ESM-only; load via dynamic import so this CJS project stays untouched.
async function loadSdk() {
  const [{ McpServer }, { StreamableHTTPServerTransport }, types, zod] = await Promise.all([
    import('@modelcontextprotocol/sdk/server/mcp.js'),
    import('@modelcontextprotocol/sdk/server/streamableHttp.js'),
    import('@modelcontextprotocol/sdk/types.js'),
    import('zod'),
  ]);
  return {
    McpServer,
    StreamableHTTPServerTransport,
    isInitializeRequest: types.isInitializeRequest,
    z: zod.z || zod.default || zod,
  };
}

function ok(text) {
  return { content: [{ type: 'text', text }] };
}

function jsonOk(obj) {
  return { content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] };
}

function err(message) {
  return { isError: true, content: [{ type: 'text', text: `Error: ${message}` }] };
}

function buildServer(sdk) {
  const { McpServer, z } = sdk;
  const server = new McpServer({
    name: 'agent-world',
    version: '1.0.0',
  });

  const TYPE_DESCRIPTIONS = [
    '"general-purpose" → walks to the Code Lab (bottom-left)',
    '"Explore" → walks to the Library (top-right)',
    '"Plan" → walks to the Prof Lab (top-left)',
    '"test-runner" → walks to the Battle Arena (bottom-right)',
    'any other value → idles near the Pokemon Center',
  ].join('; ');

  server.tool(
    'spawn_agent',
    'Spawn a pixel-art trainer in the Agent World visualization (http://localhost:3333) ' +
    'to make your work visible. The trainer appears at the Pokemon Center and walks to a ' +
    'building based on type. Calling with an existing id updates that agent instead. ' +
    `Type routing: ${TYPE_DESCRIPTIONS}.`,
    {
      id: z.string().describe('Unique short slug for this agent, e.g. "fix-auth-bug" or "research-q3-metrics".'),
      type: z.string().describe('Agent type, controls which building the trainer walks to. Use one of: general-purpose, Explore, Plan, test-runner.'),
      task: z.string().describe('Short label of what this agent is doing (one line, shown under the trainer).'),
      thoughts: z.string().optional().describe('Optional initial thought bubble text (under ~80 chars).'),
      progress: z.number().min(0).max(100).optional().describe('Progress 0-100, rendered as an HP-style bar over the trainer.'),
    },
    async ({ id, type, task, thoughts, progress }) => {
      try {
        const { agent, isNew } = store.upsert({ id, type, task, thoughts, progress });
        return ok(`${isNew ? 'Spawned' : 'Updated'} agent "${id}" (${agent.type}) — ${agent.task}`);
      } catch (e) {
        return err(e.message);
      }
    }
  );

  server.tool(
    'update_agent',
    'Update an existing agent\'s status, task, thought bubble, or progress bar. ' +
    'Use this to reflect what you are doing as you work. Status values: walking (en route), ' +
    'working (default while at building), thinking (shows thought bubble), done (returns to ' +
    'Pokemon Center with celebration), idle (paces near center).',
    {
      id: z.string().describe('Id of the agent to update.'),
      status: z.enum(['walking', 'working', 'thinking', 'done', 'idle']).optional().describe('New status.'),
      task: z.string().optional().describe('New task label.'),
      thoughts: z.string().optional().describe('New thought bubble text.'),
      progress: z.number().min(0).max(100).optional().describe('Progress 0-100.'),
      type: z.string().optional().describe('New type (changes destination building).'),
    },
    async ({ id, ...patch }) => {
      try {
        const agent = store.update(id, patch);
        return ok(`Updated agent "${id}" — status=${agent.status}, progress=${agent.progress}`);
      } catch (e) {
        return err(e.message);
      }
    }
  );

  server.tool(
    'add_thought',
    'Show a Pokemon-style thought bubble above an agent. Sets status to "thinking" and ' +
    'displays the text. Keep it short (under ~80 chars) for best display. Useful for ' +
    'narrating decisions, current focus, or surprises mid-task.',
    {
      id: z.string().describe('Id of the agent.'),
      text: z.string().describe('Thought bubble text.'),
    },
    async ({ id, text }) => {
      try {
        store.addThought(id, text);
        return ok(`Agent "${id}" is thinking: ${text}`);
      } catch (e) {
        return err(e.message);
      }
    }
  );

  server.tool(
    'complete_agent',
    'Mark an agent as done. The trainer walks back to the Pokemon Center and triggers a ' +
    'celebration sparkle. Optionally include a final thought to display along the way. ' +
    'Call this when your task finishes successfully.',
    {
      id: z.string().describe('Id of the agent to complete.'),
      final_thought: z.string().optional().describe('Optional last thought bubble before walking home.'),
    },
    async ({ id, final_thought }) => {
      try {
        const patch = { status: 'done', progress: 100 };
        if (final_thought) patch.thoughts = final_thought;
        const agent = store.update(id, patch);
        return ok(`Agent "${id}" completed and is heading home.${final_thought ? ` (thought: ${final_thought})` : ''}`);
      } catch (e) {
        return err(e.message);
      }
    }
  );

  server.tool(
    'remove_agent',
    'Remove an agent from the world entirely (the trainer dissolves with a particle effect). ' +
    'Prefer complete_agent for normal task completion — use remove_agent for cancelled or ' +
    'aborted work that should not stick around.',
    {
      id: z.string().describe('Id of the agent to remove.'),
    },
    async ({ id }) => {
      try {
        store.remove(id);
        return ok(`Removed agent "${id}".`);
      } catch (e) {
        return err(e.message);
      }
    }
  );

  server.tool(
    'clear_world',
    'Wipe every agent from the visualization and clear the event history. Destructive — ' +
    'use only when you genuinely want a clean slate (e.g. starting a fresh demo). Browsers ' +
    'connected to the world will see all trainers vanish and their history panel reset.',
    {},
    async () => {
      const removed = store.clearAll();
      return ok(`Cleared world: removed ${removed} agent${removed === 1 ? '' : 's'} and reset event log.`);
    }
  );

  server.tool(
    'list_agents',
    'List all agents currently in the Agent World, including their status, task, type, ' +
    'progress, and timestamps. Useful for checking what other connected agents are doing ' +
    'or recovering ids of your own past spawns.',
    {},
    async () => {
      const agents = store.list();
      return jsonOk({ count: agents.length, agents });
    }
  );

  // Resource: current world state, addressable as a URI.
  server.resource(
    'world-state',
    'world://agents',
    {
      title: 'Agent World — Current State',
      description: 'Live snapshot of every agent in the visualization.',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(store.list(), null, 2),
      }],
    })
  );

  return server;
}

async function mountMcp(app) {
  const sdk = await loadSdk();
  const { StreamableHTTPServerTransport, isInitializeRequest } = sdk;

  // Per-session transport+server. All sessions share the same agent store.
  const transports = Object.create(null);

  app.post('/mcp', async (req, res) => {
    try {
      const sessionId = req.headers['mcp-session-id'];
      let transport;

      if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
      } else if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            transports[sid] = transport;
            console.log(`[mcp] session opened: ${sid}`);
          },
        });
        transport.onclose = () => {
          if (transport.sessionId) {
            delete transports[transport.sessionId];
            console.log(`[mcp] session closed: ${transport.sessionId}`);
          }
        };
        const server = buildServer(sdk);
        await server.connect(transport);
      } else {
        res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Bad Request: missing or unknown session id' },
          id: null,
        });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    } catch (e) {
      console.error('[mcp] POST error:', e);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal error' },
          id: null,
        });
      }
    }
  });

  // GET = SSE stream of server-initiated notifications, DELETE = terminate session.
  const handleSessionRequest = async (req, res) => {
    const sessionId = req.headers['mcp-session-id'];
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session id');
      return;
    }
    try {
      await transports[sessionId].handleRequest(req, res);
    } catch (e) {
      console.error('[mcp] session error:', e);
      if (!res.headersSent) res.status(500).send('Internal error');
    }
  };

  app.get('/mcp', handleSessionRequest);
  app.delete('/mcp', handleSessionRequest);

  console.log('[mcp] Streamable HTTP transport mounted at /mcp');
}

module.exports = { mountMcp };
