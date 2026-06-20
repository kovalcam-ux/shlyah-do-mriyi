/* ============================================================
   RescueScene — екран перемоги зі сценою порятунку.
   Боєць переміг → суперника забирає поліція, з клітки виходить
   намальована тваринка (піксель-арт заглушка), заклик до дій
   і кнопки поширення.
   ВАЖЛИВО: жодного насильства над твариною — лише порятунок.
   ============================================================ */
window.NOSYK = window.NOSYK || {};

(function () {
  const CFG = () => window.NOSYK.CONFIG;
  const UI = () => window.NOSYK.UI;

  class RescueScene extends Phaser.Scene {
    constructor() { super('Rescue'); }

    create() {
      const { WIDTH, HEIGHT, COLORS } = CFG();
      const groundY = 360;

      this.add.rectangle(0, 0, WIDTH, HEIGHT, COLORS.NAVY).setOrigin(0);
      this.add.rectangle(WIDTH / 2, groundY + 90, WIDTH, 180, 0x10203c).setOrigin(0.5);

      this.add.text(WIDTH / 2, 56, 'ПЕРЕМОГА!', {
        fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '60px',
        color: '#f0c453', fontStyle: 'bold', stroke: '#0b1322', strokeThickness: 6,
      }).setOrigin(0.5);

      // --- Суперник (повалений) ---
      const villain = this.add.container(280, groundY - 60);
      const vb = this.add.rectangle(0, 0, 74, 134, COLORS.RED).setStrokeStyle(4, 0xf2b6ae);
      villain.add(vb);
      villain.setAngle(-85); // лежить
      villain.setAlpha(0.9);

      // --- Поліція (заглушка) ---
      const police = this.add.container(1080, groundY - 65);
      police.add(this.add.rectangle(0, 0, 60, 130, 0x2e5cb8).setStrokeStyle(4, 0xbcd2ff));
      police.add(this.add.rectangle(0, -78, 56, 22, 0x14306e)); // кашкет
      police.add(this.add.text(0, 0, 'ПОЛІЦІЯ', {
        fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5).setAngle(-90));

      // --- Клітка + тваринка ---
      const cageX = 660;
      this.cageBars = [];
      const cageTop = this.add.rectangle(cageX, groundY - 150, 150, 8, 0x9aa6bd);
      const cageBot = this.add.rectangle(cageX, groundY + 6, 150, 8, 0x9aa6bd);
      this.cageBars.push(cageTop, cageBot);
      for (let i = 0; i < 6; i++) {
        const bx = cageX - 65 + i * 26;
        this.cageBars.push(this.add.rectangle(bx, groundY - 72, 6, 156, 0xb6c0d6));
      }

      const animal = this._drawDog(cageX, groundY - 30);
      animal.setScale(0.6).setAlpha(0.85);
      this.animal = animal;

      // --- Заклик ---
      this.cta = this.add.text(WIDTH / 2, 430,
        'Хочеш рятувати тварин по-справжньому?\n' +
        'Роби репости наших публікацій, розповідай друзям про стерилізацію, ділися інформацією.',
        {
          fontFamily: 'Arial, sans-serif', fontSize: '20px', color: '#eef3fb',
          align: 'center', lineSpacing: 6, wordWrap: { width: WIDTH - 120 },
        }).setOrigin(0.5).setAlpha(0);

      // --- Кнопки (спершу сховані) ---
      this.buttons = [];
      const again = UI().makeButton(this, WIDTH / 2 - 300, 500, 200, 56, 'Грати ще раз',
        () => this.scene.start('Fight'), { fill: COLORS.RED, fontSize: 22 });
      const fb = UI().makeButton(this, WIDTH / 2 - 70, 500, 150, 56, 'Facebook',
        () => this._share('fb'), { fill: 0x1877f2, fontSize: 20 });
      const tg = UI().makeButton(this, WIDTH / 2 + 100, 500, 150, 56, 'Telegram',
        () => this._share('tg'), { fill: 0x229ed9, fontSize: 20 });
      const ig = UI().makeButton(this, WIDTH / 2 + 300, 500, 170, 56, 'Instagram',
        () => this._share('ig'), { fill: 0xc13584, fontSize: 20 });
      this.buttons.push(again, fb, tg, ig);
      this.buttons.forEach((b) => b.setAlpha(0));

      this._playSequence(police, villain, animal);
    }

    _playSequence(police, villain, animal) {
      // 1) поліція заходить
      this.tweens.add({ targets: police, x: 380, duration: 700, delay: 300, ease: 'Quad.easeOut' });
      // 2) забирає суперника за межі екрана
      this.time.delayedCall(1200, () => {
        this.tweens.add({ targets: [police, villain], x: -180, duration: 1000, ease: 'Quad.easeIn' });
      });
      // 3) клітка ламається
      this.time.delayedCall(1700, () => {
        this.cameras.main.shake(160, 0.006);
        this.cageBars.forEach((bar) => {
          this.tweens.add({
            targets: bar, y: bar.y + 220, angle: Phaser.Math.Between(-120, 120),
            alpha: 0, duration: 600, ease: 'Quad.easeIn',
            onComplete: () => bar.destroy(),
          });
        });
      });
      // 4) тваринка виходить
      this.time.delayedCall(2100, () => {
        this.tweens.add({
          targets: animal, x: 470, scale: 1, alpha: 1, duration: 700, ease: 'Back.easeOut',
        });
        // радісні підстрибування
        this.tweens.add({
          targets: animal, y: animal.y - 22, duration: 320, yoyo: true, repeat: 3,
          delay: 700, ease: 'Quad.easeOut',
        });
        // сердечка
        this.time.delayedCall(800, () => this._hearts(470, animal.y));
      });
      // 5) текст і кнопки
      this.time.delayedCall(2700, () => {
        this.tweens.add({ targets: this.cta, alpha: 1, duration: 500 });
        this.buttons.forEach((b, i) => {
          this.tweens.add({ targets: b, alpha: 1, duration: 400, delay: i * 90 });
        });
      });
    }

    _hearts(x, y) {
      for (let i = 0; i < 6; i++) {
        const h = this.add.text(x + Phaser.Math.Between(-40, 40), y, '❤', {
          fontSize: Phaser.Math.Between(16, 26) + 'px', color: '#ff6b6b',
        }).setOrigin(0.5).setDepth(60);
        this.tweens.add({
          targets: h, y: y - Phaser.Math.Between(80, 160), alpha: 0,
          duration: Phaser.Math.Between(900, 1500), delay: i * 160,
          onComplete: () => h.destroy(),
        });
      }
    }

    /** Проста "піксель-арт" заглушка тваринки (песик). Легко замінити справжнім спрайтом. */
    _drawDog(x, y) {
      const c = this.add.container(x, y).setDepth(40);
      const body = 0xc98a4b, dark = 0x8a5a2b, cream = 0xf3e3c8;
      const px = (gx, gy, gw, gh, color) =>
        c.add(this.add.rectangle(gx, gy, gw, gh, color).setOrigin(0.5));

      // тіло
      px(0, 0, 86, 56, body);
      // голова
      px(48, -34, 56, 50, body);
      // вуха
      px(34, -60, 16, 26, dark);
      px(64, -60, 16, 26, dark);
      // морда
      px(60, -22, 30, 22, cream);
      // ніс
      px(74, -26, 10, 9, 0x222222);
      // око
      px(50, -40, 9, 9, 0x222222);
      // лапи
      px(-28, 34, 18, 26, dark);
      px(0, 34, 18, 26, dark);
      px(28, 34, 18, 26, dark);
      // хвіст
      px(-50, -14, 26, 14, body);
      return c;
    }

    _share(net) {
      const url = window.location.href;
      const text = 'Граю в «Загін Носик» — допоможи притулку рятувати тварин! Роби репост і розкажи друзям про стерилізацію. 🐾';
      const u = encodeURIComponent(url);
      const t = encodeURIComponent(text);
      let link;
      if (net === 'fb') {
        link = `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}`;
      } else if (net === 'tg') {
        link = `https://t.me/share/url?url=${u}&text=${t}`;
      } else {
        // Instagram не має веб-поширення: копіюємо текст і відкриваємо сайт
        try {
          if (navigator.clipboard) navigator.clipboard.writeText(text + ' ' + url);
        } catch (e) {}
        link = 'https://www.instagram.com/';
      }
      window.open(link, '_blank', 'noopener');
    }
  }

  window.NOSYK.RescueScene = RescueScene;
})();
