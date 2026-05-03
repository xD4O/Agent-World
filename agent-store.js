const path = require('path');
const fs = require('fs');

const DATA_FILE = path.join(__dirname, 'data', 'agents.json');
const EVENT_LOG = path.join(__dirname, 'data', 'events.jsonl');

const VALID_STATUSES = new Set(['walking', 'working', 'thinking', 'done', 'idle']);
const KNOWN_TYPES = ['general-purpose', 'Explore', 'Plan', 'test-runner'];

const agents = new Map();
const listeners = new Set();

fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

// Always start with an empty world. Agents must register themselves fresh each
// run via REST or MCP — no stale ghosts from prior sessions.
try {
  fs.writeFileSync(DATA_FILE, '[]');
} catch (e) { /* ignore */ }
console.log('[db] Starting with empty world (persisted agents are not auto-loaded)');

function persist() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify([...agents.values()], null, 2));
  } catch (e) {
    console.warn('[db] Failed to persist:', e.message);
  }
}

function logEvent(type, data) {
  try {
    fs.appendFileSync(EVENT_LOG, JSON.stringify({ type, data, time: Date.now() }) + '\n');
  } catch (e) { /* ignore */ }
}

function emit(message) {
  for (const fn of listeners) {
    try { fn(message); } catch (e) { /* ignore */ }
  }
}

function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function list() {
  return [...agents.values()];
}

function get(id) {
  return agents.get(id);
}

function notFound(id) {
  return Object.assign(new Error(`Agent not found: ${id}`), { code: 'NOT_FOUND' });
}

function upsert({ id, type, task, thoughts, progress }) {
  if (!id) throw new Error('id is required');
  const isNew = !agents.has(id);
  const existing = agents.get(id) || {};
  const agent = {
    id,
    type: type || existing.type || 'general-purpose',
    task: task || existing.task || 'Initializing...',
    thoughts: thoughts !== undefined ? thoughts : (existing.thoughts || ''),
    progress: progress !== undefined ? Math.max(0, Math.min(100, progress)) : (existing.progress || 0),
    status: existing.status || 'walking',
    createdAt: existing.createdAt || Date.now(),
    updatedAt: Date.now(),
  };
  agents.set(id, agent);
  emit({ type: isNew ? 'agent_create' : 'agent_update', data: agent });
  logEvent(isNew ? 'spawn' : 'update', agent);
  persist();
  console.log(`[${isNew ? '+' : '~'}] Agent ${isNew ? 'created' : 'updated'}: ${id} (${agent.type}) - ${agent.task}`);
  return { agent, isNew };
}

function update(id, patch) {
  const agent = agents.get(id);
  if (!agent) throw notFound(id);

  if (patch.status !== undefined) {
    if (!VALID_STATUSES.has(patch.status)) {
      throw new Error(`Invalid status. Must be one of: ${[...VALID_STATUSES].join(', ')}`);
    }
    agent.status = patch.status;
  }
  if (patch.task !== undefined && patch.task) agent.task = patch.task;
  if (patch.thoughts !== undefined) agent.thoughts = patch.thoughts;
  if (patch.progress !== undefined) agent.progress = Math.max(0, Math.min(100, patch.progress));
  if (patch.type !== undefined && patch.type) agent.type = patch.type;
  agent.updatedAt = Date.now();

  agents.set(id, agent);
  emit({ type: 'agent_update', data: agent });
  logEvent('update', agent);
  persist();
  console.log(`[~] Agent updated: ${id} - ${agent.status}`);
  return agent;
}

function addThought(id, text) {
  const agent = agents.get(id);
  if (!agent) throw notFound(id);
  if (!text) throw new Error('text required');
  agent.thoughts = text;
  agent.status = 'thinking';
  agent.updatedAt = Date.now();
  agents.set(id, agent);
  emit({ type: 'agent_update', data: agent });
  logEvent('thought', { id, text });
  persist();
  console.log(`[?] Agent thinking: ${id} - ${text.slice(0, 50)}`);
  return agent;
}

function remove(id) {
  if (!agents.has(id)) throw notFound(id);
  logEvent('remove', { id });
  agents.delete(id);
  persist();
  emit({ type: 'agent_remove', data: { id } });
  console.log(`[-] Agent removed: ${id}`);
}

function clearAll() {
  const count = agents.size;
  agents.clear();
  try { fs.writeFileSync(DATA_FILE, '[]'); } catch (e) { /* ignore */ }
  try { fs.writeFileSync(EVENT_LOG, ''); } catch (e) { /* ignore */ }
  emit({ type: 'world_clear', data: {} });
  console.log(`[!] World cleared (removed ${count} agents, truncated event log)`);
  return count;
}

module.exports = {
  list,
  get,
  upsert,
  update,
  addThought,
  remove,
  clearAll,
  onChange,
  VALID_STATUSES,
  KNOWN_TYPES,
};
