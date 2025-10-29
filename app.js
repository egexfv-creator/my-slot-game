// === Spin ayarları ===
const BASE_STEP = 220;            // TEK adım (182 + 38)
const TOTAL_DIST = 1600;          // Bir spin'de gidecek toplam piksel (ör: 1600)
const DURATION = 1000;            // 1 saniye
const DELAY = 500;                // 0.5 saniye
let spinning = false;

const reel  = document.getElementById('reel');
const nodes = Array.from(document.querySelectorAll('#reel .symbol'));
const pool  = ['img/symbol1.png', 'img/symbol2.png', 'img/symbol3.png'];

// i aralığını otomatik bul (ör: -3..3 veya -3..2)
const I_VALUES = nodes.map(n => {
  const m = (n.getAttribute('style') || '').match(/--i:\s*(-?\d+)/);
  return m ? parseInt(m[1], 10) : 0;
});
const MIN_I = Math.min(...I_VALUES);   // -3
const MAX_I = Math.max(...I_VALUES);   // 2 veya 3

// yardımcılar
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

// OFFSET — animasyonda MOD KULLANMA (tek kare hayaletini engelle)
function setOffsetRaw(px) {
  // 0..BASE_STEP aralığına sıkıştır
  const clamped = Math.max(0, Math.min(BASE_STEP, Math.round(px)));
  reel.style.setProperty('--offset', clamped + 'px');
}

// Bir SONRAKİ karede yeni düzeni kalıcı yap: i = i + 1 (aşağı kayma)
function commitStepDown() {
  nodes.forEach(el => {
    let ni = getI(el) + 1;    // +1 adım aşağı
    if (ni > MAX_I) ni = MIN_I;
    setI(el, ni);
  });
  setOffsetRaw(0);
}

// preload
(() => { pool.forEach(src => { const im = new Image(); im.src = src; }); })();

// Görünmeyen ÜSTTEKİ 3 slotu hızlıca random değiştir (decode beklemeden)
function swapOffscreenIconTop3Quick() {
  const targets = nodes.filter(n => {
    const i = getI(n);
    return i >= MIN_I && i < MIN_I + 3; // MIN_I, MIN_I+1, MIN_I+2
  });
  for (const target of targets) {
    const next = pick(pool);
    if (!target.src.endsWith(next)) target.src = next;
  }
}

function startSpinOnce() {
  if (spinning) return;
  spinning = true;

  setTimeout(() => {
    const t0 = performance.now();
    const total = TOTAL_DIST;
    let lastCommittedSteps = 0; // kaç adım commit edildi

    function frame(now) {
      const t = Math.min((now - t0) / DURATION, 1);
      // LINEER hız (istersen easeOutCubic: const dist = (1 - Math.pow(1 - t, 3)) * total;)
      const dist = t * total;

      // Geçilen adım sayısı
      const stepsPassed = Math.floor(dist / BASE_STEP);

      // Yeni adımlar geldikçe anında wrap + üst 3'ü randomla
      while (lastCommittedSteps < stepsPassed) {
        commitStepDown();              // i += 1
        swapOffscreenIconTop3Quick();  // görünmeyen üst 3'ü yenile
        lastCommittedSteps++;
      }

      // Bu adım içindeki kalan ofset (MOD kullanmadan hesaplayıp 0..BASE_STEP aralığında tut)
      const stepOffset = dist - stepsPassed * BASE_STEP;
      setOffsetRaw(stepOffset);

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        // Final: ofseti tam basa al, son görünmeyenleri de tazele
        requestAnimationFrame(() => {
          setOffsetRaw(0);
          swapOffscreenIconTop3Quick();
          spinning = false;
        });
      }
    }
    requestAnimationFrame(frame);
  }, DELAY);
}

document.addEventListener('click', startSpinOnce);
