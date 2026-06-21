/* ============================================================
   main.js — створення гри Phaser.

   ЧІТКІСТЬ: ігрові координати лишаються 960×540 (щоб уся розкладка
   працювала), але канвас рендериться у високій роздільності через
   scale.zoom. zoom = 2 → полотно 1920×1080; на екранах з високою
   щільністю пікселів множимо ще на devicePixelRatio (до 4×).
   Режим FIT + CENTER_BOTH вписує це полотно в екран без CSS-розмиття.
   antialias: true — згладжування фігур (це не піксель-арт).
   ============================================================ */
window.NOSYK = window.NOSYK || {};

window.NOSYK.startGame = function () {
  const CFG = window.NOSYK.CONFIG;

  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  const zoom = 2 * dpr; // ефективна роздільність ≥ 1920×1080, на retina — більше

  const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: CFG.WIDTH,
    height: CFG.HEIGHT,
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
      width: CFG.WIDTH,
      height: CFG.HEIGHT,
      zoom: zoom,
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
