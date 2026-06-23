/* ============================================================
   home.js — Homepage: load quizzes dynamically
   Quiz-only version
   ============================================================ */

(async function () {
  const quizzesGrid = document.getElementById('quizzesGrid');
  if (!quizzesGrid) return;

  /* ---------- Load quizzes from JSON ---------- */
  try {
    const quizzes = await App.loadJSON('data/quizzes.json');

    // Update hero stats
    const statQuizzes = document.getElementById('statQuizzes');
    if (statQuizzes) statQuizzes.textContent = quizzes.length;

    const totalQuestions = quizzes.reduce((sum, q) => sum + (q.questions || 0), 0);
    const statQuestions = document.getElementById('statQuestions');
    if (statQuestions) statQuestions.textContent = totalQuestions;

    // Render cards
    if (quizzes.length > 0) {
      quizzesGrid.innerHTML = quizzes.map(App.quizCardHTML).join('');
    } else {
      quizzesGrid.innerHTML = `
        <div class="empty-state">
          <p>📭 No quizzes available yet.</p>
          <p style="font-size:13px">Add quiz JSON files to <code>data/quizzes.json</code> to get started.</p>
        </div>`;
    }
  } catch (err) {
    console.error('Failed to load quizzes:', err);
    quizzesGrid.innerHTML = `
      <div class="empty-state">
        <p>⚠️ Could not load quizzes.</p>
        <p style="font-size:13px">Make sure <code>data/quizzes.json</code> exists and is valid JSON.</p>
      </div>`;
  }

  /* ---------- Filter bar ---------- */
  App.initFilterBar('quizFilterBar', 'quizzesGrid');

  /* ---------- Nav chip shortcuts ---------- */
  document.querySelectorAll('.nav-links a[data-filter]').forEach(link => {
    link.addEventListener('click', () => {
      const filter = link.dataset.filter;
      setTimeout(() => {
        const bar = document.getElementById('quizFilterBar');
        if (!bar) return;
        bar.querySelectorAll('.chip').forEach(c => {
          c.classList.toggle('active', c.dataset.filter === filter);
        });
        App.applyFilter('quizzesGrid', filter);
      }, 100);
    });
  });

  /* ---------- Footer category links ---------- */
  // These use inline onclick="App.applyFilter(...)" from the HTML,
  // so we just need to make sure the filter bar chip syncs.
  document.querySelectorAll('.footer a[onclick]').forEach(link => {
    link.addEventListener('click', () => {
      setTimeout(() => {
        const cat = link.getAttribute('onclick').match(/'([^']+)'\)$/)?.[1];
        if (!cat) return;
        const bar = document.getElementById('quizFilterBar');
        if (bar) {
          bar.querySelectorAll('.chip').forEach(c => {
            c.classList.toggle('active', c.dataset.filter === cat);
          });
        }
      }, 50);
    });
  });
})();
