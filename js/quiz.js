/* ============================================================
   quiz.js — Quiz page: PDF viewer + answer sheet + results
   ============================================================ */

(async function () {
  const id = App.getParam('id');
  if (!id) { alert('Quiz not found'); window.location.href = 'index.html'; return; }

  let quiz;
  try {
    quiz = await App.loadJSON(`data/quiz/${id}.json`);
  } catch {
    alert('Could not load quiz.');
    window.location.href = 'index.html';
    return;
  }

  document.title = `${quiz.title} — Learn with Ms. Thúy`;
  document.getElementById('quizTitle').textContent = quiz.title;

  // ---------- State ----------
  const state = {
    mode: 'practice', // practice | exam
    pdfDoc: null,
    pageNum: 1,
    scale: 1.5,
    answers: {},       // { qIndex: value }
    submitted: false,
    startTime: Date.now(),
    timerInterval: null
  };

  // ---------- PDF.js ----------
  const canvas = document.getElementById('pdfCanvas');
  const ctx = canvas.getContext('2d');

  async function loadPDF() {
    if (!quiz.pdf) {
      document.getElementById('pdfContainer').innerHTML =
        `<p style="padding:40px;color:var(--text-soft)">No PDF attached to this quiz.</p>`;
      return;
    }
    try {
      if (!window.pdfjsLib) throw new Error('PDF.js not loaded');
      state.pdfDoc = await pdfjsLib.getDocument(quiz.pdf).promise;
      document.getElementById('pageInfo').textContent = `1 / ${state.pdfDoc.numPages}`;
      renderPage();
    } catch (err) {
      console.error(err);
      document.getElementById('pdfContainer').innerHTML =
        `<p style="padding:40px;color:var(--text-soft)">Could not load PDF. Make sure the file exists at <code>${quiz.pdf}</code>.</p>`;
    }
  }

async function renderPage() {
  if (!state.pdfDoc) return;

  const page = await state.pdfDoc.getPage(state.pageNum);

  // 🔑 KEY FIX: nhân scale với devicePixelRatio để sắc nét trên Retina/HiDPI
  const dpr = window.devicePixelRatio || 1;
  const viewport = page.getViewport({ scale: state.scale * dpr });

  // Set kích thước canvas thật (lớn hơn) theo DPR
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  // Set kích thước hiển thị CSS (nhỏ hơn) = kích thước gốc
  const displayViewport = page.getViewport({ scale: state.scale });
  canvas.style.width = Math.floor(displayViewport.width) + 'px';
  canvas.style.height = Math.floor(displayViewport.height) + 'px';

  // Reset transform trước khi render (tránh chồng lớp khi zoom nhiều lần)
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Render với background trắng để tránh trong suốt
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport: viewport,
    intent: 'print'          // 🔑 dùng 'print' để nét hơn 'display'
  }).promise;

  // Cập nhật UI
  document.getElementById('pageInfo').textContent =
    `${state.pageNum} / ${state.pdfDoc.numPages}`;
  document.getElementById('zoomLevel').textContent =
    Math.round(state.scale * 100) + '%';
}

  // ---------- Toolbar controls ----------
  document.getElementById('zoomIn').onclick = () => { state.scale = Math.min(3, state.scale + 0.2); renderPage(); };
  document.getElementById('zoomOut').onclick = () => { state.scale = Math.max(0.5, state.scale - 0.2); renderPage(); };
  document.getElementById('prevPage').onclick = () => {
    if (state.pageNum > 1) { state.pageNum--; renderPage(); }
  };
  document.getElementById('nextPage').onclick = () => {
    if (state.pdfDoc && state.pageNum < state.pdfDoc.numPages) { state.pageNum++; renderPage(); }
  };
  document.getElementById('fullscreen').onclick = () => {
    const el = document.getElementById('pdfPane');
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  // ---------- Mode switch ----------
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (state.submitted) return;
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.mode = btn.dataset.mode;
    });
  });

  // ---------- Timer ----------
  function startTimer() {
    state.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
      const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const s = String(elapsed % 60).padStart(2, '0');
      document.getElementById('timer').textContent = `⏱ ${m}:${s}`;
    }, 1000);
  }

  // ---------- Render answer sheet ----------
  function renderAnswerSheet() {
    const list = document.getElementById('answerList');
    list.innerHTML = '';
    const questions = quiz.questions || [];
    document.getElementById('answerProgress').textContent = `0 / ${questions.length}`;

    questions.forEach((q, i) => {
      const block = document.createElement('div');
      block.className = 'question-block';
      block.dataset.index = i;
      block.innerHTML = buildQuestionHTML(q, i);
      list.appendChild(block);
    });

    // attach listeners
    list.addEventListener('change', handleAnswerChange);
    list.addEventListener('input', handleAnswerChange);
  }

  function buildQuestionHTML(q, i) {
    const type = (q.type || 'mcq').toLowerCase();
    let inner = `
      <div class="question-num">Question ${i + 1}</div>
      <div class="question-text">${App.escapeHtml(q.text || '')}</div>
    `;

    if (type === 'mcq') {
      inner += `<div class="options">` +
        (q.options || []).map((opt, j) => `
          <label class="option">
            <input type="radio" name="q${i}" value="${App.escapeHtml(opt)}">
            <span>${App.escapeHtml(opt)}</span>
          </label>`).join('') + `</div>`;
    }
    else if (['truefalse', 'true_false'].includes(type)) {
      inner += `<div class="options">
        <label class="option"><input type="radio" name="q${i}" value="True"><span>True</span></label>
        <label class="option"><input type="radio" name="q${i}" value="False"><span>False</span></label>
      </div>`;
    }
    else if (['tfng', 'true_false_not_given'].includes(type)) {
      inner += `<div class="options">
        <label class="option"><input type="radio" name="q${i}" value="True"><span>True</span></label>
        <label class="option"><input type="radio" name="q${i}" value="False"><span>False</span></label>
        <label class="option"><input type="radio" name="q${i}" value="Not Given"><span>Not Given</span></label>
      </div>`;
    }
    else if (['ynng', 'yes_no_not_given'].includes(type)) {
      inner += `<div class="options">
        <label class="option"><input type="radio" name="q${i}" value="Yes"><span>Yes</span></label>
        <label class="option"><input type="radio" name="q${i}" value="No"><span>No</span></label>
        <label class="option"><input type="radio" name="q${i}" value="Not Given"><span>Not Given</span></label>
      </div>`;
    }
    else if (type === 'matching') {
      const left = q.left || [];
      const right = q.right || [];
      inner += `<div class="matching-grid">` +
        left.map((l, j) => `
          <div>${App.escapeHtml(l)}</div>
          <select data-match="${j}">
            <option value="">—</option>
            ${right.map(r => `<option value="${App.escapeHtml(r)}">${App.escapeHtml(r)}</option>`).join('')}
          </select>`).join('') + `</div>`;
    }
    else if (['fill', 'fillblank', 'fill_blank', 'sentence', 'short'].includes(type)) {
      inner += `<input type="text" class="question-input" placeholder="Your answer..." data-input="${i}">`;
    }
    else {
      inner += `<input type="text" class="question-input" placeholder="Your answer..." data-input="${i}">`;
    }

    inner += `<div class="feedback" data-feedback="${i}"></div>`;
    return inner;
  }

  function handleAnswerChange(e) {
    const block = e.target.closest('.question-block');
    if (!block) return;
    const i = +block.dataset.index;
    const q = quiz.questions[i];
    const type = (q.type || 'mcq').toLowerCase();

    if (type === 'matching') {
      const selects = block.querySelectorAll('select');
      const map = {};
      selects.forEach(s => { if (s.value) map[s.dataset.match] = s.value; });
      state.answers[i] = map;
    } else if (e.target.type === 'radio') {
      state.answers[i] = e.target.value;
      block.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
      e.target.closest('.option').classList.add('selected');
    } else if (e.target.classList.contains('question-input')) {
      state.answers[i] = e.target.value.trim();
    }

    updateProgress();

    if (state.mode === 'practice' && !state.submitted) {
      // instant feedback on change (only for complete answers)
      const val = state.answers[i];
      if (val !== undefined && val !== '' && (typeof val !== 'object' || Object.keys(val).length === (q.left || []).length)) {
        showFeedback(i);
      }
    }
  }

  function showFeedback(i) {
    const q = quiz.questions[i];
    const correct = isCorrect(q, state.answers[i]);
    const block = document.querySelector(`.question-block[data-index="${i}"]`);
    const fb = block.querySelector('[data-feedback]');
    block.classList.remove('correct', 'incorrect');
    fb.classList.remove('correct', 'incorrect', 'show');

    if (correct) {
      block.classList.add('correct');
      fb.classList.add('correct', 'show');
      fb.innerHTML = '✅ Correct!';
    } else {
      block.classList.add('incorrect');
      fb.classList.add('incorrect', 'show');
      fb.innerHTML = `❌ Incorrect. <span class="correct-answer-text">Answer: ${formatAnswer(getCorrectAnswer(q))}</span>`;
    }
  }

  function updateProgress() {
    const total = (quiz.questions || []).length;
    const answered = Object.keys(state.answers).filter(k => {
      const v = state.answers[k];
      return v !== '' && v !== undefined && v !== null &&
        (typeof v !== 'object' || Object.keys(v).length > 0);
    }).length;
    document.getElementById('answerProgress').textContent = `${answered} / ${total}`;
  }

  // ---------- Grading ----------
  function normalize(s) {
    return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function getCorrectAnswer(q) {
    return q.answer ?? q.correct ?? q.answers ?? null;
  }

  function isCorrect(q, userAnswer) {
    const correct = getCorrectAnswer(q);
    if (correct === null || correct === undefined) return false;
    const type = (q.type || 'mcq').toLowerCase();

    if (type === 'matching') {
      const ans = q.answer || {};
      const ua = userAnswer || {};
      const keys = Object.keys(ans);
      return keys.every(k => normalize(ans[k]) === normalize(ua[k]));
    }
    if (Array.isArray(correct)) {
      // multiple accepted answers
      return correct.some(c => normalize(c) === normalize(userAnswer));
    }
    return normalize(correct) === normalize(userAnswer);
  }

  function formatAnswer(a) {
    if (Array.isArray(a)) return a.join(' / ');
    if (typeof a === 'object' && a !== null) {
      return Object.entries(a).map(([k, v]) => `${k}→${v}`).join(', ');
    }
    return App.escapeHtml(String(a ?? ''));
  }

  // ---------- Submit ----------
  document.getElementById('submitBtn').onclick = () => {
    if (state.submitted) return;
    if (state.mode === 'exam') {
      if (!confirm('Submit your answers? You cannot change them after this.')) return;
    }
    state.submitted = true;
    clearInterval(state.timerInterval);
    showResults();
  };

  document.getElementById('clearBtn').onclick = () => {
    if (state.submitted) return;
    if (!confirm('Clear all answers?')) return;
    state.answers = {};
    renderAnswerSheet();
  };

  function showResults() {
    const questions = quiz.questions || [];
    let correct = 0, incorrect = 0, unanswered = 0;
    const wrong = [];

    questions.forEach((q, i) => {
      const user = state.answers[i];
      const hasAnswer = user !== undefined && user !== '' && user !== null &&
        (typeof user !== 'object' || Object.keys(user).length > 0);
      if (!hasAnswer) { unanswered++; return; }
      if (isCorrect(q, user)) {
        correct++;
      } else {
        incorrect++;
        wrong.push({
          num: i + 1,
          yours: formatAnswer(user),
          correct: formatAnswer(getCorrectAnswer(q))
        });
      }

      // show feedback on all in review
      const block = document.querySelector(`.question-block[data-index="${i}"]`);
      const fb = block.querySelector('[data-feedback]');
      block.classList.remove('correct', 'incorrect');
      fb.classList.remove('correct', 'incorrect', 'show');
      if (isCorrect(q, user)) {
        block.classList.add('correct');
        fb.classList.add('correct', 'show');
        fb.innerHTML = '✅ Correct!';
      } else {
        block.classList.add('incorrect');
        fb.classList.add('incorrect', 'show');
        fb.innerHTML = `❌ <span class="correct-answer-text">Answer: ${formatAnswer(getCorrectAnswer(q))}</span>`;
      }

      // highlight options
      if ((q.type || 'mcq').toLowerCase() !== 'matching') {
        block.querySelectorAll('.option').forEach(o => {
          const input = o.querySelector('input');
          if (normalize(input.value) === normalize(getCorrectAnswer(q))) {
            o.classList.add('correct-answer');
          } else if (input.checked && !isCorrect(q, user)) {
            o.classList.add('wrong-answer');
          }
        });
      }
    });

    const total = questions.length;
    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
    const tenScale = total > 0 ? ((correct / total) * 10).toFixed(1) : '0.0';
    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');

    // save to dashboard
    App.recordQuizResult(id, correct, total);

    // populate modal
    document.getElementById('scorePercent').textContent = percent + '%';
    document.getElementById('correctCount').textContent = correct;
    document.getElementById('incorrectCount').textContent = incorrect;
    document.getElementById('unansweredCount').textContent = unanswered;
    document.getElementById('tenScale').textContent = tenScale;
    document.getElementById('timeTaken').textContent = `${m}:${s}`;

    const tbody = document.querySelector('#wrongTable tbody');
    tbody.innerHTML = wrong.length
      ? wrong.map(w => `<tr><td>${w.num}</td><td>${w.yours}</td><td>${w.correct}</td></tr>`).join('')
      : `<tr><td colspan="3" style="text-align:center;color:var(--text-soft)">🎉 All correct!</td></tr>`;

    // chart
    drawChart(correct, incorrect, unanswered);

    document.getElementById('resultModal').classList.add('show');
  }

  function drawChart(correct, incorrect, unanswered) {
    const ctxC = document.getElementById('resultChart').getContext('2d');
    if (window._chart) window._chart.destroy();
    window._chart = new Chart(ctxC, {
      type: 'pie',
      data: {
        labels: ['Correct', 'Incorrect', 'Unanswered'],
        datasets: [{
          data: [correct, incorrect, unanswered],
          backgroundColor: ['#22c55e', '#ef4444', '#94a3b8'],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { color: getComputedStyle(document.body).color } }
        }
      }
    });
  }

  // ---------- Modal controls ----------
  document.getElementById('modalClose').onclick = () =>
    document.getElementById('resultModal').classList.remove('show');
  document.getElementById('retryBtn').onclick = () => location.reload();
  document.getElementById('reviewBtn').onclick = () => {
    document.getElementById('resultModal').classList.remove('show');
    document.getElementById('answerPane').scrollIntoView({ behavior: 'smooth' });
  };

  // ---------- Boot ----------
  renderAnswerSheet();
  startTimer();
  loadPDF();
})();
