// ============================================================
// PANELS.JS - Side panels for active agents and history
// Left panel: live agent list with status/task/progress
// Right panel: event history log
// ============================================================

const STATUS_COLORS = {
  walking: '#d0a030', working: '#40c040', thinking: '#5080e0',
  done: '#808080', idle: '#c060c0',
};

const PROGRESS_COLORS = {
  high: '#40c040', mid: '#e0c020', low: '#e04040',
};

export class PanelManager {
  constructor() {
    this.leftPanel = document.getElementById('left-panel');
    this.rightPanel = document.getElementById('right-panel');
    this.agentList = document.getElementById('agent-list');
    this.historyList = document.getElementById('history-list');

    this.leftCollapsed = false;
    this.rightCollapsed = false;
    this.history = [];
    this.maxHistory = 200;

    this.selectedAgentId = null;
    this.onAgentClick = null; // callback

    this.setupToggles();
    this.loadHistory();
  }

  setupToggles() {
    document.getElementById('left-toggle').addEventListener('click', () => {
      this.leftCollapsed = !this.leftCollapsed;
      this.leftPanel.classList.toggle('collapsed', this.leftCollapsed);
      const arrow = this.leftPanel.querySelector('.panel-arrow');
      arrow.textContent = this.leftCollapsed ? '▶' : '◀';
    });

    document.getElementById('right-toggle').addEventListener('click', () => {
      this.rightCollapsed = !this.rightCollapsed;
      this.rightPanel.classList.toggle('collapsed', this.rightCollapsed);
      const arrow = this.rightPanel.querySelector('.panel-arrow');
      arrow.textContent = this.rightCollapsed ? '◀' : '▶';
    });
  }

  toggleLeft() {
    document.getElementById('left-toggle').click();
  }

  toggleRight() {
    document.getElementById('right-toggle').click();
  }

  // === Agent List (Left Panel) ===

  updateAgentList(agents, selectedId) {
    this.selectedAgentId = selectedId;
    const agentArray = [...agents.values()].sort((a, b) => {
      // Sort: working/thinking first, then walking, then done
      const order = { working: 0, thinking: 1, walking: 2, idle: 3, done: 4 };
      return (order[a.status] ?? 3) - (order[b.status] ?? 3);
    });

    // Build HTML efficiently
    let html = '';
    if (agentArray.length === 0) {
      html = '<div style="padding:20px;text-align:center;color:#444;font-size:11px;">No agents active.<br>Press [D] for demo<br>or send agents via API.</div>';
    }

    for (const agent of agentArray) {
      const selected = agent.id === selectedId ? ' selected' : '';
      const progressPct = agent.progress || 0;
      const progressColor = progressPct > 50 ? PROGRESS_COLORS.high :
                            progressPct > 20 ? PROGRESS_COLORS.mid : PROGRESS_COLORS.low;
      const showProgress = progressPct > 0 && agent.status !== 'done';

      html += `
        <div class="agent-item${selected}" data-agent-id="${this.escapeHtml(agent.id)}">
          <div class="agent-name">${this.escapeHtml(agent.shortId || agent.id)}</div>
          <div class="agent-type">${this.escapeHtml(agent.type)}</div>
          <div class="agent-task">${this.escapeHtml(agent.task || 'No task')}</div>
          ${agent.thoughts ? `<div class="agent-thoughts">"${this.escapeHtml(agent.thoughts)}"</div>` : ''}
          <span class="agent-status ${agent.status}">${agent.status}${progressPct > 0 ? ` ${progressPct}%` : ''}</span>
          ${showProgress ? `
            <div class="agent-progress">
              <div class="agent-progress-fill" style="width:${progressPct}%;background:${progressColor}"></div>
            </div>
          ` : ''}
        </div>
      `;
    }

    this.agentList.innerHTML = html;

    // Attach click handlers
    for (const item of this.agentList.querySelectorAll('.agent-item')) {
      item.addEventListener('click', () => {
        const id = item.dataset.agentId;
        if (this.onAgentClick) this.onAgentClick(id);
      });
    }
  }

  // === History (Right Panel) ===

  addHistory(eventType, data) {
    const entry = {
      type: eventType,
      id: data?.id || data?.shortId || '?',
      detail: this.getHistoryDetail(eventType, data),
      time: new Date(),
    };

    this.history.unshift(entry);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }

    this.renderHistory();
    this.saveHistory();
  }

  getHistoryDetail(type, data) {
    switch (type) {
      case 'spawn': return `${data?.type || '?'}: ${(data?.task || '').slice(0, 60)}`;
      case 'done': return data?.thoughts || data?.task || 'Task complete';
      case 'remove': return 'Agent removed';
      case 'update': return `Status: ${data?.status || '?'}`;
      case 'thought': return `"${(data?.thoughts || data?.text || '').slice(0, 60)}"`;
      case 'battle': return data?.result || 'Battle started';
      case 'badge': return data?.name || 'Badge earned';
      default: return '';
    }
  }

  renderHistory() {
    if (this.rightCollapsed) return;

    let html = '';
    if (this.history.length === 0) {
      html = '<div style="padding:20px;text-align:center;color:#444;font-size:11px;">No history yet.</div>';
    }

    for (const entry of this.history.slice(0, 100)) {
      const timeStr = this.formatTime(entry.time);
      html += `
        <div class="history-item">
          <span class="history-time">${timeStr}</span>
          <span class="history-event ${entry.type}">${entry.type.toUpperCase()}</span>
          <span style="color:#aaa"> ${this.escapeHtml(entry.id)}</span>
          <div class="history-detail">${this.escapeHtml(entry.detail)}</div>
        </div>
      `;
    }

    this.historyList.innerHTML = html;
  }

  formatTime(date) {
    if (typeof date === 'string') date = new Date(date);
    const now = new Date();
    const diffMs = now - date;
    if (diffMs < 60000) return `${Math.floor(diffMs / 1000)}s ago`;
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Persistence
  saveHistory() {
    try {
      const slim = this.history.slice(0, 100).map(h => ({
        type: h.type, id: h.id, detail: h.detail, time: h.time.toISOString(),
      }));
      localStorage.setItem('agent-world-history', JSON.stringify(slim));
    } catch (e) { /* ignore */ }
  }

  loadHistory() {
    try {
      const saved = localStorage.getItem('agent-world-history');
      if (saved) {
        const data = JSON.parse(saved);
        this.history = data.map(h => ({ ...h, time: new Date(h.time) }));
        this.renderHistory();
      }
    } catch (e) { /* ignore */ }
  }

  clearHistory() {
    this.history = [];
    this.renderHistory();
    localStorage.removeItem('agent-world-history');
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
