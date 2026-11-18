/* ==========================================================================
   results.js – Results Page, Circular Score Ring, Topic Summary & Review Screen
   ========================================================================== */

(function (window) {
  'use strict';

  const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

  const state = {
    subject: null,
    testNumber: null,
    questions: [],
    record: null,
    reviewFilter: 'all',
    reviewTopic: 'all',
    reviewDifficulty: 'all',
    reviewSearch: '',
    callbacks: {
      onRetake: null,
      onHome: null,
      onOpenReview: null,
      onBackToResults: null
    }
  };

  const els = {};

  function cacheDom() {
    els.subjectBadge = document.getElementById('results-subject-badge');
    els.date = document.getElementById('results-date');
    els.scoreRing = document.getElementById('results-score-ring');
    els.percent = document.getElementById('results-percent');
    els.fraction = document.getElementById('results-fraction');
    els.gradeTitle = document.getElementById('results-grade-title');
    els.gradeMessage = document.getElementById('results-grade-message');

    els.resTotal = document.getElementById('res-total');
    els.resAnswered = document.getElementById('res-answered');
    els.resCorrect = document.getElementById('res-correct');
    els.resWrong = document.getElementById('res-wrong');
    els.resScoreText = document.getElementById('res-score-text');
    els.resPercentText = document.getElementById('res-percent-text');
    els.topicSummary = document.getElementById('results-topic-summary');

    els.btnReviewAll = document.getElementById('btn-review-all');
    els.btnReviewWrong = document.getElementById('btn-review-wrong');
    els.btnRetake = document.getElementById('btn-retake-test');
    els.btnHome = document.getElementById('btn-results-home');

    // Review Screen elements
    els.reviewTitle = document.getElementById('review-title');
    els.reviewSubtitle = document.getElementById('review-subtitle');
    els.reviewBackResults = document.getElementById('review-back-results');
    els.reviewGoHome = document.getElementById('review-go-home');
    els.reviewStatusPills = document.getElementById('review-status-pills');
    els.reviewTopicFilter = document.getElementById('review-topic-filter');
    els.reviewDiffFilter = document.getElementById('review-difficulty-filter');
    els.reviewSearchInput = document.getElementById('review-search-input');
    els.reviewCountBar = document.getElementById('review-count-bar');
    els.reviewList = document.getElementById('review-list');
  }

  function bindEvents() {
    els.btnReviewAll.addEventListener('click', () => {
      openReview('all');
    });

    els.btnReviewWrong.addEventListener('click', () => {
      openReview('wrong');
    });

    els.btnRetake.addEventListener('click', () => {
      if (state.callbacks.onRetake) {
        state.callbacks.onRetake(state.subject, state.testNumber);
      }
    });

    els.btnHome.addEventListener('click', () => {
      if (state.callbacks.onHome) state.callbacks.onHome();
    });

    els.reviewBackResults.addEventListener('click', () => {
      if (state.callbacks.onBackToResults) state.callbacks.onBackToResults();
    });

    els.reviewGoHome.addEventListener('click', () => {
      if (state.callbacks.onHome) state.callbacks.onHome();
    });

    els.reviewStatusPills.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-review-filter]');
      if (!btn) return;
      state.reviewFilter = btn.getAttribute('data-review-filter');
      updateReviewPillUI();
      renderReviewList();
    });

    els.reviewTopicFilter.addEventListener('change', () => {
      state.reviewTopic = els.reviewTopicFilter.value;
      renderReviewList();
    });

    els.reviewDiffFilter.addEventListener('change', () => {
      state.reviewDifficulty = els.reviewDiffFilter.value;
      renderReviewList();
    });

    els.reviewSearchInput.addEventListener('input', () => {
      state.reviewSearch = els.reviewSearchInput.value.trim().toLowerCase();
      renderReviewList();
    });
  }

  function getGradeFeedback(percent) {
    if (percent >= 90) {
      return {
        title: 'மிகச்சிறந்த வெற்றி! (அருமை)',
        message: 'TNPSC Group 4 தேர்வில் முன்னணி மதிப்பெண் பெறும் அளவிற்கு உங்கள் தயாரிப்பு மிகச் சிறப்பாக உள்ளது. இதே வேகத்தைத் தக்கவைத்துக் கொள்ளுங்கள்!'
      };
    }
    if (percent >= 75) {
      return {
        title: 'சிறப்பான செயல்திறன்!',
        message: 'நல்ல மதிப்பெண் பெற்றுள்ளீர்கள். தவறான கேள்விகளின் விளக்கங்களை ஒருமுறை மதிப்பாய்வு செய்தால் 90% க்கும் மேல் எளிதாக எட்டலாம்.'
      };
    }
    if (percent >= 50) {
      return {
        title: 'நல்ல முயற்சி – மேலும் பயிற்சி தேவை',
        message: 'அடிப்படைப் புரிதல் நன்றாக உள்ளது. கீழே உள்ள தலைப்பு வாரியான செயல்திறனைப் பார்த்து, குறைவான மதிப்பெண் பெற்ற பகுதிகளை மீண்டும் படிக்கவும்.'
      };
    }
    return {
      title: 'தொடர்ந்து பயிற்சி செய்யுங்கள்!',
      message: 'கவலைப்பட வேண்டாம்! தவறான விடைகளுக்கான விளக்கங்களைக் கவனமாகப் படித்துவிட்டு, இந்தத் தேர்வை மீண்டும் ஒருமுறை எழுதிப் பாருங்கள்.'
    };
  }

  function renderResults(subject, testNumber, questions, record) {
    state.subject = subject;
    state.testNumber = Number(testNumber);
    state.questions = questions;
    state.record = record;

    const meta = window.TNPSCLoader.SUBJECT_META[subject];
    const total = questions.length;
    const answers = (record && record.answers) || {};

    let correct = 0;
    let wrong = 0;
    const topicMap = {};

    questions.forEach((q) => {
      const topic = q.topic || 'பொது';
      if (!topicMap[topic]) {
        topicMap[topic] = { total: 0, correct: 0, wrong: 0 };
      }
      topicMap[topic].total++;

      const ans = answers[String(q.id)];
      if (ans !== undefined) {
        if (ans === q.correctAnswer) {
          correct++;
          topicMap[topic].correct++;
        } else {
          wrong++;
          topicMap[topic].wrong++;
        }
      }
    });

    const answered = correct + wrong;
    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

    els.subjectBadge.textContent = `${meta.name} • தேர்வு ${window.TNPSCLoader.pad2(testNumber)}`;
    els.date.textContent = record && record.lastAttempted
      ? `கடைசியாக எழுதிய நாள்: ${window.TNPSCStorage.formatDateTamil(record.lastAttempted)}`
      : '';

    els.percent.textContent = `${percent}%`;
    els.fraction.textContent = `${correct} / ${total}`;

    // Animate SVG score ring (r = 68 -> circumference ≈ 427.26)
    const circumference = 2 * Math.PI * 68;
    const offset = circumference - (percent / 100) * circumference;
    els.scoreRing.style.strokeDasharray = `${circumference.toFixed(2)}`;
    els.scoreRing.style.strokeDashoffset = `${offset.toFixed(2)}`;
    if (percent >= 75) {
      els.scoreRing.style.stroke = '#15803D';
    } else if (percent >= 50) {
      els.scoreRing.style.stroke = '#A93412';
    } else {
      els.scoreRing.style.stroke = '#DC2626';
    }

    const grade = getGradeFeedback(percent);
    els.gradeTitle.textContent = grade.title;
    els.gradeMessage.textContent = grade.message;

    els.resTotal.textContent = String(total);
    els.resAnswered.textContent = String(answered);
    els.resCorrect.textContent = String(correct);
    els.resWrong.textContent = String(wrong);
    els.resScoreText.textContent = `${correct} / ${total}`;
    els.resPercentText.textContent = `${percent}%`;

    els.btnReviewWrong.disabled = wrong === 0;
    els.btnReviewWrong.textContent = wrong > 0
      ? `தவறான பதில்களை மட்டும் பார் (${wrong})`
      : 'தவறான பதில்கள் இல்லை';

    // Topic-wise Performance Summary
    const topicEntries = Object.entries(topicMap).sort((a, b) => b[1].total - a[1].total);
    els.topicSummary.innerHTML = '';
    topicEntries.forEach(([topicName, stats]) => {
      const tPct = Math.round((stats.correct / stats.total) * 100);
      const item = document.createElement('div');
      item.className = 'topic-bar-item';
      item.innerHTML = `
        <div class="topic-bar-head">
          <span>${escapeHtml(topicName)}</span>
          <span class="topic-bar-score">${stats.correct} / ${stats.total} (${tPct}%)</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width: ${tPct}%; background: ${tPct >= 75 ? '#15803D' : tPct >= 45 ? '#A93412' : '#DC2626'}"></div>
        </div>
      `;
      els.topicSummary.appendChild(item);
    });
  }

  function openReview(initialFilter) {
    state.reviewFilter = initialFilter || 'all';
    state.reviewTopic = 'all';
    state.reviewDifficulty = 'all';
    state.reviewSearch = '';

    const meta = window.TNPSCLoader.SUBJECT_META[state.subject];
    els.reviewTitle.textContent = `விடைகளை மதிப்பாய்வு செய் – தேர்வு ${window.TNPSCLoader.pad2(state.testNumber)}`;
    els.reviewSubtitle.textContent = `${meta.name} • மொத்த கேள்விகள்: ${state.questions.length}`;

    // Populate topic dropdown
    const topics = Array.from(new Set(state.questions.map((q) => q.topic || 'பொது')));
    els.reviewTopicFilter.innerHTML = '<option value="all">அனைத்துத் தலைப்புகள்</option>';
    topics.forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      els.reviewTopicFilter.appendChild(opt);
    });

    els.reviewDiffFilter.value = 'all';
    els.reviewSearchInput.value = '';
    updateReviewPillUI();
    renderReviewList();

    if (state.callbacks.onOpenReview) {
      state.callbacks.onOpenReview();
    }
  }

  function updateReviewPillUI() {
    const buttons = els.reviewStatusPills.querySelectorAll('[data-review-filter]');
    buttons.forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-review-filter') === state.reviewFilter);
    });
  }

  function renderReviewList() {
    const answers = (state.record && state.record.answers) || {};
    const filtered = [];

    state.questions.forEach((q, idx) => {
      const userAns = answers[String(q.id)];
      let status = 'unattempted';
      if (userAns !== undefined) {
        status = userAns === q.correctAnswer ? 'correct' : 'wrong';
      }

      if (state.reviewFilter !== 'all' && status !== state.reviewFilter) return;
      if (state.reviewTopic !== 'all' && (q.topic || 'பொது') !== state.reviewTopic) return;
      if (state.reviewDifficulty !== 'all' && (q.difficulty || 'medium') !== state.reviewDifficulty) return;
      if (state.reviewSearch) {
        const hay = `${q.question} ${q.topic} ${q.explanation} ${q.options.join(' ')}`.toLowerCase();
        if (!hay.includes(state.reviewSearch)) return;
      }

      filtered.push({ q, idx, userAns, status });
    });

    els.reviewCountBar.textContent = `காட்டப்படும் கேள்விகள்: ${filtered.length} / ${state.questions.length}`;
    els.reviewList.innerHTML = '';

    if (filtered.length === 0) {
      els.reviewList.innerHTML = '<div class="empty-state">தேர்ந்தெடுத்த வடிகட்டிக்குப் பொருந்தும் கேள்விகள் எதுவும் இல்லை.</div>';
      return;
    }

    const frag = document.createDocumentFragment();
    filtered.forEach(({ q, idx, userAns, status }) => {
      const card = document.createElement('article');
      card.className = `review-item rev-${status}`;

      const statusLabel =
        status === 'correct'
          ? '✓ சரியான பதில்'
          : status === 'wrong'
            ? '✗ தவறான பதில்'
            : '• பதிலளிக்காதது';

      const statusClass =
        status === 'correct'
          ? 'status-completed'
          : status === 'wrong'
            ? 'status-badge'
            : 'status-unattempted';

      const statusExtraStyle = status === 'wrong'
        ? 'background:#FEE2E2;color:#DC2626;border:1px solid #FCA5A5;'
        : '';

      const diffLabel = window.TNPSCLoader.DIFFICULTY_LABELS[q.difficulty] || 'நடுத்தரம்';

      const optionsHtml = q.options
        .map((opt, oIdx) => {
          const isCorrect = oIdx === q.correctAnswer;
          const isUserWrong = userAns !== undefined && userAns === oIdx && !isCorrect;
          let cls = 'review-opt';
          let tag = '';
          if (isCorrect) {
            cls += ' is-correct';
            tag = '<span>✓ சரியான விடை</span>';
          } else if (isUserWrong) {
            cls += ' is-user-wrong';
            tag = '<span>✗ உங்கள் தேர்வு</span>';
          }
          return `<div class="${cls}"><span><strong>${OPTION_LETTERS[oIdx]})</strong> ${escapeHtml(opt)}</span>${tag}</div>`;
        })
        .join('');

      card.innerHTML = `
        <div class="review-item-head">
          <div class="q-tags">
            <span class="q-number-badge">கேள்வி ${idx + 1}</span>
            <span class="q-topic-tag">${escapeHtml(q.topic || 'பொது')}</span>
            <span class="q-diff-tag diff-${q.difficulty || 'medium'}">${diffLabel}</span>
          </div>
          <span class="status-badge ${statusClass}" style="${statusExtraStyle}">${statusLabel}</span>
        </div>
        <p class="review-question-text">${escapeHtml(q.question)}</p>
        <div class="review-options">${optionsHtml}</div>
        <div class="review-explanation">
          <strong>விளக்கம்:</strong> ${escapeHtml(q.explanation)}
        </div>
      `;
      frag.appendChild(card);
    });

    els.reviewList.appendChild(frag);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  window.TNPSCResults = {
    init(callbacks) {
      cacheDom();
      state.callbacks = Object.assign(state.callbacks, callbacks || {});
      bindEvents();
    },
    renderResults,
    openReview
  };
})(window);

