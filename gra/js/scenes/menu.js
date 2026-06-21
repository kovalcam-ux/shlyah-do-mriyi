/* ============================================================
   MenuScene — головне меню: назва, керування, перемикач крові,
   кнопка початку бою.
   ============================================================ */
window.NOSYK = window.NOSYK || {};

(function () {
  const CFG = () => window.NOSYK.CONFIG;
  const UI = () => window.NOSYK.UI;

  class MenuScene extends Phaser.Scene {
    constructor() { super('Menu'); }

    create() {
      const { WIDTH, HEIGHT, COLORS } = CFG();
      const T = window.NOSYK.addText;
      window.NOSYK.fitCamera(this);

      // фон
      this.add.rectangle(0, 0, WIDTH, HEIGHT, COLORS.NAVY).setOrigin(0);
      this.add.rectangle(0, HEIGHT, WIDTH, 160, COLORS.DARK).setOrigin(0, 1);

      // заголовок
      T(this, WIDTH / 2, 90, 'ЗАГІН НОСИК', {
        fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '64px',
        color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
      T(this, WIDTH / 2, 138, 'Бій за тварин • прототип', {
        fontFamily: 'Arial, sans-serif', fontSize: '22px', color: '#f0c453',
      }).setOrigin(0.5);

      // підказка з керуванням
      const help = window.NOSYK.isTouchDevice()
        ? 'Телефон: джойстик ліворуч — рух/стрибок/присід.\nКнопки праворуч — удар, нога, блок.'
        : 'Рух: ← → або A D    Стрибок: ↑    Присід: ↓\nУдар рукою: J    Удар ногою: K    Блок: L';
      T(this, WIDTH / 2, 240, help, {
        fontFamily: 'Arial, sans-serif', fontSize: '20px', color: '#cdd9ee',
        align: 'center', lineSpacing: 8,
      }).setOrigin(0.5);

      // кнопка "БІЙ"
      UI().makeButton(this, WIDTH / 2, 350, 280, 70, 'У БІЙ!', () => {
        this.scene.start('Fight');
      }, { fill: COLORS.RED, fontSize: 32 });

      // перемикач крові
      this.bloodBtn = UI().makeButton(this, WIDTH / 2, 440, 360, 56,
        this._bloodLabel(), () => this._toggleBlood(),
        { fill: 0x223a66, fontSize: 22 });

      T(this, WIDTH / 2, 482, 'За замовчуванням кров вимкнено (безпечний режим).', {
        fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#8aa0c2',
      }).setOrigin(0.5);

      T(this, WIDTH / 2, HEIGHT - 22,
        'Притулок «Шлях до мрії» — рятуємо тварин по-справжньому 🐾', {
        fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#7f93b5',
      }).setOrigin(0.5);
    }

    _bloodLabel() {
      const on = this.registry.get('blood') === true;
      return on ? 'Кров: УВІМК 🩸' : 'Кров: ВИМК (зірочки) ✨';
    }

    _toggleBlood() {
      const on = !(this.registry.get('blood') === true);
      this.registry.set('blood', on);
      try { localStorage.setItem('nosyk_blood', on ? 'on' : 'off'); } catch (e) {}
      this.bloodBtn.label.setText(this._bloodLabel());
    }
  }

  window.NOSYK.MenuScene = MenuScene;
})();
