/* ============================================================
   main.js — створення гри Phaser.
   Масштаб FIT (однаково на ПК і телефоні), фізика Arcade.
   ============================================================ */
window.NOSYK = window.NOSYK || {};

window.NOSYK.startGame = function () {
  const CFG = window.NOSYK.CONFIG;

  const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: CFG.WIDTH,
    height: CFG.HEIGHT,
    backgroundColor: CFG.COLORS.NAVY_HEX,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
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
