// === Spin ayarları ===
const STEP = 220;        // 182 + 38
const DURATION = 1000;   // 1 saniye
const DELAY = 500;       // 0.5 saniye
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
  reel.style.setProperty('--offset', Math.round(px) + 'px');
}

// Bir SONRAKİ karede yeni düzeni kalıcı yap: i = i + 1 (aşağı kayma)
function commitStepDown() {
  nodes.forEach(el => {
    let ni = getI(el) + 1;    // DİKKAT: +1
    if (ni > MAX_I) ni = MIN_I;
    setI(el, ni);
  });
  setOffsetRaw(0);
}

// flicker azaltmak için preload
(() => { pool.forEach(src => { const im = new Image(); im.src = src; }); })();

// Görünür olmayan üst slotun ikonunu sessizce değiştir
async function swapOffscreenIcon() {
  const target = nodes.find(n => getI(n) === MIN_I);
  if (!target) return;
  const next = pick(pool);
  if (target.src.endsWith(next)) return;
  const im = new Image();
  im.src = next;
  try { await im.decode(); } catch(_) {}
  target.src = next;
}

function startSpinOnce() {
  if (spinning) return;
  spinning = true;

  setTimeout(() => {
    const t0 = performance.now();
    const total = STEP;

    function frame(now) {
      const t = Math.min((now - t0) / DURATION, 1);
      // easeOutCubic (istersen t kullanıp lineer yapabilirsin)
      const dist = (1 - Math.pow(1 - t, 3)) * total;
      setOffsetRaw(dist);            // MOD YOK

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        requestAnimationFrame(async () => {
          commitStepDown();          // i += 1, wrap
          setOffsetRaw(0);           // wrap sonrası 0
          await swapOffscreenIcon(); // yalnızca ekranda DEĞİLKEN değiştir
          spinning = false;
        });
      }
    }
    requestAnimationFrame(frame);
  }, DELAY);
}

document.addEventListener('click', startSpinOnce);