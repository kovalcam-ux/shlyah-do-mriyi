/* ============================================================
   Загін Носик — конфігурація гри (прототип, Етап 1)
   ------------------------------------------------------------
   Тут зібрано всі "налаштування" гри в одному місці:
   розміри, кольори бренду, баланс бою і ШЛЯХИ ДО СПРАЙТІВ.

   ВАЖЛИВО: зараз спрайтів немає — бійці малюються прямокутниками
   (заглушки). Коли зʼявиться справжній піксель-арт, достатньо
   вписати шляхи у поле `sheet` нижче і ввімкнути useSprites=true.
   Решта коду вже готова їх підхопити.
   ============================================================ */
window.NOSYK = window.NOSYK || {};

window.NOSYK.CONFIG = {
  // --- Розмір ігрового полотна (16:9, ландшафт) ---
  WIDTH: 960,
  HEIGHT: 540,
  GROUND_Y: 470, // рівень "підлоги" арени (низ ніг бійця)

  // --- Кольори бренду ---
  COLORS: {
    NAVY: 0x1a2e5a,
    NAVY_HEX: '#1a2e5a',
    RED: 0xc0392b,
    RED_HEX: '#c0392b',
    CREAM: 0xeef3fb,
    GOLD: 0xf0c453,
    GREEN: 0x5fa46f,
    DARK: 0x0b1322,
  },

  // --- Баланс поєдинку ---
  MATCH: {
    ROUNDS_TO_WIN: 2,   // best of 3
    ROUND_TIME: 90,     // секунд на раунд
  },

  // --- Баланс бою ---
  FIGHT: {
    MAX_HP: 100,
    PUNCH_DMG: 8,
    KICK_DMG: 13,
    BLOCK_REDUCTION: 0.8, // блок прибирає 80% шкоди
    PUNCH_REACH: 95,      // дальність руки (по X)
    KICK_REACH: 120,      // дальність ноги
    HIT_VERTICAL: 95,     // максимальна різниця по Y, щоб влучити
    MOVE_SPEED: 220,
    JUMP_VELOCITY: -560,
    GRAVITY: 1400,
    PUNCH_COOLDOWN: 360,  // мс між ударами рукою
    KICK_COOLDOWN: 520,   // мс між ударами ногою
    HITSTUN: 280,         // мс "оглушення" після влучання
    KNOCKBACK: 140,       // відкидання при влучанні
  },

  // --- Бійці. color = заглушка-прямокутник; sheet = справжній спрайт (потім) ---
  // useSprites: false  -> грати на прямокутниках
  // useSprites: true   -> завантажувати картинки зі sheet/animations
  FIGHTERS: {
    player: {
      key: 'player',
      name: 'Носик',
      color: 0x3a7bd5,      // синій боєць (гравець)
      trim: 0x9fd0ff,
      bodyW: 70,
      bodyH: 130,
      useSprites: false,
      sheet: null,          // напр.: 'assets/player.png'
      frameW: 96,
      frameH: 96,
      animations: {
        // приклад майбутньої анімації:
        // idle:  { frames: [0,1,2,3], rate: 6, repeat: -1 },
        // walk:  { frames: [4,5,6,7], rate: 10, repeat: -1 },
        // punch: { frames: [8,9],     rate: 14, repeat: 0 },
      },
    },
    dilok: {
      key: 'dilok',
      name: 'Базарний Ділок',
      color: 0xc0392b,      // червоний суперник
      trim: 0xf2b6ae,
      bodyW: 74,
      bodyH: 134,
      useSprites: false,
      sheet: null,          // напр.: 'assets/dilok.png'
      frameW: 96,
      frameH: 96,
      animations: {},
    },
  },
};
