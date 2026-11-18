/* ==========================================================================
   storage.js – LocalStorage Persistence for TNPSC Group 4 Practice App
   ========================================================================== */

(function (window) {
  'use strict';

  const STORAGE_KEY = 'tnpsc_group4_practice_v1';

  const DEFAULT_STATE = {
    selectedSubject: null,
    activeTest: null, // { subject, testNumber, currentQuestion, view }
    tests: {} // key: "tamil_1" -> { subject, testNumber, answers: { [qId]: optIdx }, currentQuestion, correctCount, incorrectCount, answeredCount, completed, score, lastAttempted }
  };

  function getTestKey(subject, testNumber) {
    return `${subject}_${Number(testNumber)}`;
  }

  function loadState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredCloneFallback(DEFAULT_STATE);
      const parsed = JSON.parse(raw);
      return {
        selectedSubject: parsed.selectedSubject || null,
        activeTest: parsed.activeTest || null,
        tests: parsed.tests && typeof parsed.tests === 'object' ? parsed.tests : {}
      };
    } catch (err) {
      return structuredCloneFallback(DEFAULT_STATE);
    }
  }

  function saveState(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      // Handle storage quota or private mode silently
    }
  }

  function structuredCloneFallback(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  const Storage = {
    getState() {
      return loadState();
    },

    getTestProgress(subject, testNumber) {
      const state = loadState();
      const key = getTestKey(subject, testNumber);
      return state.tests[key] || null;
    },

    ensureTestProgress(subject, testNumber) {
      const state = loadState();
      const key = getTestKey(subject, testNumber);
      if (!state.tests[key]) {
        state.tests[key] = {
          subject,
          testNumber: Number(testNumber),
          answers: {},
          currentQuestion: 0,
          correctCount: 0,
          incorrectCount: 0,
          answeredCount: 0,
          completed: false,
          score: 0,
          lastAttempted: new Date().toISOString()
        };
        saveState(state);
      }
      return state.tests[key];
    },

    setSelectedSubject(subject) {
      const state = loadState();
      state.selectedSubject = subject;
      saveState(state);
    },

    setActiveSession(subject, testNumber, currentQuestion, view) {
      const state = loadState();
      state.selectedSubject = subject;
      state.activeTest = {
        subject,
        testNumber: Number(testNumber),
        currentQuestion: Number(currentQuestion) || 0,
        view: view || 'quiz'
      };
      saveState(state);
    },

    clearActiveSession() {
      const state = loadState();
      state.activeTest = null;
      saveState(state);
    },

    getActiveSession() {
      const state = loadState();
      return state.activeTest;
    },

    setCurrentQuestion(subject, testNumber, questionIndex) {
      const state = loadState();
      const key = getTestKey(subject, testNumber);
      if (!state.tests[key]) {
        state.tests[key] = {
          subject,
          testNumber: Number(testNumber),
          answers: {},
          currentQuestion: 0,
          correctCount: 0,
          incorrectCount: 0,
          answeredCount: 0,
          completed: false,
          score: 0,
          lastAttempted: new Date().toISOString()
        };
      }
      state.tests[key].currentQuestion = Number(questionIndex);
      state.tests[key].lastAttempted = new Date().toISOString();
      state.activeTest = {
        subject,
        testNumber: Number(testNumber),
        currentQuestion: Number(questionIndex),
        view: 'quiz'
      };
      saveState(state);
      return state.tests[key];
    },

    recordAnswer(subject, testNumber, questions, questionId, selectedOption, questionIndex) {
      const state = loadState();
      const key = getTestKey(subject, testNumber);
      if (!state.tests[key]) {
        state.tests[key] = {
          subject,
          testNumber: Number(testNumber),
          answers: {},
          currentQuestion: Number(questionIndex) || 0,
          correctCount: 0,
          incorrectCount: 0,
          answeredCount: 0,
          completed: false,
          score: 0,
          lastAttempted: new Date().toISOString()
        };
      }

      const record = state.tests[key];
      const qKey = String(questionId);

      // Strict rule: cannot change answer once submitted
      if (Object.prototype.hasOwnProperty.call(record.answers, qKey)) {
        return record;
      }

      record.answers[qKey] = Number(selectedOption);
      record.currentQuestion = Number(questionIndex);
      record.lastAttempted = new Date().toISOString();

      // Recalculate exact counts from questions array
      let correct = 0;
      let incorrect = 0;
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const ans = record.answers[String(q.id)];
        if (ans !== undefined) {
          if (ans === q.correctAnswer) {
            correct++;
          } else {
            incorrect++;
          }
        }
      }

      record.correctCount = correct;
      record.incorrectCount = incorrect;
      record.answeredCount = correct + incorrect;
      record.score = correct;

      state.activeTest = {
        subject,
        testNumber: Number(testNumber),
        currentQuestion: Number(questionIndex),
        view: 'quiz'
      };

      saveState(state);
      return record;
    },

    markTestCompleted(subject, testNumber, questions) {
      const state = loadState();
      const key = getTestKey(subject, testNumber);
      const record = state.tests[key] || {
        subject,
        testNumber: Number(testNumber),
        answers: {},
        currentQuestion: 0,
        correctCount: 0,
        incorrectCount: 0,
        answeredCount: 0,
        completed: false,
        score: 0,
        lastAttempted: new Date().toISOString()
      };

      let correct = 0;
      let incorrect = 0;
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const ans = record.answers[String(q.id)];
        if (ans !== undefined) {
          if (ans === q.correctAnswer) correct++;
          else incorrect++;
        }
      }

      record.correctCount = correct;
      record.incorrectCount = incorrect;
      record.answeredCount = correct + incorrect;
      record.score = correct;
      record.completed = true;
      record.lastAttempted = new Date().toISOString();

      state.tests[key] = record;
      state.activeTest = {
        subject,
        testNumber: Number(testNumber),
        currentQuestion: record.currentQuestion,
        view: 'results'
      };
      saveState(state);
      return record;
    },

    resetTest(subject, testNumber) {
      const state = loadState();
      const key = getTestKey(subject, testNumber);
      delete state.tests[key];
      if (
        state.activeTest &&
        state.activeTest.subject === subject &&
        Number(state.activeTest.testNumber) === Number(testNumber)
      ) {
        state.activeTest = null;
      }
      saveState(state);
    },

    getTestStatus(subject, testNumber) {
      const rec = this.getTestProgress(subject, testNumber);
      if (!rec) return 'unattempted';
      if (rec.completed) return 'completed';
      if (rec.answeredCount > 0) return 'inprogress';
      return 'unattempted';
    },

    getSubjectStats(subject) {
      const state = loadState();
      let completed = 0;
      let inProgress = 0;
      let totalScore = 0;
      let totalAnswered = 0;

      for (let t = 1; t <= 10; t++) {
        const rec = state.tests[getTestKey(subject, t)];
        if (!rec) continue;
        totalAnswered += rec.answeredCount || 0;
        if (rec.completed) {
          completed++;
          totalScore += rec.score || 0;
        } else if (rec.answeredCount > 0) {
          inProgress++;
        }
      }

      const avgScore = completed > 0 ? Math.round(totalScore / completed) : 0;
      const progressPercent = Math.round((totalAnswered / 1000) * 100);

      return {
        completed,
        inProgress,
        avgScore,
        totalAnswered,
        progressPercent
      };
    },

    getOverallStats() {
      const subjects = ['tamil', 'maths', 'gk'];
      let completedTests = 0;
      let inProgressTests = 0;
      let totalCompletedScore = 0;
      let totalAnswered = 0;

      subjects.forEach((subj) => {
        const s = this.getSubjectStats(subj);
        completedTests += s.completed;
        inProgressTests += s.inProgress;
        totalCompletedScore += s.completed * s.avgScore; // computed accurately below
        totalAnswered += s.totalAnswered;
      });

      // Exact average score across all completed tests
      const state = loadState();
      let exactSum = 0;
      let exactCompleted = 0;
      Object.values(state.tests).forEach((rec) => {
        if (rec && rec.completed) {
          exactSum += rec.score || 0;
          exactCompleted++;
        }
      });

      const averageScore = exactCompleted > 0 ? Math.round(exactSum / exactCompleted) : 0;
      const overallProgress = Math.round((totalAnswered / 3000) * 100);

      return {
        totalQuestions: 3000,
        totalTests: 30,
        completedTests,
        inProgressTests,
        averageScore,
        totalAnswered,
        overallProgress
      };
    },

    getLastInProgressTest() {
      const state = loadState();
      const candidates = Object.values(state.tests).filter(
        (rec) => rec && !rec.completed && rec.answeredCount > 0
      );
      if (candidates.length === 0) return null;
      candidates.sort((a, b) => new Date(b.lastAttempted) - new Date(a.lastAttempted));
      return candidates[0];
    },

    formatDateTamil(isoString) {
      if (!isoString) return '';
      try {
        const d = new Date(isoString);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${day}-${month}-${year}, ${hours}:${mins}`;
      } catch (e) {
        return '';
      }
    }
  };

  window.TNPSCStorage = Storage;
})(window);

