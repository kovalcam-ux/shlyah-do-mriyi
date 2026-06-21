/* ============================================================
   BootScene — готує заглушки-текстури бійців і налаштування.
   Якщо колись будуть справжні спрайти (useSprites:true) —
   тут вони завантажаться замість прямокутників.
   ============================================================ */
window.NOSYK = window.NOSYK || {};

(function () {
  const CFG = () => window.NOSYK.CONFIG;

  class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }

    preload() {
      // Завантаження справжніх спрайтів (коли вони зʼявляться)
      const fighters = CFG().FIGHTERS;
      Object.values(fighters).forEach((f) => {
        if (f.useSprites && f.sheet) {
          this.load.spritesheet(f.key, f.sheet, { frameWidth: f.frameW, frameHeight: f.frameH });
        }
      });
    }

    create() {
      // Налаштування "кров" зберігаємо між запусками (за замовч. ВИМК — безпечний режим)
      let blood = false;
      try {
        blood = localStorage.getItem('nosyk_blood') === 'on';
      } catch (e) { blood = false; }
      this.registry.set('blood', blood);

      // Створюємо заглушки-текстури для бійців без спрайтів
      Object.values(CFG().FIGHTERS).forEach((f) => {
        if (!(f.useSprites && f.sheet)) this._makePlaceholder(f);
      });

      this.scene.start('Menu');
    }

    /** Малює просту фігуру бійця з обличчям і "поясом" та робить із неї текстуру. */
    _makePlaceholder(f) {
      const key = 'px_' + f.key;
      if (this.textures.exists(key)) return;
      const w = f.bodyW, h = f.bodyH;
      const g = this.add.graphics();

      g.fillStyle(f.color, 1);
      g.fillRoundedRect(0, 0, w, h, 12);
      g.lineStyle(4, f.trim, 1);
      g.strokeRoundedRect(2, 2, w - 4, h - 4, 12);

      // пояс/деталь
      g.fillStyle(f.trim, 1);
      g.fillRect(4, Math.round(h * 0.55), w - 8, 6);

      // "руки" натяком
      g.fillStyle(f.color, 1);
      g.fillRoundedRect(-6, Math.round(h * 0.32), 10, 36, 4);
      g.fillRoundedRect(w - 4, Math.round(h * 0.32), 10, 36, 4);

      // очі (дивляться праворуч = напрямок за замовчуванням)
      g.fillStyle(0xffffff, 1);
      g.fillCircle(w * 0.62, h * 0.18, 7);
      g.fillCircle(w * 0.82, h * 0.18, 7);
      g.fillStyle(0x0b1322, 1);
      g.fillCircle(w * 0.65, h * 0.18, 3.5);
      g.fillCircle(w * 0.85, h * 0.18, 3.5);

      g.generateTexture(key, w, h);
      g.destroy();
    }
  }

  window.NOSYK.BootScene = BootScene;
})();
