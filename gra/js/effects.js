/* ============================================================
   Ефекти влучань: кров (увімк) АБО спалахи й зірочки (вимк).
   Перемикач береться з реєстру гри: scene.registry.get('blood').
   Кров і ефекти зʼявляються ТІЛЬКИ між бійцями.
   ============================================================ */
window.NOSYK = window.NOSYK || {};

window.NOSYK.Effects = {
  /**
   * Сплеск у точці удару.
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {number} dir  напрямок розльоту (+1 праворуч, -1 ліворуч)
   */
  hitBurst(scene, x, y, dir) {
    const bloodOn = scene.registry.get('blood') === true;
    const COL = window.NOSYK.CONFIG.COLORS;
    const count = 9;

    for (let i = 0; i < count; i++) {
      let color, size;
      if (bloodOn) {
        // стилізовані червоні бризки
        color = (i % 3 === 0) ? 0x8e2018 : 0xc0392b;
        size = Phaser.Math.Between(3, 7);
      } else {
        // безпечний режим: золоті/білі іскри-зірочки
        color = (i % 2 === 0) ? COL.GOLD : COL.CREAM;
        size = Phaser.Math.Between(2, 5);
      }

      const p = scene.add.rectangle(x, y, size, size, color).setDepth(50);
      const ang = Phaser.Math.FloatBetween(-Math.PI / 2.2, Math.PI / 2.2);
      const speed = Phaser.Math.Between(40, 150);
      const vx = Math.cos(ang) * speed * dir;
      const vy = Math.sin(ang) * speed - 60;

      scene.tweens.add({
        targets: p,
        x: x + vx,
        y: y + vy + 120, // легке "падіння" вниз
        angle: Phaser.Math.Between(-180, 180),
        alpha: 0,
        scale: bloodOn ? 1 : 0.2,
        duration: Phaser.Math.Between(260, 480),
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy(),
      });
    }

    // короткий спалах у місці удару (для обох режимів)
    const flashColor = bloodOn ? 0xff5a3c : COL.GOLD;
    const flash = scene.add.circle(x, y, 18, flashColor, 0.85).setDepth(49);
    scene.tweens.add({
      targets: flash,
      scale: 2,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy(),
    });
  },

  /** Легкий "пил" від блоку (нейтральний, без крові). */
  blockSpark(scene, x, y) {
    const COL = window.NOSYK.CONFIG.COLORS;
    for (let i = 0; i < 5; i++) {
      const p = scene.add.circle(x, y, Phaser.Math.Between(2, 4), COL.CREAM, 0.9).setDepth(50);
      scene.tweens.add({
        targets: p,
        x: x + Phaser.Math.Between(-30, 30),
        y: y - Phaser.Math.Between(10, 40),
        alpha: 0,
        duration: 260,
        onComplete: () => p.destroy(),
      });
    }
  },
};
