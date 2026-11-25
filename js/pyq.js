/* ==========================================================================
   pyq.js – Previous Exam Questions (முந்தைய தேர்வு வினாக்கள்) Controller
   Independent, modular controller that does not touch existing code
   ========================================================================== */

(function (window) {
  'use strict';

  const PyqState = {
    filterSection: 'all',
    searchQuery: '',
    practiceIndex: 0,
    practiceQuestions: [],
    selectedAnswers: {}, // { [qId]: optionIndex }
    currentExamFilter: 'all'
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function init() {
    bindEvents();
    renderSummaryStats();
    renderPaperCards();
  }

  function renderSummaryStats() {
    const data = window.TNPSC_PYQ_DATA;
    if (!data || !data.summary) return;

    const elTotalPapers = document.getElementById('pyq-stat-total-papers');
    const elTotalQuestions = document.getElementById('pyq-stat-total-questions');
    const elTamilQuestions = document.getElementById('pyq-stat-tamil-questions');
    const elGkQuestions = document.getElementById('pyq-stat-gk-questions');
    const elMathsQuestions = document.getElementById('pyq-stat-maths-questions');

    if (elTotalPapers) elTotalPapers.textContent = `${data.summary.totalPapers} வினாத்தாள்கள்`;
    if (elTotalQuestions) elTotalQuestions.textContent = `${data.summary.totalQuestions.toLocaleString('en-IN')}`;
    if (elTamilQuestions) elTamilQuestions.textContent = `${data.summary.sections.tamil.questionsCount.toLocaleString('en-IN')}`;
    if (elGkQuestions) elGkQuestions.textContent = `${data.summary.sections.gk.questionsCount}`;
    if (elMathsQuestions) elMathsQuestions.textContent = `${data.summary.sections.maths.questionsCount}`;
  }

  function renderPaperCards() {
    const data = window.TNPSC_PYQ_DATA;
    const container = document.getElementById('pyq-papers-grid');
    const countEl = document.getElementById('pyq-filter-count');
    if (!container || !data || !data.papers) return;

    const filtered = data.papers.filter((paper) => {
      // Section filter
      if (PyqState.filterSection === 'tamil' && paper.sectionKey !== 'tamil' && paper.sectionKey !== 'composite') {
        return false;
      }
      if (PyqState.filterSection === 'gk' && paper.sectionKey !== 'composite') {
        return false;
      }
      if (PyqState.filterSection === 'maths' && paper.sectionKey !== 'composite') {
        return false;
      }

      // Search query
      if (PyqState.searchQuery) {
        const q = PyqState.searchQuery.toLowerCase();
        const text = `${paper.examName} ${paper.code} ${paper.year} ${paper.sectionName}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      return true;
    });

    if (countEl) {
      countEl.textContent = `காட்டப்படும் வினாத்தாள்கள்: ${filtered.length} / ${data.papers.length}`;
    }

    container.innerHTML = '';
    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state">தேர்ந்தெடுத்த வடிகட்டிக்குப் பொருந்தும் வினாத்தாள்கள் எதுவும் இல்லை.</div>';
      return;
    }

    const frag = document.createDocumentFragment();
    filtered.forEach((paper) => {
      const card = document.createElement('article');
      card.className = 'pyq-paper-card';

      const padNum = String(paper.paperNo).padStart(2, '0');
      const isComposite = paper.sectionKey === 'composite';

      card.innerHTML = `
        <div class="pyq-card-head">
          <div class="pyq-card-badge-row">
            <span class="pyq-badge pyq-badge-num">தேர்வுத்தாள் ${padNum}</span>
            <span class="pyq-badge pyq-badge-year">${escapeHtml(paper.year)}</span>
            <span class="pyq-badge pyq-badge-code">${escapeHtml(paper.code)}</span>
          </div>
          <h3 class="pyq-card-title">${escapeHtml(paper.examName)}</h3>
        </div>

        <div class="pyq-card-body">
          <div class="pyq-meta-row">
            <span class="pyq-meta-item">
              <strong>பிரிவு:</strong> ${escapeHtml(paper.sectionName)}
            </span>
            <span class="pyq-meta-item">
              <strong>பக்கங்கள்:</strong> ${escapeHtml(paper.pages)} (${paper.totalPages} பக்கங்கள்)
            </span>
          </div>

          ${paper.breakdown ? `<div class="pyq-breakdown-box">${escapeHtml(paper.breakdown)}</div>` : ''}

          <div class="pyq-card-pills">
            <span class="pyq-pill pyq-pill-accent">
              <span class="pill-dot"></span> ${paper.questionsCount} அசல் வினாக்கள்
            </span>
            <span class="pyq-pill pyq-pill-success">
              ✓ அரசு விடைக்குறிப்புடன்
            </span>
          </div>
        </div>

        <div class="pyq-card-actions">
          <button type="button" class="btn btn-primary btn-sm pyq-practice-btn" data-paper-no="${paper.paperNo}">
            மாதிரி வினாக்களைப் பயிற்சி செய் →
          </button>
        </div>
      `;

      card.querySelector('.pyq-practice-btn').addEventListener('click', () => {
        openPracticeModal(paper);
      });

      frag.appendChild(card);
    });

    container.appendChild(frag);
  }

  function bindEvents() {
    // Section tabs filter
    document.querySelectorAll('[data-pyq-section]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-pyq-section]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        PyqState.filterSection = btn.getAttribute('data-pyq-section');
        renderPaperCards();
      });
    });

    // Search input
    const searchInput = document.getElementById('pyq-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        PyqState.searchQuery = e.target.value.trim();
        renderPaperCards();
      });
    }

    // Reset search
    const resetBtn = document.getElementById('pyq-filter-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        PyqState.searchQuery = '';
        PyqState.filterSection = 'all';
        if (searchInput) searchInput.value = '';
        document.querySelectorAll('[data-pyq-section]').forEach((b) => {
          b.classList.toggle('active', b.getAttribute('data-pyq-section') === 'all');
        });
        renderPaperCards();
      });
    }

    // Practice modal controls
    const modalCloseBtn = document.getElementById('pyq-modal-close-btn');
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', closePracticeModal);
    }

    const prevQBtn = document.getElementById('pyq-prev-q-btn');
    if (prevQBtn) {
      prevQBtn.addEventListener('click', () => {
        if (PyqState.practiceIndex > 0) {
          PyqState.practiceIndex--;
          renderCurrentPracticeQuestion();
        }
      });
    }

    const nextQBtn = document.getElementById('pyq-next-q-btn');
    if (nextQBtn) {
      nextQBtn.addEventListener('click', () => {
        if (PyqState.practiceIndex < PyqState.practiceQuestions.length - 1) {
          PyqState.practiceIndex++;
          renderCurrentPracticeQuestion();
        }
      });
    }

    // Launch all samples practice
    const launchAllBtn = document.getElementById('pyq-launch-all-practice');
    if (launchAllBtn) {
      launchAllBtn.addEventListener('click', () => {
        openPracticeModal(null);
      });
    }
  }

  /* ==================== PRACTICE MODAL / VIEWER ==================== */
  function openPracticeModal(paperFilter) {
    const data = window.TNPSC_PYQ_DATA;
    if (!data || !data.sampleQuestions) return;

    let questions = data.sampleQuestions;
    let title = 'முந்தைய தேர்வு அசல் வினாக்கள் பயிற்சி';

    if (paperFilter) {
      // Filter questions matching this paper code or section
      const matched = data.sampleQuestions.filter(
        (q) => q.examCode === paperFilter.code || (paperFilter.sectionKey === 'tamil' && q.subjectKey === 'tamil')
      );
      if (matched.length > 0) {
        questions = matched;
        title = `${paperFilter.examName} (${paperFilter.code}) – மாதிரி வினாக்கள்`;
      } else {
        title = `${paperFilter.examName} – மாதிரி வினாக்கள்`;
      }
    }

    PyqState.practiceQuestions = questions;
    PyqState.practiceIndex = 0;
    PyqState.selectedAnswers = {};

    const modalTitle = document.getElementById('pyq-practice-modal-title');
    if (modalTitle) modalTitle.textContent = title;

    const modal = document.getElementById('pyq-practice-modal');
    if (modal) modal.classList.remove('hidden');

    renderCurrentPracticeQuestion();
  }

  function closePracticeModal() {
    const modal = document.getElementById('pyq-practice-modal');
    if (modal) modal.classList.add('hidden');
  }

  function renderCurrentPracticeQuestion() {
    const questions = PyqState.practiceQuestions;
    const qIndex = PyqState.practiceIndex;
    const q = questions[qIndex];
    if (!q) return;

    // Badges & Counters
    const qCounter = document.getElementById('pyq-practice-counter');
    const qSubjectBadge = document.getElementById('pyq-practice-subject');
    const qExamBadge = document.getElementById('pyq-practice-exam');
    const qTopicBadge = document.getElementById('pyq-practice-topic');
    const qText = document.getElementById('pyq-practice-text');
    const optionsContainer = document.getElementById('pyq-practice-options');
    const feedbackBox = document.getElementById('pyq-practice-feedback');
    const prevBtn = document.getElementById('pyq-prev-q-btn');
    const nextBtn = document.getElementById('pyq-next-q-btn');

    if (qCounter) qCounter.textContent = `கேள்வி ${qIndex + 1} / ${questions.length}`;
    if (qSubjectBadge) qSubjectBadge.textContent = q.subjectName;
    if (qExamBadge) qExamBadge.textContent = `${q.examName} (${q.examCode})`;
    if (qTopicBadge) qTopicBadge.textContent = q.topic || 'பொது';
    if (qText) qText.textContent = q.question;

    if (prevBtn) prevBtn.disabled = qIndex === 0;
    if (nextBtn) nextBtn.disabled = qIndex === questions.length - 1;

    // Render Options
    const optLetters = ['A', 'B', 'C', 'D'];
    const chosenAnswer = PyqState.selectedAnswers[q.id];
    const isAnswered = chosenAnswer !== undefined;

    optionsContainer.innerHTML = '';
    q.options.forEach((optText, optIdx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pyq-opt-btn';

      const isUserChoice = chosenAnswer === optIdx;
      const isCorrect = optIdx === q.correctAnswer;

      if (isAnswered) {
        btn.disabled = true;
        if (isCorrect) {
          btn.classList.add('opt-correct');
        }
        if (isUserChoice && !isCorrect) {
          btn.classList.add('opt-wrong');
        }
      }

      btn.innerHTML = `
        <span class="opt-letter">${optLetters[optIdx]}</span>
        <span class="opt-text">${escapeHtml(optText)}</span>
        ${isAnswered && isCorrect ? '<span class="opt-status-icon">✓</span>' : ''}
        ${isAnswered && isUserChoice && !isCorrect ? '<span class="opt-status-icon">✗</span>' : ''}
      `;

      btn.addEventListener('click', () => {
        if (isAnswered) return;
        PyqState.selectedAnswers[q.id] = optIdx;
        renderCurrentPracticeQuestion();
      });

      optionsContainer.appendChild(btn);
    });

    // Feedback Panel
    if (isAnswered) {
      feedbackBox.classList.remove('hidden');
      const isUserCorrect = chosenAnswer === q.correctAnswer;
      const correctLetter = optLetters[q.correctAnswer];
      const correctText = q.options[q.correctAnswer];

      feedbackBox.className = `pyq-feedback-panel ${isUserCorrect ? 'feedback-correct' : 'feedback-wrong'}`;
      feedbackBox.innerHTML = `
        <div class="feedback-status-line">
          <span class="feedback-badge">${isUserCorrect ? '✓ சரியான பதில்!' : '✗ தவறான பதில்!'}</span>
          <span class="feedback-official-tag">✓ TNPSC அதிகாரப்பூர்வ விடைக்குறிப்பு</span>
        </div>
        <div class="feedback-correct-answer">
          <strong>சரியான விடை:</strong> ${correctLetter}) ${escapeHtml(correctText)}
        </div>
        <div class="feedback-explanation">
          <strong>விளக்கம்:</strong> ${escapeHtml(q.explanation)}
        </div>
      `;
    } else {
      feedbackBox.classList.add('hidden');
      feedbackBox.innerHTML = '';
    }
  }

  // Export module
  window.TNPSC_PYQ = {
    init: init,
    openPracticeModal: openPracticeModal,
    renderPaperCards: renderPaperCards
  };

  // Auto-init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
