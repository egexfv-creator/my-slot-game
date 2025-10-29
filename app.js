// === Parametreler ===
const BASE_STEP = 220;             // tek adım (182 + 38)
const TOTAL_DIST = 1600;           // bir spin toplam mesafe
const DURATION = 1000;             // her kolon için spin süresi
const STAGGER = 100;               // kolonlar arası gecikme (ms)
let globalSpinning = false;

const pool  = ['img/symbol1.png', 'img/symbol2.png', 'img/symbol3.png'];

// preload
(() => { pool.forEach(src => { const im = new Image(); im.src = src; }); })();

const reels = Array.from(document.querySelectorAll('.reel-wrap')).map(wrap => {
  const reel = wrap.querySelector('.reel');
  const nodes = Array.from(reel.querySelectorAll('.symbol'));

  const I_VALUES = nodes.map(n => {
    const m = (n.getAttribute('style') || '').match(/--i:\s*(-?\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  });
  const MIN_I = Math.min(...I_VALUES);
  const MAX_I = Math.max(...I_VALUES);

  return { wrap, reel, nodes, MIN_I, MAX_I, lastCommittedSteps: 0 };
});

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const getI = el => {
  const m = (el.getAttribute('style') || '').match(/--i:\s*(-?\d+)/);
  return m ? parseInt(m[1], 10) : 0;
};
const setI = (el, i) => {
  let s = el.getAttribute('style') || '';
  if (s.includes('--i:')) s = s.replace(/--i:\s*-?\d+/, `--i:${i}`);
  else s = (s.trim() ? s.trim() + '; ' : '') + `--i:${i}`;
  el.setAttribute('style', s);
};

function setOffsetRaw(reelEl, px) {
  reelEl.style.setProperty('--offset', Math.round(px) + 'px');
}

function commitStepDown(R) {
  R.nodes.forEach(el => {
    let ni = getI(el) + 1;
    if (ni > R.MAX_I) ni = R.MIN_I;
    setI(el, ni);
  });
  setOffsetRaw(R.reel, 0);
}

function targetsTop3(R) {
  return R.nodes.filter(n => {
    const i = getI(n);
    return i >= R.MIN_I && i < R.MIN_I + 3;
  });
}

async function prepareNextTop3(R) {
  const targets = targetsTop3(R);
  for (const t of targets) {
    const next = pick(pool);
    t.dataset.nextsrc = next;
    const im = new Image();
    im.src = next;
    try { await im.decode(); } catch(_) {}
  }
}

function applyPreparedTop3(R) {
  const targets = targetsTop3(R);
  for (const t of targets) {
    const next = t.dataset.nextsrc;
    if (next && !t.src.endsWith(next)) t.src = next;
  }
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2;
}

function animateReel(R) {
  return new Promise(async resolve => {
    const TOTAL_STEPS = Math.max(1, Math.round(TOTAL_DIST / BASE_STEP));
    const EFFECTIVE_TOTAL = TOTAL_STEPS * BASE_STEP;
    R.lastCommittedSteps = 0;

    await prepareNextTop3(R);

    const t0 = performance.now();
    let swapQueued = 0;

    function frame(now) {
      const t = Math.min((now - t0) / DURATION, 1);
      const dist = easeInOutCubic(t) * EFFECTIVE_TOTAL;

      const stepsPassed = Math.floor(dist / BASE_STEP);

      while (R.lastCommittedSteps < stepsPassed) {
        commitStepDown(R);
        swapQueued++;
        R.lastCommittedSteps++;
      }

      const stepOffset = dist - stepsPassed * BASE_STEP;
      setOffsetRaw(R.reel, stepOffset);

      if (swapQueued > 0 && stepOffset < 1) {
        applyPreparedTop3(R);
        swapQueued = 0;
        prepareNextTop3(R);
      }

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        while (R.lastCommittedSteps < TOTAL_STEPS) {
          commitStepDown(R);
          swapQueued++;
          R.lastCommittedSteps++;
        }
        requestAnimationFrame(() => {
          setOffsetRaw(R.reel, 0);
          if (swapQueued > 0) applyPreparedTop3(R);
          resolve();
        });
      }
    }
    requestAnimationFrame(frame);
  });
}

async function startAll() {
  if (globalSpinning) return;
  globalSpinning = true;

  const jobs = reels.map((R, idx) =>
    new Promise(res => setTimeout(() => animateReel(R).then(res), idx * STAGGER))
  );

  await Promise.all(jobs);
  globalSpinning = false;
}

document.addEventListener('click', startAll);







