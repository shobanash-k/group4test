/* ==========================================================================
   questions-loader.js – Offline-Compatible Test Question Loader
   Works seamlessly via file:// (dynamic local JS data files) & http:// (JSON)
   ========================================================================== */

(function (window) {
  'use strict';

  const SUBJECT_META = {
    tamil: {
      id: 'tamil',
      name: 'பொதுத்தமிழ்',
      shortName: 'பொதுத்தமிழ்',
      icon: 'assets/icons/tamil-icon.svg',
      description: 'தமிழ் இலக்கணம், திருக்குறள், சங்க இலக்கியம், காப்பியங்கள், சிற்றிலக்கியங்கள், தமிழ் அறிஞர்கள் மற்றும் நூல்கள் (1,000 கேள்விகள் • 10 தேர்வுகள்).'
    },
    maths: {
      id: 'maths',
      name: 'கணிதம் மற்றும் திறனறிவு',
      shortName: 'கணிதம்',
      icon: 'assets/icons/maths-icon.svg',
      description: 'எண் அமைப்பு, சதவீதம், தனிவட்டி, கூட்டு வட்டி, இலாபம்-நட்டம், விகிதம், LCM/HCF, நேரம்-வேலை, அளவியல், வயது & தர்க்கத் திறன் (1,000 கேள்விகள் • 10 தேர்வுகள்).'
    },
    gk: {
      id: 'gk',
      name: 'பொது அறிவு',
      shortName: 'பொது அறிவு',
      icon: 'assets/icons/gk-icon.svg',
      description: 'இந்திய & தமிழ்நாடு வரலாறு, அரசியலமைப்பு, புவியியல், அறிவியல், பொருளாதாரம், சமூக சீர்திருத்தங்கள் & கணினி அறிவியல் (1,000 கேள்விகள் • 10 தேர்வுகள்).'
    }
  };

  const DIFFICULTY_LABELS = {
    easy: 'எளிது',
    medium: 'நடுத்தரம்',
    hard: 'கடினம்'
  };

  const cache = {};
  const pendingResolvers = {};

  function pad2(num) {
    return String(num).padStart(2, '0');
  }

  function getCacheKey(subject, testNumber) {
    return `${subject}_${Number(testNumber)}`;
  }

  // Global callback invoked by offline data/<subject>/testXX.js files
  window.__TNPSC_REGISTER_TEST__ = function (subject, testNumber, questions) {
    const key = getCacheKey(subject, testNumber);
    cache[key] = questions;
    if (pendingResolvers[key]) {
      pendingResolvers[key].forEach((res) => res.resolve(questions));
      delete pendingResolvers[key];
    }
  };

  function loadViaScript(subject, testNumber) {
    return new Promise((resolve, reject) => {
      const key = getCacheKey(subject, testNumber);
      if (cache[key]) {
        resolve(cache[key]);
        return;
      }

      if (!pendingResolvers[key]) {
        pendingResolvers[key] = [];
      }
      pendingResolvers[key].push({ resolve, reject });

      // Only append script tag once if multiple calls happen concurrently
      if (pendingResolvers[key].length > 1) return;

      const script = document.createElement('script');
      script.src = `data/${subject}/test${pad2(testNumber)}.js`;
      script.async = true;

      script.onerror = function () {
        const waiting = pendingResolvers[key] || [];
        delete pendingResolvers[key];
        script.remove();
        waiting.forEach((p) => p.reject(new Error(`Script load failed for ${key}`)));
      };

      document.body.appendChild(script);
    });
  }

  async function loadViaFetch(subject, testNumber) {
    const url = `data/${subject}/test${pad2(testNumber)}.json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while loading ${url}`);
    }
    const data = await response.json();
    cache[getCacheKey(subject, testNumber)] = data;
    return data;
  }

  async function loadTest(subject, testNumber) {
    const key = getCacheKey(subject, testNumber);
    if (cache[key]) return cache[key];

    // Prefer local JS wrapper so opening index.html directly (file://) works 100% offline with zero CORS issues
    try {
      const questions = await loadViaScript(subject, testNumber);
      if (Array.isArray(questions) && questions.length > 0) {
        return questions;
      }
    } catch (scriptErr) {
      // Fallback to fetch JSON when served over HTTP/HTTPS
      if (window.location.protocol !== 'file:') {
        return await loadViaFetch(subject, testNumber);
      }
      throw scriptErr;
    }

    return await loadViaFetch(subject, testNumber);
  }

  function getManifest() {
    if (window.TNPSC_MANIFEST && Array.isArray(window.TNPSC_MANIFEST.tests)) {
      return window.TNPSC_MANIFEST;
    }

    // Fallback manifest if manifest.js hasn't been generated yet
    const fallbackTests = [];
    ['tamil', 'maths', 'gk'].forEach((subject) => {
      for (let t = 1; t <= 10; t++) {
        const start = (t - 1) * 100 + 1;
        const end = t * 100;
        fallbackTests.push({
          subject,
          testNumber: t,
          startId: start,
          endId: end,
          questionCount: 100,
          topics: [],
          difficulties: { easy: 35, medium: 45, hard: 20 }
        });
      }
    });
    return { totalQuestions: 3000, totalTests: 30, tests: fallbackTests, allTopics: [] };
  }

  function getTestMeta(subject, testNumber) {
    const manifest = getManifest();
    return (
      manifest.tests.find(
        (m) => m.subject === subject && Number(m.testNumber) === Number(testNumber)
      ) || {
        subject,
        testNumber: Number(testNumber),
        startId: (Number(testNumber) - 1) * 100 + 1,
        endId: Number(testNumber) * 100,
        questionCount: 100,
        topics: [],
        difficulties: { easy: 0, medium: 0, hard: 0 }
      }
    );
  }

  window.TNPSCLoader = {
    SUBJECT_META,
    DIFFICULTY_LABELS,
    pad2,
    loadTest,
    getManifest,
    getTestMeta
  };
})(window);

