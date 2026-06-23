/* ============================================================
   quiz.js — Quiz page: PDF viewer + answer sheet + results
   ============================================================ */

(async function () {
  const id = App.getParam('id');
  if (!id) { alert('Quiz not found'); window.location.href = 'index.html'; return; }

  let quiz;
  try {
  const rawQuiz = await App.loadJSON(`data/quiz/${id}.json`);
quiz = normalizeQuiz(rawQuiz);
  } catch {
    alert('Could not load quiz.');
    window.location.href = 'index.html';
    return;
  }

  document.title = `${quiz.title} — Learn with Ms. Thúy`;
  document.getElementById('quizTitle').textContent = quiz.title;
   /* ============================================================
   NORMALIZE: Hỗ trợ cả 2 cấu trúc JSON
   - Cấu trúc cũ: quiz.questions = [...]
   - Cấu trúc mới: quiz.pages = [{ page, title, questions: [...] }, ...]
   ============================================================ */
function normalizeQuiz(raw) {
  let questions = [];

  if (Array.isArray(raw.questions)) {
    // Cấu trúc cũ (phẳng)
    questions = raw.questions;
  } else if (Array.isArray(raw.pages)) {
    // Cấu trúc mới (phân trang)
    raw.pages.forEach(page => {
      (page.questions || []).forEach(q => {
        questions.push({
          ...q,
          _page: page.page,
          _pageTitle: page.title
        });
      });
    });
  }

  // Chuẩn hóa type (alias)
  questions = questions.map(q => ({
    ...q,
    type: normalizeType(q.type)
  }));

  return { ...raw, questions };
}

function normalizeType(type) {
  const t = String(type || '').toLowerCase().replace(/[-\s]/g, '_');
  const map = {
    'mcq': 'mcq',
    'multiple_choice': 'mcq',
    'true_false': 'true_false',
    'truefalse': 'true_false',
    'tf': 'true_false',
    'true_false_not_given': 'true_false_not_given',
    'truefalse_not_given': 'true_false_not_given',
    'tfng': 'true_false_not_given',
    'yes_no_not_given': 'yes_no_not_given',
    'yesno_not_given': 'yes_no_not_given',
    'ynng': 'yes_no_not_given',
    'matching': 'matching',
    'match': 'matching',
    'fill_blank': 'fill_blank',
    'fillblank': 'fill_blank',
    'fill': 'fill_blank',
    'sentence_completion': 'sentence_completion',
    'sentence': 'sentence_completion',
    'short_answer': 'short_answer',
    'short': 'short_answer'
  };
  return map[t] || 'fill_blank';
}

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
  const type = q.type;
  let inner = `
    <div class="question-num">Question ${i + 1}${q._page ? ` <small style="color:var(--text-soft)">(Trang ${q._page})</small>` : ''}</div>
    <div class="question-text">${App.escapeHtml(q.text || '')}</div>
  `;

  // ---------- MCQ ----------
  if (type === 'mcq') {
    inner += `<div class="options">` +
      (q.options || []).map(opt => `
        <label class="option">
          <input type="radio" name="q${i}" value="${App.escapeHtml(opt)}">
          <span>${App.escapeHtml(opt)}</span>
        </label>`).join('') + `</div>`;
  }

  // ---------- True/False ----------
  else if (type === 'true_false') {
    inner += `<div class="options">
      <label class="option"><input type="radio" name="q${i}" value="True"><span>True</span></label>
      <label class="option"><input type="radio" name="q${i}" value="False"><span>False</span></label>
    </div>`;
  }

  // ---------- True/False/Not Given ----------
  else if (type === 'true_false_not_given') {
    inner += `<div class="options">
      <label class="option"><input type="radio" name="q${i}" value="True"><span>True</span></label>
      <label class="option"><input type="radio" name="q${i}" value="False"><span>False</span></label>
      <label class="option"><input type="radio" name="q${i}" value="Not Given"><span>Not Given</span></label>
    </div>`;
  }

  // ---------- Yes/No/Not Given ----------
  else if (type === 'yes_no_not_given') {
    inner += `<div class="options">
      <label class="option"><input type="radio" name="q${i}" value="Yes"><span>Yes</span></label>
      <label class="option"><input type="radio" name="q${i}" value="No"><span>No</span></label>
      <label class="option"><input type="radio" name="q${i}" value="Not Given"><span>Not Given</span></label>
    </div>`;
  }

  // ---------- Matching (dạng mới: 1 câu = 1 text, chọn từ matchingOptions) ----------
  else if (type === 'matching') {
    if (Array.isArray(q.matchingOptions)) {
      // Dạng mới: mỗi câu là 1 text, chọn 1 đáp án từ matchingOptions
      inner += `<div class="options">` +
        q.matchingOptions.map(opt => `
          <label class="option">
            <input type="radio" name="q${i}" value="${App.escapeHtml(opt)}">
            <span>${App.escapeHtml(opt)}</span>
          </label>`).join('') + `</div>`;
    } else {
      // Dạng cũ: left + right
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
  }

  // ---------- Fill blank / Sentence / Short answer ----------
  else if (['fill_blank', 'sentence_completion', 'short_answer'].includes(type)) {
    inner += `<input type="text" class="question-input" placeholder="Your answer..." data-input="${i}">`;
  }

  // ---------- Default ----------
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
  const type = q.type;

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
  const reviewData = [];

  questions.forEach((q, i) => {
    const user = state.answers[i];
    const type = q.type;   // 👈 DÒNG QUAN TRỌNG
    const hasAnswer = user !== undefined && user !== '' && user !== null &&
      (typeof user !== 'object' || Object.keys(user).length > 0);

    let status, userDisplay, correctDisplay;

    if (!hasAnswer) {
      unanswered++;
      status = 'unanswered';
      userDisplay = '—';
      correctDisplay = formatAnswer(getCorrectAnswer(q));
    } else if (isCorrect(q, user)) {
      correct++;
      status = 'correct';
      userDisplay = formatAnswer(user);
      correctDisplay = formatAnswer(getCorrectAnswer(q));
    } else {
      incorrect++;
      status = 'incorrect';
      userDisplay = formatAnswer(user);
      correctDisplay = formatAnswer(getCorrectAnswer(q));
    }

    reviewData.push({
      num: i + 1,
      text: q.text || '',
      userAnswer: userDisplay,
      correctAnswer: correctDisplay,
      status: status,
      explanation: q.explanation || ''
    });

    // Highlight trên answer sheet
    const block = document.querySelector(`.question-block[data-index="${i}"]`);
    if (!block) return;
    const fb = block.querySelector('[data-feedback]');
    block.classList.remove('correct', 'incorrect');
    fb.classList.remove('correct', 'incorrect', 'show');

    if (status === 'correct') {
      block.classList.add('correct');
      fb.classList.add('correct', 'show');
      fb.innerHTML = '✅ Đúng';
    } else if (status === 'incorrect') {
      block.classList.add('incorrect');
      fb.classList.add('incorrect', 'show');
      fb.innerHTML = `❌ Đáp án đúng: <strong>${App.escapeHtml(correctDisplay)}</strong>`;
    } else {
      block.classList.add('incorrect');
      fb.classList.add('incorrect', 'show');
      fb.innerHTML = `⚪ Chưa trả lời. Đáp án: <strong>${App.escapeHtml(correctDisplay)}</strong>`;
    }

    // Highlight options (chỉ cho dạng có .option)
    if (type !== 'matching' || !Array.isArray(q.matchingOptions)) {
      block.querySelectorAll('.option').forEach(o => {
        const input = o.querySelector('input');
        if (!input) return;
        const val = input.value;
        const correctVal = getCorrectAnswer(q);
        if (Array.isArray(correctVal)) {
          if (correctVal.some(c => normalize(c) === normalize(val))) {
            o.classList.add('correct-answer');
          } else if (input.checked) {
            o.classList.add('wrong-answer');
          }
        } else if (correctVal && normalize(val) === normalize(correctVal)) {
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

  App.recordQuizResult(id, correct, total);

  // ---------- Điền modal ----------
  document.getElementById('resultQuizTitle').textContent = quiz.title || '';
  document.getElementById('scorePercent').textContent = percent + '%';
  document.getElementById('totalCount').textContent = total;
  document.getElementById('correctCount').textContent = correct;
  document.getElementById('incorrectCount').textContent = incorrect;
  document.getElementById('unansweredCount').textContent = unanswered;
  document.getElementById('tenScale').textContent = tenScale + ' / 10';
  document.getElementById('timeTaken').textContent = `${m}:${s}`;

  // ---------- Render review table ----------
  const tbody = document.querySelector('#reviewTable tbody');
  tbody.innerHTML = reviewData.map(r => {
    const badgeClass = r.status === 'correct' ? 'correct'
                    : r.status === 'incorrect' ? 'incorrect'
                    : 'unanswered';
    const badgeText = r.status === 'correct' ? '✅ Đúng'
                   : r.status === 'incorrect' ? '❌ Sai'
                   : '⚪ Trống';
    const userClass = r.status === 'unanswered' ? 'user-answer empty' : 'user-answer';

    return `
      <tr>
        <td class="q-num">${r.num}</td>
        <td class="q-text">${App.escapeHtml(r.text)}</td>
        <td class="${userClass}">${App.escapeHtml(r.userAnswer)}</td>
        <td class="correct-answer">${App.escapeHtml(r.correctAnswer)}</td>
        <td><span class="result-badge ${badgeClass}">${badgeText}</span></td>
        <td class="explanation">${r.explanation ? App.escapeHtml(r.explanation) : '<span style="color:#cbd5e1">—</span>'}</td>
      </tr>
    `;
  }).join('');

  document.getElementById('resultModal').classList.add('show');
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
   /* ============================================================
   RESIZABLE DIVIDER LOGIC
   ============================================================ */
(function initResizableDivider() {
  const STORAGE_KEY = 'quiz-split-ratio';
  const MIN_PERCENT = 25;   // tối thiểu 25%
  const MAX_PERCENT = 85;   // tối đa 85%
  const DEFAULT_PERCENT = 70;

  const layout   = document.getElementById('quizLayout');
  const divider  = document.getElementById('divider');
  const pdfPane  = document.getElementById('pdfPane');
  const ansPane  = document.getElementById('answerPane');
  if (!layout || !divider) return;

  const DIVIDER_WIDTH = 8; // px, khớp với CSS grid-template-columns

  let isDragging = false;
  let currentPercent = loadPercent();

  // ---------- Apply layout ----------
  function applyLayout(percent, animate = true) {
    percent = Math.max(MIN_PERCENT, Math.min(MAX_PERCENT, percent));
    currentPercent = percent;

    const left  = percent + '%';
    const right = `calc(${100 - percent}% - ${DIVIDER_WIDTH}px)`;

    if (!animate) layout.classList.add('is-resizing');
    layout.style.gridTemplateColumns = `${left} ${DIVIDER_WIDTH}px ${right}`;
    if (!animate) {
      // force reflow rồi bỏ class
      void layout.offsetWidth;
      layout.classList.remove('is-resizing');
    }
  }

  function loadPercent() {
    try {
      const saved = parseFloat(localStorage.getItem(STORAGE_KEY));
      if (!isNaN(saved) && saved >= MIN_PERCENT && saved <= MAX_PERCENT) return saved;
    } catch {}
    return DEFAULT_PERCENT;
  }

  function savePercent() {
    try { localStorage.setItem(STORAGE_KEY, String(currentPercent)); } catch {}
  }

  // ---------- Mouse events ----------
  function onPointerDown(e) {
    e.preventDefault();
    isDragging = true;
    divider.classList.add('dragging');
    document.body.classList.add('is-resizing');
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', onPointerUp);
    document.addEventListener('touchmove', onPointerMove, { passive: false });
    document.addEventListener('touchend', onPointerUp);
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    e.preventDefault();

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const rect = layout.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const percent = (offsetX / rect.width) * 100;

    applyLayout(percent, false);
  }

  function onPointerUp() {
    if (!isDragging) return;
    isDragging = false;
    divider.classList.remove('dragging');
    document.body.classList.remove('is-resizing');
    document.removeEventListener('mousemove', onPointerMove);
    document.removeEventListener('mouseup', onPointerUp);
    document.removeEventListener('touchmove', onPointerMove);
    document.removeEventListener('touchend', onPointerUp);

    savePercent();

    // Re-render PDF sau khi resize để sắc nét
    if (typeof renderPage === 'function') {
      setTimeout(renderPage, 50);
    }
  }

  // ---------- Double-click: reset ----------
  divider.addEventListener('dblclick', () => {
    applyLayout(DEFAULT_PERCENT, true);
    savePercent();
    if (typeof renderPage === 'function') {
      setTimeout(renderPage, 50);
    }
  });

  // ---------- Keyboard: arrow keys khi divider focus ----------
  divider.tabIndex = 0;
  divider.setAttribute('role', 'separator');
  divider.setAttribute('aria-orientation', 'vertical');
  divider.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 5 : 1;
    if (e.key === 'ArrowLeft')  { applyLayout(currentPercent - step, true); savePercent(); e.preventDefault(); }
    if (e.key === 'ArrowRight') { applyLayout(currentPercent + step, true); savePercent(); e.preventDefault(); }
    if (e.key === 'Home')       { applyLayout(MIN_PERCENT, true); savePercent(); e.preventDefault(); }
    if (e.key === 'End')        { applyLayout(MAX_PERCENT, true); savePercent(); e.preventDefault(); }
  });

  // ---------- Attach ----------
  divider.addEventListener('mousedown', onPointerDown);
  divider.addEventListener('touchstart', onPointerDown, { passive: false });

  // ---------- Init ----------
  applyLayout(currentPercent, false);

  // Re-render PDF khi window resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (typeof renderPage === 'function') renderPage();
    }, 100);
  });
})();
})();
