// ======================== CONFIG ========================
const DATA_BASE = 'data/';
const ARTICLES_INDEX = DATA_BASE + 'articles.json';
const QUIZZES_INDEX = DATA_BASE + 'quizzes.json';
const ARTICLE_DETAIL = (id) => `${DATA_BASE}article/${id}.json`;
const QUIZ_DETAIL = (id) => `${DATA_BASE}quiz/${id}.json`;

// ======================== STATE ========================
let articles = [];
let quizzes = [];
let currentFilter = 'all';
let searchTerm = '';

// ======================== UTILS ========================
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return res.json();
}

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

function updateLocalStorage(key, value) {
  localStorage.setItem('ms_thuy_' + key, JSON.stringify(value));
}
function getLocalStorage(key) {
  const data = localStorage.getItem('ms_thuy_' + key);
  return data ? JSON.parse(data) : null;
}

// ======================== THEME ========================
function applyTheme() {
  const dark = getLocalStorage('darkMode') || false;
  document.body.classList.toggle('dark', dark);
  const toggleBtn = document.getElementById('darkModeToggle');
  if (toggleBtn) toggleBtn.textContent = dark ? '☀️' : '🌓';
}
function toggleTheme() {
  const current = document.body.classList.contains('dark');
  document.body.classList.toggle('dark', !current);
  updateLocalStorage('darkMode', !current);
  const btn = document.getElementById('darkModeToggle');
  if (btn) btn.textContent = !current ? '☀️' : '🌓';
}

// ======================== STUDENT DASHBOARD ========================
function getDashboard() {
  return getLocalStorage('dashboard') || {
    completedQuizzes: 0,
    bestScores: {},
    averageScores: {},
    recentActivity: []
  };
}
function updateDashboard(quizId, score) {
  const dash = getDashboard();
  dash.completedQuizzes = (dash.completedQuizzes || 0) + 1;
  if (!dash.bestScores[quizId] || score > dash.bestScores[quizId]) {
    dash.bestScores[quizId] = score;
  }
  // Update average (simple running average)
  if (!dash.averageScores[quizId]) {
    dash.averageScores[quizId] = { total: score, count: 1 };
  } else {
    dash.averageScores[quizId].total += score;
    dash.averageScores[quizId].count += 1;
  }
  dash.recentActivity.unshift({ type: 'quiz', id: quizId, score, date: new Date().toISOString() });
  if (dash.recentActivity.length > 20) dash.recentActivity.pop();
  updateLocalStorage('dashboard', dash);
}
function renderDashboard() {
  const container = document.getElementById('dashboardContent');
  if (!container) return;
  const dash = getDashboard();
  let bestTotal = 0, countBest = 0;
  for (const [k, v] of Object.entries(dash.bestScores || {})) {
    bestTotal += v; countBest++;
  }
  const avgBest = countBest ? (bestTotal / countBest).toFixed(1) : '—';
  const totalCompleted = dash.completedQuizzes || 0;
  container.innerHTML = `
    <div class="dashboard-card glass"><h3>Quizzes Completed</h3><div class="value">${totalCompleted}</div></div>
    <div class="dashboard-card glass"><h3>Best Score Avg</h3><div class="value">${avgBest}%</div></div>
    <div class="dashboard-card glass"><h3>Recent Activity</h3>
      <ul class="recent-activity">${(dash.recentActivity || []).slice(0,5).map(a => `<li>${a.type === 'quiz' ? 'Quiz' : 'Article'}: ${a.id} – ${a.score || ''}</li>`).join('')}</ul>
    </div>
  `;
}

// ======================== HOMEPAGE ========================
async function loadHomeData() {
  try {
    articles = await fetchJSON(ARTICLES_INDEX);
    quizzes = await fetchJSON(QUIZZES_INDEX);
  } catch (e) {
    console.error('Could not load articles/quizzes lists:', e);
    articles = [];
    quizzes = [];
  }
  applyFilters();
  renderDashboard();
}

function applyFilters() {
  const filteredArticles = articles.filter(a => {
    const matchesCategory = currentFilter === 'all' || a.category === currentFilter;
    const matchesSearch = !searchTerm || a.title.toLowerCase().includes(searchTerm) || a.description.toLowerCase().includes(searchTerm);
    return matchesCategory && matchesSearch;
  });
  const filteredQuizzes = quizzes.filter(q => {
    const matchesCategory = currentFilter === 'all' || q.category === currentFilter;
    const matchesSearch = !searchTerm || q.title.toLowerCase().includes(searchTerm);
    return matchesCategory && matchesSearch;
  });
  renderCards('articlesGrid', filteredArticles, 'article');
  renderCards('quizzesGrid', filteredQuizzes, 'quiz');
}

function renderCards(containerId, items, type) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (items.length === 0) {
    container.innerHTML = '<p style="text-align:center; grid-column:1/-1;">No items found.</p>';
    return;
  }
  container.innerHTML = items.map(item => {
    const img = item.thumbnail || item.cover || 'assets/img/placeholder.jpg';
    const dateStr = item.date ? new Date(item.date).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }) : '';
    return `
      <div class="card">
        <img src="${img}" alt="${item.title}" class="card-img" onerror="this.src='assets/img/placeholder.jpg'">
        <div class="card-body">
          <span class="card-category">${item.category}</span>
          <h3 class="card-title">${item.title}</h3>
          <div class="card-meta">${dateStr} ${item.questions ? '• '+item.questions+' questions' : ''} ${item.duration ? '• '+item.duration+' min' : ''}</div>
          <p class="card-desc">${item.description || ''}</p>
          <div class="card-footer">
            <a href="${type === 'article' ? `article.html?id=${item.id}` : `quiz.html?id=${item.id}`}" class="btn small">${type === 'article' ? 'Read More' : 'Start Test'}</a>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ======================== ARTICLE PAGE ========================
async function loadArticle() {
  const id = getQueryParam('id');
  if (!id) return (window.location.href = 'index.html');
  try {
    const article = await fetchJSON(ARTICLE_DETAIL(id));
    document.title = article.title + ' – Ms. Thúy';
    const content = document.getElementById('articleContent');
    content.innerHTML = `
      ${article.cover ? `<img src="${article.cover}" class="cover-img" onerror="this.style.display='none'">` : ''}
      <h1>${article.title}</h1>
      <div class="article-meta">
        <span>✍️ ${article.author || 'Ms. Thúy'}</span>
        <span>📅 ${article.date}</span>
      </div>
      <div class="progress-container"><div class="progress-bar-article" id="readingProgress"></div></div>
      <div id="articleBody">${article.content}</div>
      <div class="share-buttons">
        <button class="btn small secondary" onclick="share('facebook')">📘 Share</button>
        <button class="btn small secondary" onclick="share('twitter')">🐦 Tweet</button>
      </div>`;
    // Scroll progress
    window.addEventListener('scroll', () => {
      const winHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (window.scrollY / winHeight) * 100;
      document.getElementById('readingProgress').style.width = scrolled + '%';
    });
    // Related articles (same category)
    const allArticles = await fetchJSON(ARTICLES_INDEX);
    const related = allArticles.filter(a => a.category === article.category && a.id !== id).slice(0, 3);
    renderRelated(related);
    document.getElementById('articleLoader').style.display = 'none';
  } catch (e) {
    document.getElementById('articleLoader').textContent = 'Article not found.';
  }
}
function renderRelated(related) {
  const grid = document.getElementById('relatedGrid');
  if (related.length === 0) return;
  grid.innerHTML = related.map(a => `
    <div class="card">
      <img src="${a.thumbnail || 'assets/img/placeholder.jpg'}" class="card-img">
      <div class="card-body">
        <span class="card-category">${a.category}</span>
        <h3 class="card-title">${a.title}</h3>
        <a href="article.html?id=${a.id}" class="btn small">Read</a>
      </div>
    </div>`).join('');
}
function share(platform) {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent(document.title);
  let shareUrl = '';
  if (platform === 'facebook') shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
  else if (platform === 'twitter') shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
  window.open(shareUrl, '_blank', 'width=600,height=400');
}

// ======================== QUIZ PAGE ========================
let quizData = null;
let currentPage = 1;
let userAnswers = {};  // key: page-questionId -> {answer, isCorrect}
let mode = 'practice'; // 'practice' or 'exam'
let showCorrect = true;
let isSubmitted = false;
let timerInterval = null;
let timeRemaining = 0;
let timerRunning = false;
let pdfDoc = null;
let pdfScale = 1.0;
let totalPages = 0;

async function loadQuiz() {
  const id = getQueryParam('id');
  if (!id) return (window.location.href = 'index.html');
  try {
    quizData = await fetchJSON(QUIZ_DETAIL(id));
    document.title = quizData.title + ' – Ms. Thúy';
    document.getElementById('quizTitle').textContent = quizData.title;
    timeRemaining = (quizData.duration || 60) * 60;
    updateTimerDisplay();
    document.getElementById('quizControls').style.display = 'block';
    document.getElementById('quizMain').style.display = 'flex';
    if (quizData.pdf) {
      loadPDF(quizData.pdf);
    }
    // Restore session if any
    restoreQuizSession();
    renderAnswerSheet();
    updateProgress();
    setupQuizListeners();
  } catch (e) {
    alert('Quiz not found.');
  }
}

function loadPDF(pdfUrl) {
  pdfjsLib.getDocument(pdfUrl).promise.then(doc => {
    pdfDoc = doc;
    totalPages = doc.numPages;
    document.getElementById('pageIndicator').textContent = `1/${totalPages}`;
    renderAllPDFPages();
  }).catch(err => console.error('PDF load error:', err));
}

async function renderAllPDFPages() {
  const container = document.getElementById('pdfContainer');
  container.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: pdfScale });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const wrapper = document.createElement('div');
    wrapper.className = 'pdf-page';
    wrapper.dataset.page = i;
    wrapper.appendChild(canvas);
    container.appendChild(wrapper);
  }
  observePDFPages();
}

function observePDFPages() {
  const container = document.getElementById('pdfContainer');
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const pageNum = parseInt(entry.target.dataset.page);
        if (pageNum && pageNum !== currentPage) {
          currentPage = pageNum;
          document.getElementById('pageIndicator').textContent = `${currentPage}/${totalPages}`;
          renderAnswerSheet();
          saveQuizSession();
        }
      }
    }
  }, { root: container, threshold: 0.6 });
  document.querySelectorAll('.pdf-page').forEach(p => observer.observe(p));
}

function navigatePDF(delta) {
  const newPage = currentPage + delta;
  if (newPage < 1 || newPage > totalPages) return;
  currentPage = newPage;
  document.querySelector(`.pdf-page[data-page="${newPage}"]`)?.scrollIntoView({ behavior: 'smooth' });
}

function zoomPDF(delta) {
  pdfScale = Math.max(0.5, Math.min(2.5, pdfScale + delta));
  document.getElementById('zoomPercent').textContent = Math.round(pdfScale * 100) + '%';
  if (pdfDoc) renderAllPDFPages();
}

function getCurrentPageQuestions() {
  if (!quizData || !quizData.pages) return [];
  const page = quizData.pages.find(p => p.page === currentPage);
  return page ? page.questions : [];
}

function renderAnswerSheet() {
  const questions = getCurrentPageQuestions();
  document.getElementById('pageTitle').textContent = `Page ${currentPage}`;
  const container = document.getElementById('questionsContainer');
  container.innerHTML = '';
  questions.forEach((q, idx) => {
    const key = `${currentPage}-${q.id}`;
    const saved = userAnswers[key];
    const disabled = (isSubmitted && mode === 'exam') || (mode === 'practice' && saved?.isCorrect !== undefined);
    const card = document.createElement('div');
    card.className = 'question-card glass';
    if (mode === 'practice' && saved?.isCorrect !== undefined) {
      card.classList.add(saved.isCorrect ? 'correct' : 'incorrect');
    }
    card.innerHTML = `
      <div><strong>${idx+1}. ${q.text || 'Question'}</strong> <span style="font-size:0.7rem;background:rgba(255,140,66,0.2);padding:0.2rem 0.5rem;border-radius:1rem;">${q.type}</span></div>
      ${renderInput(q, saved?.answer, disabled)}
      ${ (mode === 'practice' && saved?.isCorrect !== undefined) ?
         `<div class="feedback ${saved.isCorrect?'correct':'incorrect'}">
            ${saved.isCorrect ? '✅ Correct' : '❌ Incorrect'}
            ${!saved.isCorrect && showCorrect ? ` (Answer: ${Array.isArray(q.answer)?q.answer.join(', '):q.answer})` : ''}
          </div>` : '' }`;
    container.appendChild(card);
  });
  attachQuestionListeners();
}

function renderInput(q, savedAnswer, disabled) {
  let html = '';
  switch (q.type) {
    case 'mcq':
    case 'tf':
    case 'tfng':
    case 'ynng':
      let opts = q.options;
      if (!opts) {
        if (q.type === 'tf') opts = ['True','False'];
        else if (q.type === 'tfng') opts = ['True','False','Not Given'];
        else if (q.type === 'ynng') opts = ['Yes','No','Not Given'];
        else opts = ['A','B','C','D'];
      }
      opts.forEach(opt => {
        const checked = savedAnswer === opt ? 'checked' : '';
        html += `<label class="option-item ${savedAnswer===opt?'selected':''}">
          <input type="radio" name="q${q.id}" value="${opt}" ${checked} ${disabled?'disabled':''}> ${opt}
        </label>`;
      });
      break;
    case 'matching':
      const matchOpts = q.matchingOptions || ['A','B','C','D','E','F','G','H'];
      html += `<select class="text-input" ${disabled?'disabled':''}>`;
      html += `<option value="">-- Select --</option>`;
      matchOpts.forEach(o => html += `<option value="${o}" ${savedAnswer===o?'selected':''}>${o}</option>`);
      html += `</select>`;
      break;
    case 'multiple-answer':
      (q.options||[]).forEach(opt => {
        const checked = Array.isArray(savedAnswer) && savedAnswer.includes(opt) ? 'checked' : '';
        html += `<label class="option-item"><input type="checkbox" value="${opt}" ${checked} ${disabled?'disabled':''}> ${opt}</label>`;
      });
      break;
    default: // text input
      html += `<input type="text" class="text-input" value="${savedAnswer||''}" ${disabled?'disabled':''}>`;
  }
  return html;
}

function attachQuestionListeners() {
  const container = document.getElementById('questionsContainer');
  container.addEventListener('change', (e) => {
    if (isSubmitted) return;
    const card = e.target.closest('.question-card');
    if (!card) return;
    const idx = Array.from(card.parentNode.children).indexOf(card);
    const q = getCurrentPageQuestions()[idx];
    if (!q) return;
    let ans;
    if (q.type === 'multiple-answer') {
      ans = Array.from(card.querySelectorAll('input[type="checkbox"]:checked')).map(cb=>cb.value);
    } else if (q.type === 'matching' || q.type === 'fill-blank' || q.type === 'sentence-completion' || q.type === 'short-answer') {
      const sel = card.querySelector('select, input');
      ans = sel ? sel.value : '';
    } else {
      const radio = card.querySelector('input[type="radio"]:checked');
      ans = radio ? radio.value : '';
    }
    saveQuizAnswer(q, ans);
    if (mode === 'practice') reRenderQuizCard(card, q);
    updateProgress();
    saveQuizSession();
  });
}

function saveQuizAnswer(q, answer) {
  const key = `${currentPage}-${q.id}`;
  const isCorrect = checkQuizAnswer(q, answer);
  userAnswers[key] = { answer, isCorrect };
}

function checkQuizAnswer(q, userAns) {
  const correct = q.answer;
  if (Array.isArray(correct)) {
    if (!Array.isArray(userAns)) return false;
    const sortedUser = [...userAns].sort().map(s=>s.trim().toLowerCase());
    const sortedCorrect = [...correct].sort().map(s=>s.trim().toLowerCase());
    return sortedUser.length === sortedCorrect.length && sortedUser.every((v,i)=>v===sortedCorrect[i]);
  } else {
    return String(userAns||'').trim().toLowerCase() === String(correct).trim().toLowerCase();
  }
}

function reRenderQuizCard(card, q) {
  const saved = userAnswers[`${currentPage}-${q.id}`];
  if (!saved) return;
  card.classList.toggle('correct', saved.isCorrect);
  card.classList.toggle('incorrect', !saved.isCorrect);
  let fb = card.querySelector('.feedback');
  if (!fb) {
    fb = document.createElement('div');
    fb.className = 'feedback';
    card.appendChild(fb);
  }
  const correctTxt = Array.isArray(q.answer) ? q.answer.join(', ') : q.answer;
  fb.className = `feedback ${saved.isCorrect?'correct':'incorrect'}`;
  fb.innerHTML = `${saved.isCorrect ? '✅ Correct' : '❌ Incorrect'} ${!saved.isCorrect && showCorrect ? `(Correct: ${correctTxt})` : ''}`;
}

function updateProgress() {
  const allQs = quizData?.pages?.flatMap(p => p.questions.map(q => ({...q, page: p.page}))) || [];
  const total = allQs.length;
  const answered = Object.keys(userAnswers).filter(k => userAnswers[k]?.answer !== undefined && userAnswers[k]?.answer !== '').length;
  const perc = total ? Math.round((answered/total)*100) : 0;
  document.getElementById('progressFill').style.width = perc+'%';
  document.getElementById('answeredCount').textContent = `${answered}/${total}`;
  document.getElementById('percentageLabel').textContent = `${perc}%`;
}

function submitQuiz() {
  if (isSubmitted) return;
  clearInterval(timerInterval);
  timerRunning = false;
  isSubmitted = true;
  // Ensure all questions are saved (fill missing with blank)
  const allQs = quizData.pages.flatMap(p => p.questions.map(q => ({...q, page: p.page})));
  allQs.forEach(q => {
    const key = `${q.page}-${q.id}`;
    if (!userAnswers[key]) userAnswers[key] = { answer: '', isCorrect: false };
  });
  showQuizResult();
  updateDashboard(quizData.id, getScorePercentage());
}

function getScorePercentage() {
  const all = quizData.pages.flatMap(p => p.questions);
  const correct = all.filter(q => userAnswers[`${q.page}-${q.id}`]?.isCorrect).length;
  return Math.round((correct / all.length) * 100);
}

function showQuizResult() {
  document.getElementById('quizMain').style.display = 'none';
  document.getElementById('quizControls').style.display = 'none';
  const resultPage = document.getElementById('resultPage');
  resultPage.style.display = 'block';
  const allQs = quizData.pages.flatMap(p => p.questions.map(q => ({...q, page: p.page})));
  const total = allQs.length;
  let correct = 0;
  allQs.forEach(q => {
    if (userAnswers[`${q.page}-${q.id}`]?.isCorrect) correct++;
  });
  const incorrect = total - correct;
  const percent = getScorePercentage();
  const band = (correct/total*10).toFixed(1);
  document.getElementById('bandScoreDisplay').textContent = `${band} / 10`;
  document.getElementById('scoreSummary').textContent = `${correct}/${total} Correct – ${percent}%`;
  document.getElementById('statsGrid').innerHTML = `
    <div class="stat-card"><div>📝</div><div>${total}</div><small>Total</small></div>
    <div class="stat-card"><div>✅</div><div>${correct}</div><small>Correct</small></div>
    <div class="stat-card"><div>❌</div><div>${incorrect}</div><small>Incorrect</small></div>
    <div class="stat-card"><div>🎯</div><div>${percent}%</div><small>Accuracy</small></div>
  `;
  renderPieChart(correct, incorrect);
  renderReviewTable('all');
}

function renderPieChart(correct, incorrect) {
  const ctx = document.getElementById('pieChart')?.getContext('2d');
  if (!ctx) return;
  if (window.pieInstance) window.pieInstance.destroy();
  window.pieInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Correct','Incorrect'],
      datasets: [{ data: [correct, incorrect], backgroundColor: ['#10b981','#ef4444'] }]
    },
    options: { cutout:'65%', plugins:{ legend:{position:'bottom'} } }
  });
}

function renderReviewTable(filter) {
  const allQs = quizData.pages.flatMap(p => p.questions.map(q => ({...q, page: p.page})));
  let filtered = allQs;
  if (filter === 'correct') filtered = allQs.filter(q => userAnswers[`${q.page}-${q.id}`]?.isCorrect);
  else if (filter === 'incorrect') filtered = allQs.filter(q => !userAnswers[`${q.page}-${q.id}`]?.isCorrect);
  const tbody = document.querySelector('#reviewTable tbody');
  tbody.innerHTML = filtered.map(q => {
    const ua = userAnswers[`${q.page}-${q.id}`];
    const userAns = ua ? (Array.isArray(ua.answer) ? ua.answer.join(', ') : ua.answer) : '—';
    const correctAns = Array.isArray(q.answer) ? q.answer.join(', ') : q.answer;
    return `<tr>
      <td>${q.id}</td>
      <td>${userAns}</td>
      <td>${correctAns}</td>
      <td>${ua?.isCorrect ? '✅' : '❌'}</td>
    </tr>`;
  }).join('');
}

function setupQuizListeners() {
  document.getElementById('modeToggle').addEventListener('click', () => {
    mode = mode === 'practice' ? 'exam' : 'practice';
    document.getElementById('modeToggle').textContent = mode === 'exam' ? 'Exam Mode' : 'Practice Mode';
    document.getElementById('showCorrectToggle').checked = mode === 'practice';
    showCorrect = mode === 'practice';
    renderAnswerSheet();
  });
  document.getElementById('showCorrectToggle').addEventListener('change', function() {
    showCorrect = this.checked;
    if (mode === 'exam') this.checked = false;
    renderAnswerSheet();
  });
  document.getElementById('startTimerBtn').addEventListener('click', startTimer);
  document.getElementById('submitQuizBtn').addEventListener('click', submitQuiz);
  document.getElementById('zoomInBtn').addEventListener('click', () => zoomPDF(0.2));
  document.getElementById('zoomOutBtn').addEventListener('click', () => zoomPDF(-0.2));
  document.getElementById('prevPageBtn').addEventListener('click', () => navigatePDF(-1));
  document.getElementById('nextPageBtn').addEventListener('click', () => navigatePDF(1));
  document.getElementById('fullscreenBtn').addEventListener('click', () => document.getElementById('pdfContainer').requestFullscreen?.());
  document.getElementById('retryQuizBtn').addEventListener('click', resetQuiz);
  document.getElementById('reviewAnswersBtn').addEventListener('click', () => {
    document.getElementById('resultPage').style.display = 'none';
    document.getElementById('quizMain').style.display = 'flex';
    document.getElementById('quizControls').style.display = 'block';
  });
  document.getElementById('printResultBtn').addEventListener('click', () => window.print());
  document.querySelectorAll('.filter-btn').forEach(btn => btn.addEventListener('click', function() {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    renderReviewTable(this.dataset.filter);
  }));
}

function startTimer() {
  if (timerRunning || isSubmitted) return;
  timerRunning = true;
  timerInterval = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay();
    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      submitQuiz();
    }
  }, 1000);
}
function updateTimerDisplay() {
  const mins = Math.floor(timeRemaining / 60);
  const secs = timeRemaining % 60;
  document.getElementById('timerDisplay').textContent = `${mins}:${secs.toString().padStart(2,'0')}`;
}
function resetQuiz() {
  clearInterval(timerInterval);
  timerRunning = false;
  isSubmitted = false;
  userAnswers = {};
  timeRemaining = (quizData.duration || 60) * 60;
  updateTimerDisplay();
  document.getElementById('resultPage').style.display = 'none';
  document.getElementById('quizMain').style.display = 'flex';
  document.getElementById('quizControls').style.display = 'block';
  renderAnswerSheet();
  updateProgress();
}
function saveQuizSession() {
  const session = { answers: userAnswers, currentPage, timeRemaining, timerRunning, mode, showCorrect };
  sessionStorage.setItem('quizSession', JSON.stringify(session));
}
function restoreQuizSession() {
  const saved = sessionStorage.getItem('quizSession');
  if (saved) {
    const s = JSON.parse(saved);
    userAnswers = s.answers || {};
    currentPage = s.currentPage || 1;
    timeRemaining = s.timeRemaining || (quizData.duration * 60);
    timerRunning = s.timerRunning || false;
    mode = s.mode || 'practice';
    showCorrect = s.showCorrect !== undefined ? s.showCorrect : true;
    updateTimerDisplay();
    document.getElementById('modeToggle').textContent = mode === 'exam' ? 'Exam Mode' : 'Practice Mode';
    document.getElementById('showCorrectToggle').checked = showCorrect;
    if (timerRunning) startTimer();
  }
}

// ======================== INIT ========================
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  if (document.getElementById('darkModeToggle')) {
    document.getElementById('darkModeToggle').addEventListener('click', toggleTheme);
  }
  // Home page
  if (document.getElementById('articlesGrid')) {
    loadHomeData();
    document.getElementById('searchInput').addEventListener('input', (e) => {
      searchTerm = e.target.value.toLowerCase();
      applyFilters();
    });
    document.getElementById('categoryFilter').addEventListener('change', (e) => {
      currentFilter = e.target.value;
      applyFilters();
    });
    // Mobile nav toggle
    document.getElementById('hamburger')?.addEventListener('click', () => {
      document.getElementById('navLinks').classList.toggle('active');
    });
  }
  // Article page
  if (document.querySelector('.article-page')) {
    loadArticle();
  }
  // Quiz page
  if (document.querySelector('.quiz-page')) {
    loadQuiz();
  }
});
