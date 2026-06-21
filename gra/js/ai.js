/* ============================================================
   Простий ШІ для бота «Базарний Ділок».
   Кожен кадр повертає обʼєкт "кнопок" (як у гравця), щоб
   Fighter обробляв його однаково. Бот живий, але не ідеальний:
   підходить, інколи бʼє, інколи блокує, інколи відступає.
   ============================================================ */
window.NOSYK = window.NOSYK || {};

(function () {
  const C = () => window.NOSYK.CONFIG;

  class BotAI {
    constructor(difficulty) {
      this.intent = 'approach';
      this.until = 0;
      this.attackKind = 'punch';
      this.aggr = difficulty || 0.5; // 0..1, як часто атакує
    }

    static idle() {
      return { left: false, right: false, up: false, down: false, punch: false, kick: false, block: false };
    }

    decide(time, self, player) {
      const c = BotAI.idle();
      if (!self.alive || !player.alive) return c;

      const F = C().FIGHT;
      const dx = player.sprite.x - self.sprite.x;
      const dist = Math.abs(dx);
      const dir = dx >= 0 ? 1 : -1;
      const range = F.KICK_REACH + self.cfg.bodyW / 2 - 12;

      // Періодично обираємо нову "ідею"
      if (time >= this.until) {
        this.until = time + Phaser.Math.Between(260, 700);
        const r = Math.random();
        if (dist > range + 70) {
          this.intent = r < 0.9 ? 'approach' : 'wait';
        } else if (dist > range) {
          this.intent = r < 0.55 ? 'approach' : r < 0.8 ? 'attack' : 'block';
        } else {
          if (r < 0.4 + this.aggr * 0.25) {
            this.intent = 'attack';
            this.attackKind = Math.random() < 0.55 ? 'punch' : 'kick';
          } else if (r < 0.72) {
            this.intent = 'block';
          } else if (r < 0.87) {
            this.intent = 'back';
          } else {
            this.intent = 'wait';
          }
        }
      }

      // Реакція: якщо гравець бʼє поруч — інколи блокує саме зараз
      if ((player.state === 'punch' || player.state === 'kick') && dist < range + 25 && Math.random() < 0.10) {
        this.intent = 'block';
        this.until = time + 220;
      }

      switch (this.intent) {
        case 'approach':
          if (dist > range - 8) {
            if (dir > 0) c.right = true; else c.left = true;
          }
          if (Math.random() < 0.008) c.up = true; // зрідка підстрибує
          break;
        case 'attack':
          if (dist > range) {
            if (dir > 0) c.right = true; else c.left = true;
          } else if (this.attackKind === 'kick') {
            c.kick = true;
          } else {
            c.punch = true;
          }
          break;
        case 'block':
          c.block = true;
          break;
        case 'back':
          if (dir > 0) c.left = true; else c.right = true;
          break;
        case 'wait':
        default:
          break;
      }
      return c;
    }
  }

  window.NOSYK.BotAI = BotAI;
})();
