/* ============================================================
   Керування: клавіатура (ПК) + сенсор (телефон).

   ВАЖЛИВО: клавіші зчитуються за ФІЗИЧНИМ розташуванням (event.code:
   KeyA, KeyD, KeyJ...), тому працюють на будь-якій розкладці —
   українській, російській чи англійській.

   touchState заповнюється DOM-джойстиком і кнопками (initTouchControls).
   PlayerInput.get() обʼєднує клавіатуру і сенсор в один обʼєкт.
   ============================================================ */
window.NOSYK = window.NOSYK || {};

// Спільний стан сенсорних кнопок (читає гра, пише DOM)
window.NOSYK.touchState = {
  left: false, right: false, up: false, down: false,
  punch: false, kick: false, block: false,
};

(function () {
  /** Чи це сенсорний пристрій (щоб показати/сховати кнопки). */
  window.NOSYK.isTouchDevice = function () {
    return ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      window.matchMedia('(pointer: coarse)').matches;
  };

  /** Глобальний трекер фізичних клавіш за event.code (незалежно від мови). */
  window.NOSYK.keys = window.NOSYK.keys || (function () {
    const pressed = Object.create(null);
    const GAME = new Set([
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyJ', 'KeyK', 'KeyL',
    ]);
    if (typeof window.addEventListener === 'function') {
      window.addEventListener('keydown', (e) => {
        if (GAME.has(e.code)) { pressed[e.code] = true; e.preventDefault(); }
      });
      window.addEventListener('keyup', (e) => {
        if (GAME.has(e.code)) { pressed[e.code] = false; }
      });
      window.addEventListener('blur', () => {
        for (const k in pressed) pressed[k] = false;
      });
    }
    return { down: (code) => !!pressed[code] };
  })();

  /** Підключення DOM-джойстика і кнопок. Викликати після завантаження сторінки. */
  window.NOSYK.initTouchControls = function () {
    const t = window.NOSYK.touchState;

    // ---- Віртуальний джойстик (рух / стрибок / присід) ----
    const base = document.getElementById('joy-base');
    const knob = document.getElementById('joy-knob');
    if (base && knob) {
      const R = 52;           // радіус ходу ручки
      const DEAD = 0.35;      // мертва зона
      let activeId = null;

      const setFromVec = (nx, ny) => {
        t.left = nx < -DEAD;
        t.right = nx > DEAD;
        t.up = ny < -DEAD;    // штовхнути вгору = стрибок
        t.down = ny > DEAD;   // штовхнути вниз = присід
      };
      const reset = () => {
        t.left = t.right = t.up = t.down = false;
        knob.style.transform = 'translate(-50%, -50%)';
      };
      const move = (clientX, clientY) => {
        const rect = base.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        let dx = clientX - cx;
        let dy = clientY - cy;
        const len = Math.hypot(dx, dy) || 1;
        const cl = Math.min(len, R);
        const ux = (dx / len), uy = (dy / len);
        knob.style.transform = `translate(calc(-50% + ${ux * cl}px), calc(-50% + ${uy * cl}px))`;
        setFromVec(dx / R, dy / R);
      };

      base.addEventListener('pointerdown', (e) => {
        activeId = e.pointerId;
        base.setPointerCapture(e.pointerId);
        move(e.clientX, e.clientY);
        e.preventDefault();
      });
      base.addEventListener('pointermove', (e) => {
        if (e.pointerId !== activeId) return;
        move(e.clientX, e.clientY);
        e.preventDefault();
      });
      const end = (e) => {
        if (e.pointerId !== activeId) return;
        activeId = null;
        reset();
      };
      base.addEventListener('pointerup', end);
      base.addEventListener('pointercancel', end);
      base.addEventListener('lostpointercapture', () => { activeId = null; reset(); });
    }

    // ---- Кнопки дій ----
    const bind = (id, prop) => {
      const el = document.getElementById(id);
      if (!el) return;
      const on = (e) => { t[prop] = true; e.preventDefault(); };
      const off = (e) => { t[prop] = false; e.preventDefault(); };
      el.addEventListener('pointerdown', on);
      el.addEventListener('pointerup', off);
      el.addEventListener('pointerleave', off);
      el.addEventListener('pointercancel', off);
    };
    bind('btn-punch', 'punch');
    bind('btn-kick', 'kick');
    bind('btn-block', 'block');
  };

  /** Клавіатура гравця за фізичним розташуванням клавіш (event.code). */
  class PlayerInput {
    constructor(scene) { this.scene = scene; }

    get() {
      const K = window.NOSYK.keys;
      const t = window.NOSYK.touchState;
      return {
        left: K.down('ArrowLeft') || K.down('KeyA') || t.left,
        right: K.down('ArrowRight') || K.down('KeyD') || t.right,
        up: K.down('ArrowUp') || K.down('KeyW') || t.up,
        down: K.down('ArrowDown') || K.down('KeyS') || t.down,
        punch: K.down('KeyJ') || t.punch,
        kick: K.down('KeyK') || t.kick,
        block: K.down('KeyL') || t.block,
      };
    }
  }

  window.NOSYK.PlayerInput = PlayerInput;
})();
