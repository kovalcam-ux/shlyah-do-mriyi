/* ============================================================
   main.js — створення гри Phaser.

   ЧІТКІСТЬ (без розмиття):
   Полотно рендериться у ВИСОКІЙ роздільності — дизайн 960×540
   множиться на коефіцієнт суперсемплінгу SS (≥2; на екранах з
   високою щільністю пікселів — більше, до 4). Тобто буфер канвасу
   стає ≥1920×1080. У кожній сцені камера масштабується (setZoom(SS)),
   тож ігрові координати лишаються 960×540, але вектор (контури,
   текст) малюється одразу у фінальному розмірі — чітко.
   FIT + CENTER_BOTH вписує полотно в екран, antialias згладжує.
   ============================================================ */
window.NOSYK = window.NOSYK || {};

window.NOSYK.startGame = function () {
  const CFG = window.NOSYK.CONFIG;

  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  const SS = Math.min(2 * dpr, 4); // коеф. суперсемплінгу: 2..4
  window.NOSYK.SS = SS;

  const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: CFG.COLORS.NAVY_HEX,
    render: {
      antialias: true,
      antialiasGL: true,
      pixelArt: false,
      roundPixels: false,
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: CFG.WIDTH * SS,    // буфер канвасу у високій роздільності
      height: CFG.HEIGHT * SS,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: CFG.FIGHT.GRAVITY },
        debug: false,
      },
    },
    scene: [
      window.NOSYK.BootScene,
      window.NOSYK.MenuScene,
      window.NOSYK.FightScene,
      window.NOSYK.RescueScene,
    ],
  };

  return new Phaser.Game(config);
};

/** Налаштувати камеру сцени: масштаб SS і показ дизайну 960×540. */
window.NOSYK.fitCamera = function (scene) {
  const CFG = window.NOSYK.CONFIG;
  const SS = window.NOSYK.SS || 1;
  const cam = scene.cameras.main;
  cam.setZoom(SS);
  cam.centerOn(CFG.WIDTH / 2, CFG.HEIGHT / 2);
};

/** Текст із підвищеною роздільністю (щоб не розмивався під масштабом камери). */
window.NOSYK.addText = function (scene, x, y, str, style) {
  style = Object.assign({}, style);
  style.resolution = window.NOSYK.SS || 2;
  return scene.add.text(x, y, str, style);
};
