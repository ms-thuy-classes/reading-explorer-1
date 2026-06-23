/* ============================================================
   app.js — Shared utilities: theme, search, dashboard, nav
   Quiz-only version — no article logic
   ============================================================ */

const App = (() => {
  const STORAGE_KEY = 'msthuylms_v1';

  /* ---------- Theme ---------- */
  function initTheme() {
    const saved = localStorage.getItem('theme') || 'light';
    document.body.classList.toggle('dark', saved === 'dark');
    document.body.classList.toggle('light', saved !== 'dark');
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = saved === 'dark' ? '☀️' : '🌙';
    btn?.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark');
      document.body.classList.toggle('light', !isDark);
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      btn.textContent = isDark ? '☀️' : '🌙';
    });
  }

  /* ---------- Mobile menu ---------- */
  function initMenu() {
    const toggle = document.getElementById('menuToggle');
    const links = document.getElementById('navLinks');
    if (!toggle || !links) return;
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => links.classList.remove('open'))
    );
  }

  /* ---------- Storage helpers ---------- */
  function getStore() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultStore();
    } catch {
      return defaultStore();
    }
  }

  function defaultStore() {
    return {
      completed: [],
      bestScore: 0,
      totalScore: 0,
      totalQuizzes: 0,
      lastActive: null,
      streak: 0
    };
  }

  function saveStore(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function recordQuizResult(quizId, score, total) {
    const store = getStore();
    const percent = total > 0 ? Math.round((score / total) * 100) : 0;

    const existing = store.completed.find(c => c.id === quizId);
    if (existing) {
      if (percent > existing.percent) {
        existing.percent = percent;
        existing.date = new Date().toISOString();
      }
    } else {
      store.completed.push({ id: quizId, percent, date: new Date().toISOString() });
    }

    if (percent > store.bestScore) store.bestScore = percent;
    store.totalScore += percent;
    store.totalQuizzes += 1;

    // streak calculation
    const today = new Date().toDateString();
    const last = store.lastActive ? new Date(store.lastActive).toDateString() : null;
    if (last !== today) store.streak = (store.streak || 0) + 1;
    store.lastActive = new Date().toISOString();

    saveStore(store);
    return percent;
  }

  function getQuizResult(quizId) {
    const store = getStore();
    return store.completed.find(c => c.id === quizId);
  }

  function getStats() {
    const store = getStore();
    const avg = store.totalQuizzes > 0 ? Math.round(store.totalScore / store.totalQuizzes) : 0;
    return {
      completedCount: store.completed.length,
      bestScore: store.bestScore,
      avgScore: avg,
      streak: store.streak || 0
    };
  }

  /* ---------- Dashboard ---------- */
  function renderDashboard() {
    const stats = getStats();
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set('bestScore', stats.bestScore + '%');
    set('avgScore', stats.avgScore + '%');
    set('completedCount', stats.completedCount);
    set('streak', stats.streak + ' days');
    set('statCompleted', stats.completedCount);
  }

  /* ---------- JSON loader ---------- */
  async function loadJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path} (${res.status})`);
    return res.json();
  }

  /* ---------- URL params ---------- */
  function getParam(name) {
    return new URL(window.location.href).searchParams.get(name);
  }

  /* ---------- Quiz card HTML ---------- */
  function quizCardHTML(q) {
    const store = getStore();
    const result = store.completed.find(c => c.id === q.id);
    const badge = result
      ? `<span class="card-badge-success">✅ Best: ${result.percent}%</span>`
      : `<span class="card-badge-new">🆕 New</span>`;

    const thumbBg = q.thumbnail
      ? `<img class="card-thumb" src="${escapeHtml(q.thumbnail)}" alt="${escapeHtml(q.title)}" onerror="this.outerHTML='<div class=\\'card-thumb\\'></div>'">`
      : `<div class="card-thumb"></div>`;

    return `
      <article class="card" data-category="${escapeHtml(q.category || '')}">
        ${thumbBg}
        <div class="card-body">
          <div class="card-top-row">
            <span class="card-category">${escapeHtml(q.category || 'Quiz')}</span>
            ${badge}
          </div>
          <h3 class="card-title">${escapeHtml(q.title)}</h3>
          <div class="card-meta">
            <span>📝 ${q.questions || 0} questions</span>
            <span>⏱ ${q.duration || 0} min</span>
          </div>
          <a class="btn btn-primary" href="quiz.html?id=${encodeURIComponent(q.id)}">
            Start Test →
          </a>
        </div>
      </article>`;
  }

  /* ---------- Filter logic ---------- */
  function applyFilter(gridId, filter) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    const cards = grid.querySelectorAll('.card');
    let visible = 0;
    cards.forEach(card => {
      const cat = card.dataset.category || '';
      const match = filter === 'All' || cat === filter;
      card.style.display = match ? '' : 'none';
      if (match) visible++;
    });

    let empty = grid.querySelector('.empty-state');
    if (visible === 0) {
      if (!empty) {
        empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = `<p>😕 No quizzes found in this category.</p>
          <p style="font-size:13px">Try selecting "All" to see everything.</p>`;
        grid.appendChild(empty);
      }
    } else if (empty) {
      empty.remove();
    }
  }

  function initFilterBar(barId, gridId) {
    const bar = document.getElementById(barId);
    if (!bar) return;
    bar.addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      bar.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      applyFilter(gridId, chip.dataset.filter);
    });
  }

  /* ---------- Search ---------- */
  function initGlobalSearch() {
    const input = document.getElementById('globalSearch');
    if (!input) return;
    let debounce;
    input.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        const q = input.value.trim().toLowerCase();
        document.querySelectorAll('#quizzesGrid .card').forEach(card => {
          const text = card.textContent.toLowerCase();
          card.style.display = !q || text.includes(q) ? '' : 'none';
        });
      }, 150);
    });
  }

  /* ---------- Utils ---------- */
  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric'
      });
    } catch { return iso; }
  }

  /* ---------- Boot ---------- */
  function init() {
    initTheme();
    initMenu();
    renderDashboard();
    initGlobalSearch();
  }

  document.addEventListener('DOMContentLoaded', init);

  return {
    loadJSON,
    getParam,
    escapeHtml,
    formatDate,
    quizCardHTML,
    applyFilter,
    initFilterBar,
    recordQuizResult,
    getQuizResult,
    getStats,
    getStore,
    renderDashboard
  };
})();
