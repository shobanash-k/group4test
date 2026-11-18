/* ==========================================================================
   quiz.js – Examination Interface, Instant Validation & 100-Q Navigator
   ========================================================================== */

(function (window) {
  'use strict';

  const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

  const state = {
    subject: null,
    testNumber: null,
    questions: [],
    currentIndex: 0,
    progress: null,
    callbacks: {
      onExit: null,
      onFinish: null,
      onRequestConfirm: null,
      onToast: null
    }
  };

  // DOM References
  const els = {};

  function cacheDom() {
    els.subjectName = document.getElementById('quiz-subject-name');
    els.testTitle = document.getElementById('quiz-test-title');
    els.qCounter = document.getElementById('quiz-q-counter');
    els.scoreCounter = document.getElementById('quiz-score-counter');
    els.answeredCounter = document.getElementById('quiz-answered-counter');
    els.progressFill = document.getElementById('quiz-progress-fill');

    els.qNumberBadge = document.getElementById('q-number-badge');
    els.qTopicTag = document.getElementById('q-topic-tag');
    els.qDiffTag = document.getElementById('q-diff-tag');
    els.questionText = document.getElementById('question-text');
    els.optionsList = document.getElementById('options-list');

    els.feedbackPanel = document.getElementById('feedback-panel');
    els.feedbackIcon = document.getElementById('feedback-icon');
    els.feedbackStatus = document.getElementById('feedback-status');
    els.feedbackCorrectAnswer = document.getElementById('feedback-correct-answer');
    els.feedbackExplanation = document.getElementById('feedback-explanation');

    els.btnPrev = document.getElementById('btn-prev-question');
    els.btnNext = document.getElementById('btn-next-question');
    els.footerHint = document.getElementById('quiz-footer-hint');

    els.navGrid = document.getElementById('navigator-grid');
    els.navCorrect = document.getElementById('nav-count-correct');
    els.navWrong = document.getElementById('nav-count-wrong');
    els.navRemaining = document.getElementById('nav-count-remaining');

    els.navDrawer = document.getElementById('quiz-navigator');
    els.navBackdrop = document.getElementById('nav-drawer-backdrop');
    els.openDrawerBtn = document.getElementById('open-nav-drawer-btn');
    els.closeDrawerBtn = document.getElementById('close-nav-drawer-btn');

    els.exitBtn = document.getElementById('quiz-exit-btn');
    els.restartBtn = document.getElementById('quiz-restart-btn');
    els.finishBtn = document.getElementById('quiz-finish-btn');
    els.navFinishBtn = document.getElementById('nav-finish-btn');
  }

  function bindEvents() {
    els.btnPrev.addEventListener('click', () => {
      if (state.currentIndex > 0) {
        goToQuestion(state.currentIndex - 1);
      }
    });

    els.btnNext.addEventListener('click', () => {
      if (state.currentIndex < state.questions.length - 1) {
        goToQuestion(state.currentIndex + 1);
      } else {
        handleFinishRequest();
      }
    });

    els.exitBtn.addEventListener('click', () => {
      closeDrawer();
      if (state.callbacks.onExit) {
        state.callbacks.onExit(state.subject);
      }
    });

    els.restartBtn.addEventListener('click', () => {
      if (state.callbacks.onRequestConfirm) {
        state.callbacks.onRequestConfirm(
          'தேர்வை மீண்டும் தொடங்கவா?',
          `இந்தத் தேர்வின் (${window.TNPSCLoader.SUBJECT_META[state.subject].name} – தேர்வு ${window.TNPSCLoader.pad2(state.testNumber)}) சேமிக்கப்பட்ட பதில்கள் மட்டும் அழிக்கப்படும். மற்ற தேர்வுகளின் முன்னேற்றம் பாதுகாப்பாக இருக்கும்.`,
          () => {
            window.TNPSCStorage.resetTest(state.subject, state.testNumber);
            state.progress = window.TNPSCStorage.ensureTestProgress(state.subject, state.testNumber);
            state.currentIndex = 0;
            window.TNPSCStorage.setCurrentQuestion(state.subject, state.testNumber, 0);
            renderAll();
            if (state.callbacks.onToast) {
              state.callbacks.onToast('தேர்வு வெற்றிகரமாக மீட்டமைக்கப்பட்டது.');
            }
          }
        );
      }
    });

    els.finishBtn.addEventListener('click', handleFinishRequest);
    els.navFinishBtn.addEventListener('click', () => {
      closeDrawer();
      handleFinishRequest();
    });

    els.openDrawerBtn.addEventListener('click', openDrawer);
    els.closeDrawerBtn.addEventListener('click', closeDrawer);
    els.navBackdrop.addEventListener('click', closeDrawer);

    // Keyboard navigation & Escape handler when Quiz view is active
    document.addEventListener('keydown', (e) => {
      const quizView = document.getElementById('view-quiz');
      if (!quizView || !quizView.classList.contains('active')) return;
      const modal = document.getElementById('confirm-modal');
      if (modal && !modal.classList.contains('hidden')) return;
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.key === 'Escape') {
        closeDrawer();
      } else if (e.key === 'ArrowRight' && state.currentIndex < state.questions.length - 1) {
        goToQuestion(state.currentIndex + 1);
      } else if (e.key === 'ArrowLeft' && state.currentIndex > 0) {
        goToQuestion(state.currentIndex - 1);
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        handleOptionSelect(Number(e.key) - 1);
      } else if (['a', 'b', 'c', 'd', 'A', 'B', 'C', 'D'].includes(e.key)) {
        const idx = ['a', 'b', 'c', 'd'].indexOf(e.key.toLowerCase());
        if (idx >= 0) handleOptionSelect(idx);
      }
    });
  }

  function openDrawer() {
    els.navDrawer.classList.add('open');
    els.navBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    els.navDrawer.classList.remove('open');
    els.navBackdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  function handleFinishRequest() {
    const total = state.questions.length;
    const answered = state.progress ? state.progress.answeredCount : 0;
    const remaining = total - answered;

    if (remaining > 0 && state.callbacks.onRequestConfirm) {
      state.callbacks.onRequestConfirm(
        'தேர்வை முடிக்கவா?',
        `நீங்கள் ${total} கேள்விகளில் ${answered} கேள்விகளுக்குப் பதிலளித்துள்ளீர்கள். இன்னும் ${remaining} கேள்விகள் பதிலளிக்கப்படாமல் உள்ளன. இப்போதே தேர்வை முடித்து முடிவைப் பார்க்க விரும்புகிறீர்களா?`,
        () => finalizeTest()
      );
    } else {
      finalizeTest();
    }
  }

  function finalizeTest() {
    closeDrawer();
    const summary = window.TNPSCStorage.markTestCompleted(
      state.subject,
      state.testNumber,
      state.questions
    );
    if (state.callbacks.onFinish) {
      state.callbacks.onFinish(state.subject, state.testNumber, state.questions, summary);
    }
  }

  function goToQuestion(index) {
    if (index < 0 || index >= state.questions.length) return;
    state.currentIndex = index;
    state.progress = window.TNPSCStorage.setCurrentQuestion(
      state.subject,
      state.testNumber,
      index
    );
    renderQuestion();
    renderNavigator();
    updateTopMetrics();
    closeDrawer();

    // Scroll question card into comfortable view
    const card = document.getElementById('question-card');
    if (card) {
      const rect = card.getBoundingClientRect();
      if (rect.top < 80 || rect.top > 300) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  function handleOptionSelect(selectedIndex) {
    const question = state.questions[state.currentIndex];
    if (!question) return;

    const existingAnswer = state.progress.answers[String(question.id)];
    if (existingAnswer !== undefined) {
      // Already answered — lock answer changes strictly
      return;
    }

    // Record immediately and persist to LocalStorage
    state.progress = window.TNPSCStorage.recordAnswer(
      state.subject,
      state.testNumber,
      state.questions,
      question.id,
      selectedIndex,
      state.currentIndex
    );

    // Immediately show green/red highlight, explanation, and updated score (NO auto-advance!)
    renderQuestion();
    renderNavigator();
    updateTopMetrics();
  }

  function updateTopMetrics() {
    const total = state.questions.length;
    const answered = state.progress ? state.progress.answeredCount : 0;
    const correct = state.progress ? state.progress.correctCount : 0;
    const wrong = state.progress ? state.progress.incorrectCount : 0;
    const remaining = total - answered;

    els.qCounter.textContent = `${state.currentIndex + 1} / ${total}`;
    els.scoreCounter.textContent = `${correct}`;
    els.answeredCounter.textContent = `${answered} / ${total}`;

    const pct = total > 0 ? Math.round((answered / total) * 100) : 0;
    els.progressFill.style.width = `${pct}%`;

    els.navCorrect.textContent = String(correct);
    els.navWrong.textContent = String(wrong);
    els.navRemaining.textContent = String(remaining);
  }

  function renderQuestion() {
    const question = state.questions[state.currentIndex];
    if (!question) return;

    const total = state.questions.length;
    const qNumber = state.currentIndex + 1;
    const savedAnswer = state.progress.answers[String(question.id)];
    const isAnswered = savedAnswer !== undefined;

    els.qNumberBadge.textContent = `கேள்வி ${qNumber} / ${total}`;
    els.qTopicTag.textContent = question.topic || 'பொது';

    const diffKey = question.difficulty || 'medium';
    els.qDiffTag.textContent = window.TNPSCLoader.DIFFICULTY_LABELS[diffKey] || 'நடுத்தரம்';
    els.qDiffTag.className = `q-diff-tag diff-${diffKey}`;

    els.questionText.textContent = question.question;

    // Render 4 options (NEVER reveal correct answer in DOM before user selects!)
    els.optionsList.innerHTML = '';
    question.options.forEach((optText, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option-btn';
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', isAnswered && savedAnswer === idx ? 'true' : 'false');

      const leftWrap = document.createElement('span');
      leftWrap.className = 'option-left';

      const letterEl = document.createElement('span');
      letterEl.className = 'option-letter';
      letterEl.textContent = `${OPTION_LETTERS[idx]})`;

      const textEl = document.createElement('span');
      textEl.className = 'option-text';
      textEl.textContent = optText;

      leftWrap.appendChild(letterEl);
      leftWrap.appendChild(textEl);
      btn.appendChild(leftWrap);

      if (isAnswered) {
        btn.disabled = true;
        const isCorrectOption = idx === question.correctAnswer;
        const isSelectedOption = idx === savedAnswer;

        if (isCorrectOption) {
          btn.classList.add('option-correct');
          const badge = document.createElement('span');
          badge.className = 'option-status-tag';
          badge.textContent = '✓ சரியான விடை';
          btn.appendChild(badge);
        } else if (isSelectedOption) {
          btn.classList.add('option-wrong');
          const badge = document.createElement('span');
          badge.className = 'option-status-tag';
          badge.textContent = '✗ உங்கள் தேர்வு';
          btn.appendChild(badge);
        } else {
          btn.classList.add('option-dimmed');
        }
      } else {
        btn.addEventListener('click', () => handleOptionSelect(idx));
      }

      els.optionsList.appendChild(btn);
    });

    // Render Instant Feedback & Explanation Panel ONLY after selection
    if (isAnswered) {
      const isRight = savedAnswer === question.correctAnswer;
      const correctLetter = OPTION_LETTERS[question.correctAnswer];
      const correctText = question.options[question.correctAnswer];

      els.feedbackPanel.classList.remove('hidden', 'feedback-correct', 'feedback-wrong');
      els.feedbackPanel.classList.add(isRight ? 'feedback-correct' : 'feedback-wrong');

      els.feedbackIcon.textContent = isRight ? '✓' : '✗';
      els.feedbackStatus.textContent = isRight ? 'சரியான பதில்!' : 'தவறான பதில்!';
      els.feedbackCorrectAnswer.textContent = `சரியான விடை: ${correctLetter}) ${correctText}`;
      els.feedbackExplanation.textContent = question.explanation;
      if (state.progress.answeredCount >= total) {
        els.footerHint.textContent = 'அனைத்து 100 கேள்விகளுக்கும் பதிலளித்துவிட்டீர்கள்! தேர்வு முடிவைக் காண "தேர்வை முடி" பொத்தானை அழுத்தவும்.';
      } else {
        els.footerHint.textContent = isRight
          ? 'அருமை! அடுத்த கேள்விக்குச் செல்லவும்.'
          : 'விளக்கத்தைப் படித்துவிட்டு அடுத்த கேள்விக்குச் செல்லவும்.';
      }
    } else {
      els.feedbackPanel.classList.add('hidden');
      els.feedbackPanel.classList.remove('feedback-correct', 'feedback-wrong');
      els.footerHint.textContent = 'நான்கு விடைகளில் சரியானதைத் தேர்ந்தெடுக்கவும்';
    }

    // Update Prev / Next buttons
    els.btnPrev.disabled = state.currentIndex === 0;
    if (state.currentIndex === total - 1) {
      els.btnNext.textContent = 'தேர்வை முடி & முடிவு காண் →';
    } else {
      els.btnNext.textContent = 'அடுத்த கேள்வி →';
    }
  }

  function renderNavigator() {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < state.questions.length; i++) {
      const q = state.questions[i];
      const ans = state.progress.answers[String(q.id)];
      const isCurrent = i === state.currentIndex;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nav-q-btn';
      btn.textContent = String(i + 1);
      btn.setAttribute('aria-label', `கேள்வி ${i + 1}`);

      if (ans === undefined) {
        btn.classList.add(isCurrent ? 'state-current' : 'state-unattempted');
      } else if (ans === q.correctAnswer) {
        btn.classList.add('state-correct');
        if (isCurrent) btn.classList.add('is-current');
      } else {
        btn.classList.add('state-wrong');
        if (isCurrent) btn.classList.add('is-current');
      }

      btn.addEventListener('click', () => goToQuestion(i));
      frag.appendChild(btn);
    }

    els.navGrid.innerHTML = '';
    els.navGrid.appendChild(frag);
  }

  function renderAll() {
    const meta = window.TNPSCLoader.SUBJECT_META[state.subject];
    const startQ = (state.testNumber - 1) * 100 + 1;
    const endQ = state.testNumber * 100;

    els.subjectName.textContent = meta.name;
    els.testTitle.textContent = `தேர்வு ${window.TNPSCLoader.pad2(state.testNumber)} – கேள்விகள் ${startQ}–${endQ}`;

    renderQuestion();
    renderNavigator();
    updateTopMetrics();
  }

  window.TNPSCQuiz = {
    init(callbacks) {
      cacheDom();
      state.callbacks = Object.assign(state.callbacks, callbacks || {});
      bindEvents();
    },

    start(subject, testNumber, questions, startIndex) {
      state.subject = subject;
      state.testNumber = Number(testNumber);
      state.questions = questions;
      state.progress = window.TNPSCStorage.ensureTestProgress(subject, testNumber);

      if (typeof startIndex === 'number' && startIndex >= 0 && startIndex < questions.length) {
        state.currentIndex = startIndex;
      } else {
        const savedIdx = state.progress.currentQuestion || 0;
        state.currentIndex = savedIdx >= 0 && savedIdx < questions.length ? savedIdx : 0;
      }

      window.TNPSCStorage.setActiveSession(subject, testNumber, state.currentIndex, 'quiz');
      renderAll();
    },

    getCurrentContext() {
      return {
        subject: state.subject,
        testNumber: state.testNumber,
        questions: state.questions
      };
    }
  };
})(window);

