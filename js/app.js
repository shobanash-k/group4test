/* ==========================================================================
   app.js – Main Application Controller, Dashboard, Filters & View Routing
   ========================================================================== */

(function (window) {
  'use strict';

  const AppState = {
    currentView: 'home',
    currentSubject: 'tamil',
    subjectFilters: {
      status: 'all',
      topic: 'all',
      difficulty: 'all'
    },
    homeFilters: {
      search: '',
      subject: 'all',
      topic: 'all',
      difficulty: 'all',
      status: 'all'
    },
    pendingConfirmCallback: null,
    toastTimer: null
  };

  function showView(viewName) {
    AppState.currentView = viewName;
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    const target = document.getElementById(`view-${viewName}`);
    if (target) target.classList.add('active');

    // Update header active nav state
    document.querySelectorAll('.nav-link').forEach((btn) => {
      const nav = btn.getAttribute('data-nav');
      const isActive =
        (viewName === 'home' && nav === 'home') ||
        (viewName === 'subject' && nav === AppState.currentSubject);
      btn.classList.toggle('active', isActive);
    });

    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function setLoading(isLoading) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.toggle('hidden', !isLoading);
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    if (AppState.toastTimer) clearTimeout(AppState.toastTimer);
    AppState.toastTimer = setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }

  function showConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    AppState.pendingConfirmCallback = onConfirm;
    modal.classList.remove('hidden');
  }

  function hideConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    modal.classList.add('hidden');
    AppState.pendingConfirmCallback = null;
  }

  /* ==================== HOMEPAGE DASHBOARD ==================== */
  function renderDashboard() {
    const overall = window.TNPSCStorage.getOverallStats();

    document.getElementById('stat-completed-tests').textContent = `${overall.completedTests} / ${overall.totalTests}`;
    document.getElementById('stat-inprogress-sub').textContent = `தொடரும் தேர்வுகள்: ${overall.inProgressTests}`;
    document.getElementById('stat-avg-score').textContent = `${overall.averageScore}%`;
    document.getElementById('stat-answered-total').textContent = `மொத்த பதில்கள்: ${overall.totalAnswered.toLocaleString('en-IN')}`;
    document.getElementById('stat-overall-progress').textContent = `${overall.overallProgress}%`;
    document.getElementById('stat-overall-bar').style.width = `${overall.overallProgress}%`;

    // Overall circular ring (r = 50 -> circumference = 314.16)
    const ring = document.getElementById('home-overall-ring');
    const circumference = 2 * Math.PI * 50;
    const offset = circumference - (overall.overallProgress / 100) * circumference;
    ring.style.strokeDasharray = `${circumference.toFixed(2)}`;
    ring.style.strokeDashoffset = `${offset.toFixed(2)}`;
    document.getElementById('home-overall-percent').textContent = `${overall.overallProgress}%`;
    document.getElementById('home-overall-summary').textContent = `30 தேர்வுகளில் ${overall.completedTests} முடிந்தது`;

    // Update 3 Subject Cards
    ['tamil', 'maths', 'gk'].forEach((subj) => {
      const s = window.TNPSCStorage.getSubjectStats(subj);
      document.getElementById(`card-${subj}-completed`).textContent = `முடித்தவை: ${s.completed} / 10`;
      document.getElementById(`card-${subj}-avg`).textContent = `சராசரி: ${s.avgScore}%`;
      document.getElementById(`card-${subj}-bar`).style.width = `${s.progressPercent}%`;
    });

    // Resume Banner / Button if user has an in-progress test
    const resumeTest = window.TNPSCStorage.getLastInProgressTest();
    const heroSlot = document.getElementById('hero-resume-slot');
    const headerResumeBtn = document.getElementById('header-resume-btn');
    heroSlot.innerHTML = '';

    if (resumeTest) {
      const meta = window.TNPSCLoader.SUBJECT_META[resumeTest.subject];
      const padT = window.TNPSCLoader.pad2(resumeTest.testNumber);

      const resumeBtn = document.createElement('button');
      resumeBtn.type = 'button';
      resumeBtn.className = 'btn btn-primary';
      resumeBtn.textContent = `தேர்வைத் தொடரவும்: ${meta.shortName} – தேர்வு ${padT} (${resumeTest.answeredCount}/100)`;
      resumeBtn.addEventListener('click', () => launchTest(resumeTest.subject, resumeTest.testNumber));
      heroSlot.appendChild(resumeBtn);

      headerResumeBtn.classList.remove('hidden');
      headerResumeBtn.textContent = `தொடரவும்: தேர்வு ${padT}`;
      headerResumeBtn.onclick = () => launchTest(resumeTest.subject, resumeTest.testNumber);
    } else {
      const startBtn = document.createElement('button');
      startBtn.type = 'button';
      startBtn.className = 'btn btn-primary';
      startBtn.textContent = 'பொதுத்தமிழ் தேர்வு 01-ஐத் தொடங்கு →';
      startBtn.addEventListener('click', () => launchTest('tamil', 1));
      heroSlot.appendChild(startBtn);

      headerResumeBtn.classList.add('hidden');
    }

    populateHomeTopicOptions();
    renderHomeFilteredTests();
  }

  function populateHomeTopicOptions() {
    const manifest = window.TNPSCLoader.getManifest();
    const subjFilter = AppState.homeFilters.subject;
    const topicSelect = document.getElementById('home-filter-topic');
    const currentVal = AppState.homeFilters.topic;

    const topicSet = new Set();
    manifest.tests.forEach((t) => {
      if (subjFilter === 'all' || t.subject === subjFilter) {
        (t.topics || []).forEach((tp) => topicSet.add(tp));
      }
    });

    topicSelect.innerHTML = '<option value="all">அனைத்துத் தலைப்புகள்</option>';
    Array.from(topicSet)
      .sort()
      .forEach((tp) => {
        const opt = document.createElement('option');
        opt.value = tp;
        opt.textContent = tp;
        topicSelect.appendChild(opt);
      });

    if (topicSet.has(currentVal)) {
      topicSelect.value = currentVal;
    } else {
      AppState.homeFilters.topic = 'all';
      topicSelect.value = 'all';
    }
  }

  function renderHomeFilteredTests() {
    const manifest = window.TNPSCLoader.getManifest();
    const f = AppState.homeFilters;
    const container = document.getElementById('home-filtered-tests');
    const countEl = document.getElementById('home-filter-count');

    const matches = manifest.tests.filter((t) => {
      const status = window.TNPSCStorage.getTestStatus(t.subject, t.testNumber);
      const subjName = window.TNPSCLoader.SUBJECT_META[t.subject].name;

      if (f.subject !== 'all' && t.subject !== f.subject) return false;
      if (f.status !== 'all' && status !== f.status) return false;
      if (f.topic !== 'all' && !(t.topics || []).includes(f.topic)) return false;
      if (f.difficulty !== 'all' && (!t.difficulties || !t.difficulties[f.difficulty])) return false;

      if (f.search) {
        const hay = `${subjName} தேர்வு ${window.TNPSCLoader.pad2(t.testNumber)} test ${t.testNumber} ${(t.topics || []).join(' ')}`.toLowerCase();
        if (!hay.includes(f.search.toLowerCase())) return false;
      }
      return true;
    });

    countEl.textContent = `பொருந்தும் தேர்வுகள்: ${matches.length} / 30`;
    container.innerHTML = '';

    if (matches.length === 0) {
      container.innerHTML = '<div class="empty-state">தேர்ந்தெடுத்த வடிகட்டிக்குப் பொருந்தும் தேர்வுகள் எதுவும் இல்லை.</div>';
      return;
    }

    const frag = document.createDocumentFragment();
    matches.forEach((t) => {
      frag.appendChild(createTestCard(t, true));
    });
    container.appendChild(frag);
  }

  /* ==================== SUBJECT-WISE TEST SELECTION ==================== */
  function openSubjectView(subject) {
    AppState.currentSubject = subject;
    AppState.subjectFilters = { status: 'all', topic: 'all', difficulty: 'all' };
    window.TNPSCStorage.setSelectedSubject(subject);

    const meta = window.TNPSCLoader.SUBJECT_META[subject];
    document.getElementById('subject-view-icon').src = meta.icon;
    document.getElementById('subject-view-title').textContent = meta.name;
    document.getElementById('subject-view-desc').textContent = meta.description;

    const stats = window.TNPSCStorage.getSubjectStats(subject);
    document.getElementById('subject-view-completed').textContent = `${stats.completed} / 10`;
    document.getElementById('subject-view-avg').textContent = `${stats.avgScore}%`;

    // Populate subject topics dropdown
    const manifest = window.TNPSCLoader.getManifest();
    const topicSet = new Set();
    manifest.tests
      .filter((t) => t.subject === subject)
      .forEach((t) => (t.topics || []).forEach((tp) => topicSet.add(tp)));

    const topicSelect = document.getElementById('subject-topic-filter');
    topicSelect.innerHTML = '<option value="all">அனைத்துத் தலைப்புகள்</option>';
    Array.from(topicSet)
      .sort()
      .forEach((tp) => {
        const opt = document.createElement('option');
        opt.value = tp;
        opt.textContent = tp;
        topicSelect.appendChild(opt);
      });

    document.getElementById('subject-difficulty-filter').value = 'all';
    document.querySelectorAll('#subject-status-pills .pill-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-status') === 'all');
    });

    renderSubjectTests();
    showView('subject');
  }

  function renderSubjectTests() {
    const manifest = window.TNPSCLoader.getManifest();
    const f = AppState.subjectFilters;
    const container = document.getElementById('subject-tests-grid');

    const tests = manifest.tests.filter((t) => {
      if (t.subject !== AppState.currentSubject) return false;
      const status = window.TNPSCStorage.getTestStatus(t.subject, t.testNumber);
      if (f.status !== 'all' && status !== f.status) return false;
      if (f.topic !== 'all' && !(t.topics || []).includes(f.topic)) return false;
      if (f.difficulty !== 'all' && (!t.difficulties || !t.difficulties[f.difficulty])) return false;
      return true;
    });

    container.innerHTML = '';
    if (tests.length === 0) {
      container.innerHTML = '<div class="empty-state">இந்த வடிகட்டியில் தேர்வுகள் எதுவும் இல்லை.</div>';
      return;
    }

    const frag = document.createDocumentFragment();
    tests.forEach((t) => frag.appendChild(createTestCard(t, false)));
    container.appendChild(frag);
  }

  function createTestCard(testMeta, showSubjectTag) {
    const subject = testMeta.subject;
    const testNum = testMeta.testNumber;
    const padNum = window.TNPSCLoader.pad2(testNum);
    const subjMeta = window.TNPSCLoader.SUBJECT_META[subject];
    const progress = window.TNPSCStorage.getTestProgress(subject, testNum);
    const status = window.TNPSCStorage.getTestStatus(subject, testNum);

    const card = document.createElement('article');
    card.className = 'test-card';

    const statusBadgeMap = {
      completed: { cls: 'status-completed', text: 'முடிந்தது' },
      inprogress: { cls: 'status-inprogress', text: 'தொடர்கிறது' },
      unattempted: { cls: 'status-unattempted', text: 'தொடங்கப்படவில்லை' }
    };
    const sb = statusBadgeMap[status];

    const answered = progress ? progress.answeredCount : 0;
    const pct = Math.round((answered / 100) * 100);
    const score = progress ? progress.score : 0;
    const lastDate = progress && progress.lastAttempted
      ? window.TNPSCStorage.formatDateTamil(progress.lastAttempted)
      : '';

    const topicChips = (testMeta.topics || [])
      .slice(0, 4)
      .map((tp) => `<span class="topic-chip">${escapeHtml(tp)}</span>`)
      .join('');

    card.innerHTML = `
      <div class="test-card-head">
        <div>
          ${showSubjectTag ? `<span class="test-card-subject-tag">${escapeHtml(subjMeta.name)}</span>` : ''}
          <h3 class="test-card-title">தேர்வு ${padNum} – கேள்விகள் ${testMeta.startId}–${testMeta.endId}</h3>
          <div class="test-card-range">100 தனித்துவமான கேள்விகள் • உடனடி விடை &amp; விளக்கம்</div>
        </div>
        <span class="status-badge ${sb.cls}">${sb.text}</span>
      </div>
      ${topicChips ? `<div class="test-topics-row">${topicChips}</div>` : ''}
      <div class="test-card-progress">
        <div class="test-card-stats">
          <span>பதிலளித்தவை: ${answered} / 100</span>
          ${status === 'completed'
            ? `<span class="test-score-highlight">மதிப்பெண்: ${score} / 100 (${score}%)</span>`
            : status === 'inprogress'
              ? `<span>தற்போதைய மதிப்பெண்: ${score}</span>`
              : '<span>மதிப்பெண்: —</span>'}
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${pct}%"></div>
        </div>
        ${lastDate ? `<div class="test-card-range">கடைசி முயற்சி: ${lastDate}</div>` : ''}
      </div>
      <div class="test-card-actions"></div>
    `;

    const actionsEl = card.querySelector('.test-card-actions');

    if (status === 'unattempted') {
      const startBtn = document.createElement('button');
      startBtn.type = 'button';
      startBtn.className = 'btn btn-primary btn-sm';
      startBtn.textContent = 'தேர்வைத் தொடங்கு';
      startBtn.addEventListener('click', () => launchTest(subject, testNum));
      actionsEl.appendChild(startBtn);
    } else if (status === 'inprogress') {
      const resumeBtn = document.createElement('button');
      resumeBtn.type = 'button';
      resumeBtn.className = 'btn btn-primary btn-sm';
      resumeBtn.textContent = 'தொடரவும்';
      resumeBtn.addEventListener('click', () => launchTest(subject, testNum));
      actionsEl.appendChild(resumeBtn);

      const restartBtn = document.createElement('button');
      restartBtn.type = 'button';
      restartBtn.className = 'btn btn-outline btn-sm';
      restartBtn.textContent = 'மீண்டும் தொடங்கு';
      restartBtn.addEventListener('click', () => confirmRestartFromCard(subject, testNum));
      actionsEl.appendChild(restartBtn);
    } else {
      const resultBtn = document.createElement('button');
      resultBtn.type = 'button';
      resultBtn.className = 'btn btn-soft btn-sm';
      resultBtn.textContent = 'முடிவு & மதிப்பாய்வு';
      resultBtn.addEventListener('click', () => openSavedResults(subject, testNum));
      actionsEl.appendChild(resultBtn);

      const retakeBtn = document.createElement('button');
      retakeBtn.type = 'button';
      retakeBtn.className = 'btn btn-outline btn-sm';
      retakeBtn.textContent = 'மீண்டும் எழுது';
      retakeBtn.addEventListener('click', () => confirmRestartFromCard(subject, testNum, true));
      actionsEl.appendChild(retakeBtn);
    }

    return card;
  }

  function confirmRestartFromCard(subject, testNumber, launchAfter) {
    const subjName = window.TNPSCLoader.SUBJECT_META[subject].name;
    const padNum = window.TNPSCLoader.pad2(testNumber);
    showConfirmModal(
      'தேர்வை மீண்டும் தொடங்கவா?',
      `${subjName} – தேர்வு ${padNum} இன் முந்தைய பதில்கள் மற்றும் மதிப்பெண் மட்டும் அழிக்கப்படும். தொடர விரும்புகிறீர்களா?`,
      () => {
        window.TNPSCStorage.resetTest(subject, testNumber);
        if (launchAfter) {
          launchTest(subject, testNumber);
        } else {
          if (AppState.currentView === 'home') renderDashboard();
          if (AppState.currentView === 'subject') openSubjectView(AppState.currentSubject);
          showToast(`தேர்வு ${padNum} மீட்டமைக்கப்பட்டது.`);
        }
      }
    );
  }

  /* ==================== LAUNCH TEST / RESULTS ==================== */
  async function launchTest(subject, testNumber, startIndex) {
    setLoading(true);
    try {
      const questions = await window.TNPSCLoader.loadTest(subject, testNumber);
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('கேள்விகள் கிடைக்கவில்லை');
      }
      window.TNPSCQuiz.start(subject, testNumber, questions, startIndex);
      showView('quiz');
    } catch (err) {
      showToast('தேர்வுக் கேள்விகளை ஏற்றுவதில் பிழை ஏற்பட்டது.');
    } finally {
      setLoading(false);
    }
  }

  async function openSavedResults(subject, testNumber) {
    setLoading(true);
    try {
      const questions = await window.TNPSCLoader.loadTest(subject, testNumber);
      const record = window.TNPSCStorage.getTestProgress(subject, testNumber);
      window.TNPSCResults.renderResults(subject, testNumber, questions, record);
      window.TNPSCStorage.setActiveSession(subject, testNumber, 0, 'results');
      showView('results');
    } catch (err) {
      showToast('தேர்வு முடிவுகளை ஏற்றுவதில் பிழை ஏற்பட்டது.');
    } finally {
      setLoading(false);
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ==================== BOOTSTRAP & EVENT WIRING ==================== */
  function bindGlobalEvents() {
    document.getElementById('brand-home-btn').addEventListener('click', () => {
      window.TNPSCStorage.clearActiveSession();
      renderDashboard();
      showView('home');
    });

    document.querySelectorAll('.nav-link').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nav = btn.getAttribute('data-nav');
        window.TNPSCStorage.clearActiveSession();
        if (nav === 'home') {
          renderDashboard();
          showView('home');
        } else {
          openSubjectView(nav);
        }
      });
    });

    document.querySelectorAll('[data-open-subject]').forEach((btn) => {
      btn.addEventListener('click', () => {
        openSubjectView(btn.getAttribute('data-open-subject'));
      });
    });

    document.getElementById('subject-back-home').addEventListener('click', () => {
      window.TNPSCStorage.clearActiveSession();
      renderDashboard();
      showView('home');
    });

    // Home Explorer filters
    document.getElementById('home-search-input').addEventListener('input', (e) => {
      AppState.homeFilters.search = e.target.value.trim();
      renderHomeFilteredTests();
    });

    document.getElementById('home-filter-subject').addEventListener('change', (e) => {
      AppState.homeFilters.subject = e.target.value;
      populateHomeTopicOptions();
      renderHomeFilteredTests();
    });

    document.getElementById('home-filter-topic').addEventListener('change', (e) => {
      AppState.homeFilters.topic = e.target.value;
      renderHomeFilteredTests();
    });

    document.getElementById('home-filter-difficulty').addEventListener('change', (e) => {
      AppState.homeFilters.difficulty = e.target.value;
      renderHomeFilteredTests();
    });

    document.getElementById('home-filter-status').addEventListener('change', (e) => {
      AppState.homeFilters.status = e.target.value;
      renderHomeFilteredTests();
    });

    document.getElementById('home-filter-reset').addEventListener('click', () => {
      AppState.homeFilters = { search: '', subject: 'all', topic: 'all', difficulty: 'all', status: 'all' };
      document.getElementById('home-search-input').value = '';
      document.getElementById('home-filter-subject').value = 'all';
      document.getElementById('home-filter-difficulty').value = 'all';
      document.getElementById('home-filter-status').value = 'all';
      populateHomeTopicOptions();
      renderHomeFilteredTests();
    });

    // Subject view filters
    document.getElementById('subject-status-pills').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-status]');
      if (!btn) return;
      AppState.subjectFilters.status = btn.getAttribute('data-status');
      document.querySelectorAll('#subject-status-pills .pill-btn').forEach((b) => {
        b.classList.toggle('active', b === btn);
      });
      renderSubjectTests();
    });

    document.getElementById('subject-topic-filter').addEventListener('change', (e) => {
      AppState.subjectFilters.topic = e.target.value;
      renderSubjectTests();
    });

    document.getElementById('subject-difficulty-filter').addEventListener('change', (e) => {
      AppState.subjectFilters.difficulty = e.target.value;
      renderSubjectTests();
    });

    // Modal controls
    document.getElementById('modal-cancel-btn').addEventListener('click', hideConfirmModal);
    document.getElementById('modal-confirm-btn').addEventListener('click', () => {
      const cb = AppState.pendingConfirmCallback;
      hideConfirmModal();
      if (cb) cb();
    });
    document.getElementById('confirm-modal').addEventListener('click', (e) => {
      if (e.target.id === 'confirm-modal') hideConfirmModal();
    });
    document.addEventListener('keydown', (e) => {
      const modal = document.getElementById('confirm-modal');
      if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
        hideConfirmModal();
      }
    });
  }

  function restoreSessionIfActive() {
    const active = window.TNPSCStorage.getActiveSession();
    if (!active || !active.subject || !active.testNumber) {
      renderDashboard();
      showView('home');
      return;
    }

    if (active.view === 'quiz') {
      renderDashboard();
      launchTest(active.subject, active.testNumber, active.currentQuestion);
    } else if (active.view === 'results') {
      renderDashboard();
      openSavedResults(active.subject, active.testNumber);
    } else {
      renderDashboard();
      showView('home');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.TNPSCQuiz.init({
      onExit(subject) {
        window.TNPSCStorage.clearActiveSession();
        openSubjectView(subject);
      },
      onFinish(subject, testNumber, questions, summary) {
        window.TNPSCResults.renderResults(subject, testNumber, questions, summary);
        showView('results');
      },
      onRequestConfirm: showConfirmModal,
      onToast: showToast
    });

    window.TNPSCResults.init({
      onRetake(subject, testNumber) {
        confirmRestartFromCard(subject, testNumber, true);
      },
      onHome() {
        window.TNPSCStorage.clearActiveSession();
        renderDashboard();
        showView('home');
      },
      onOpenReview() {
        showView('review');
      },
      onBackToResults() {
        showView('results');
      }
    });

    bindGlobalEvents();
    restoreSessionIfActive();
  });
})(window);

