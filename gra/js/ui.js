/* ============================================================
   Маленькі помічники інтерфейсу: кнопки в стилі бренду.
   ============================================================ */
window.NOSYK = window.NOSYK || {};

window.NOSYK.UI = {
  /**
   * Кнопка-прямокутник із текстом. Повертає Phaser.Container.
   */
  makeButton(scene, x, y, w, h, label, onClick, opts) {
    opts = opts || {};
    const COL = window.NOSYK.CONFIG.COLORS;
    const fill = opts.fill != null ? opts.fill : COL.RED;
    const fontSize = opts.fontSize || 26;

    const bg = scene.add.rectangle(0, 0, w, h, fill, 1)
      .setStrokeStyle(3, COL.CREAM, 0.9);
    const txt = scene.add.text(0, 0, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: fontSize + 'px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const cont = scene.add.container(x, y, [bg, txt]).setDepth(100);

    // Інтерактивним робимо саме прямокутник (надійніше, ніж контейнер)
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => bg.setFillStyle(window.NOSYK.UI._lighten(fill), 1));
    bg.on('pointerout', () => bg.setFillStyle(fill, 1));
    bg.on('pointerdown', () => cont.setScale(0.96));
    bg.on('pointerup', () => {
      cont.setScale(1);
      if (onClick) onClick();
    });

    cont.label = txt; // щоб можна було змінювати текст ззовні
    cont.bg = bg;
    return cont;
  },

  _lighten(color) {
    const c = Phaser.Display.Color.IntegerToColor(color);
    return Phaser.Display.Color.GetColor(
      Math.min(255, c.red + 35),
      Math.min(255, c.green + 35),
      Math.min(255, c.blue + 35)
    );
  },
};
