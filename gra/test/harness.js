/* Тестовий стенд: стабимо Phaser і ганяємо бойову логіку під Node,
   щоб зловити помилки виконання (не графіку). Не входить у гру. */

// --- Стаб Phaser ---
function fakeBody() {
  return {
    blocked: { down: true }, touching: { down: true },
    velocity: { x: 0, y: 0 },
    setVelocityX(v) { this.velocity.x = v; return this; },
    setVelocityY(v) { this.velocity.y = v; return this; },
    setVelocity(x, y) { this.velocity.x = x; this.velocity.y = y; return this; },
    setSize() { return this; },
    setMaxVelocity() { return this; },
  };
}
function makeGO(init) {
  const target = Object.assign({ x: 0, y: 0, scaleY: 1, scaleX: 1, visible: true, body: fakeBody() }, init);
  const handler = {
    get(t, p) {
      if (p in t) return t[p];
      if (p === 'setPosition') return (x, y) => { t.x = x; t.y = y; return proxy; };
      if (p === 'setX') return (x) => { t.x = x; return proxy; };
      return function () { return proxy; }; // будь-який інший метод — chainable no-op
    },
    set(t, p, v) { t[p] = v; return true; },
  };
  const proxy = new Proxy(target, handler);
  return proxy;
}
function makeScene() {
  return {
    time: { now: 0, delayedCall() {} },
    tweens: { add() {} },
    cameras: { main: { shake() {} } },
    registry: { _b: false, get() { return this._b; }, set(k, v) { this._b = v; } },
    add: {
      rectangle() { return makeGO(); },
      circle() { return makeGO(); },
      arc() { return makeGO(); },
      text() { return makeGO(); },
      container() { return makeGO(); },
      graphics() { return makeGO(); },
    },
    physics: { add: { sprite() { return makeGO(); }, existing() {}, collider() {} } },
  };
}

global.window = global;
global.Phaser = {
  Math: {
    Between: (a, b) => Math.floor((a + b) / 2),
    FloatBetween: (a, b) => (a + b) / 2,
    Clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  },
  Display: {
    Color: {
      IntegerToColor: (c) => ({ red: (c >> 16) & 255, green: (c >> 8) & 255, blue: c & 255 }),
      GetColor: (r, g, b) => (r << 16) | (g << 8) | b,
    },
  },
};

// --- Завантаження бойового коду ---
require('../js/config.js');
require('../js/main.js');   // визначає window.NOSYK.addText (не запускає гру)
require('../js/effects.js');
require('../js/fighter.js');
require('../js/ai.js');
window.NOSYK.SS = 2;        // коеф. суперсемплінгу для тесту

const N = window.NOSYK;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + m); } };

function newFighters() {
  const scene = makeScene();
  const p = new N.Fighter(scene, 300, 1, N.CONFIG.FIGHTERS.player);
  const b = new N.Fighter(scene, 360, -1, N.CONFIG.FIGHTERS.dilok);
  p.sprite.x = 300; p.sprite.y = 405;
  b.sprite.x = 360; b.sprite.y = 405;
  return { scene, p, b };
}

// Тест 1: удари знімають здоровʼя суперника
(function () {
  const { scene, p, b } = newFighters();
  const press = { left: false, right: false, up: false, down: false, punch: true, kick: false, block: false };
  for (let t = 0; t <= 4000; t += 16) {
    scene.time.now = t;
    p.sprite.x = 300; b.sprite.x = 360; // тримаємо в дистанції
    p.update(t, press, b);
    b.update(t, N.BotAI.idle(), p);
  }
  ok(b.hp < N.CONFIG.FIGHT.MAX_HP, 'удари мають знімати HP бота (hp=' + b.hp + ')');
  ok(p.hp === N.CONFIG.FIGHT.MAX_HP, 'гравець не має втрачати HP (hp=' + p.hp + ')');
  console.log('Тест 1: HP бота після серії ударів = ' + b.hp);
})();

// Тест 2: блок зменшує шкоду
(function () {
  const a = newFighters();
  // без блоку
  let t = 0; a.scene.time.now = t;
  a.p.sprite.x = 300; a.b.sprite.x = 360;
  a.p.update(t, { punch: true, left: 0, right: 0, up: 0, down: 0, kick: 0, block: 0 }, a.b);
  // прокрутити до моменту влучання
  for (t = 0; t <= 200; t += 16) { a.scene.time.now = t; a.p.sprite.x = 300; a.b.sprite.x = 360; a.p.update(t, { punch: true }, a.b); a.b.update(t, N.BotAI.idle(), a.p); }
  const dmgNoBlock = N.CONFIG.FIGHT.MAX_HP - a.b.hp;

  const c = newFighters();
  for (t = 0; t <= 200; t += 16) { c.scene.time.now = t; c.p.sprite.x = 300; c.b.sprite.x = 360; c.p.update(t, { punch: true }, c.b); c.b.update(t, { block: true }, c.p); }
  const dmgBlock = N.CONFIG.FIGHT.MAX_HP - c.b.hp;

  ok(dmgNoBlock > 0, 'без блоку має бути шкода (' + dmgNoBlock + ')');
  ok(dmgBlock < dmgNoBlock, 'блок має зменшувати шкоду (' + dmgBlock + ' < ' + dmgNoBlock + ')');
  console.log('Тест 2: шкода без блоку=' + dmgNoBlock + ', з блоком=' + dmgBlock);
})();

// Тест 3: присід ухиляється від удару рукою, але не від ноги
(function () {
  const a = newFighters();
  let t = 0;
  // суперник присідає: подаємо down, але down працює лише коли не атакує сам
  for (t = 0; t <= 300; t += 16) {
    a.scene.time.now = t; a.p.sprite.x = 300; a.b.sprite.x = 360;
    a.p.update(t, { punch: true }, a.b);
    a.b.update(t, { down: true }, a.p);
  }
  ok(a.b.hp === N.CONFIG.FIGHT.MAX_HP, 'присід має ухилятись від удару рукою (hp=' + a.b.hp + ')');

  const k = newFighters();
  for (t = 0; t <= 400; t += 16) {
    k.scene.time.now = t; k.p.sprite.x = 300; k.b.sprite.x = 360;
    k.p.update(t, { kick: true }, k.b);
    k.b.update(t, { down: true }, k.p);
  }
  ok(k.b.hp < N.CONFIG.FIGHT.MAX_HP, 'удар ногою має влучати у присід (hp=' + k.b.hp + ')');
  console.log('Тест 3: рука у присід hp=' + a.b.hp + ', нога у присід hp=' + k.b.hp);
})();

// Тест 4: нокаут вимикає бійця
(function () {
  const { scene, p, b } = newFighters();
  for (let t = 0; t <= 12000 && b.alive; t += 16) {
    scene.time.now = t; p.sprite.x = 300; b.sprite.x = 360;
    p.update(t, { kick: true }, b);
    b.update(t, N.BotAI.idle(), p);
  }
  ok(!b.alive, 'бот має бути нокаутований після достатньої кількості ударів');
  ok(b.hp === 0, 'HP нокаутованого = 0 (hp=' + b.hp + ')');
  console.log('Тест 4: бота нокаутовано, alive=' + b.alive);
})();

// Тест 5: ШІ повертає коректний обʼєкт кнопок і не падає
(function () {
  const { scene, p, b } = newFighters();
  const ai = new N.BotAI(0.5);
  let crashed = false;
  try {
    for (let t = 0; t <= 5000; t += 16) {
      scene.time.now = t;
      const c = ai.decide(t, b, p);
      ok(typeof c.left === 'boolean' && typeof c.punch === 'boolean', 'ШІ повертає булеві кнопки');
      b.update(t, c, p);
      p.update(t, N.BotAI.idle(), b);
      if (fail > 3) break;
    }
  } catch (e) { crashed = true; console.log('  ✗ ШІ впав: ' + e.message); }
  ok(!crashed, 'ШІ не має падати під час циклу');
  console.log('Тест 5: ШІ відпрацював цикл без помилок');
})();

console.log('\n=== Підсумок: ' + pass + ' пройдено, ' + fail + ' провалено ===');
process.exit(fail ? 1 : 0);
