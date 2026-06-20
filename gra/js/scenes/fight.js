/* ============================================================
   FightScene — серце гри: бій, раунди, дві шкали здоровʼя, таймер.
   Best of 3 (до 2 виграних раундів), 90 секунд на раунд.
   ============================================================ */
window.NOSYK = window.NOSYK || {};

(function () {
  const CFG = () => window.NOSYK.CONFIG;
  const IDLE = () => window.NOSYK.BotAI.idle();

  class FightScene extends Phaser.Scene {
    constructor() { super('Fight'); }

    create() {
      const { WIDTH, HEIGHT, GROUND_Y, COLORS } = CFG();

      // ---- Стан матчу ----
      this.phase = 'intro';            // intro | fight | roundover | matchover
      this.round = 1;
      this.wins = { player: 0, bot: 0 };
      this.timeLeft = CFG().MATCH.ROUND_TIME;
      this._tickAt = 0;

      // ---- Арена ----
      this.add.rectangle(0, 0, WIDTH, HEIGHT, COLORS.NAVY).setOrigin(0);
      // дальній план
      this.add.rectangle(WIDTH / 2, GROUND_Y - 120, WIDTH, 12, 0x24406f).setAlpha(0.5);
      // підлога
      const floor = this.add.rectangle(WIDTH / 2, GROUND_Y + 35, WIDTH, 70, 0x10203c).setOrigin(0.5);
      this.add.rectangle(WIDTH / 2, GROUND_Y, WIDTH, 4, COLORS.RED).setAlpha(0.6);
      this.physics.add.existing(floor, true); // статичне тіло-підлога

      // ---- Бійці ----
      const F = window.NOSYK.Fighter;
      this.player = new F(this, 320, 1, CFG().FIGHTERS.player);
      this.bot = new F(this, 640, -1, CFG().FIGHTERS.dilok);
      this.physics.add.collider(this.player.sprite, floor);
      this.physics.add.collider(this.bot.sprite, floor);
      // бійці трохи штовхають один одного, але не злипаються
      this.physics.add.collider(this.player.sprite, this.bot.sprite);

      // ---- Керування ----
      this.playerInput = new window.NOSYK.PlayerInput(this);
      this.botAI = new window.NOSYK.BotAI(0.5);

      // ---- HUD ----
      this._buildHud();

      // ---- Банер у центрі ----
      this.banner = this.add.text(WIDTH / 2, HEIGHT / 2 - 30, '', {
        fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '72px',
        color: '#ffffff', fontStyle: 'bold', stroke: '#0b1322', strokeThickness: 8,
      }).setOrigin(0.5).setDepth(200).setAlpha(0);

      // показати сенсорні кнопки на телефоні
      this._toggleTouchUI(true);
      this.events.once('shutdown', () => this._toggleTouchUI(false));

      this._startRound();
    }

    // ---------- HUD ----------
    _buildHud() {
      const { WIDTH, COLORS } = CFG();
      const barW = 360, barH = 26, m = 24, top = 30;

      this.add.rectangle(m, top, barW, barH, 0x000000, 0.55).setOrigin(0, 0).setStrokeStyle(2, COLORS.CREAM);
      this.add.rectangle(WIDTH - m, top, barW, barH, 0x000000, 0.55).setOrigin(1, 0).setStrokeStyle(2, COLORS.CREAM);

      this.pHpFill = this.add.rectangle(m + 2, top + 2, barW - 4, barH - 4, 0x5fa46f).setOrigin(0, 0);
      this.bHpFill = this.add.rectangle(WIDTH - m - 2, top + 2, barW - 4, barH - 4, 0x5fa46f).setOrigin(1, 0);
      this._barW = barW - 4;

      this.add.text(m, top + barH + 4, CFG().FIGHTERS.player.name, {
        fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0, 0);
      this.add.text(WIDTH - m, top + barH + 4, CFG().FIGHTERS.dilok.name, {
        fontFamily: 'Arial, sans-serif', fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(1, 0);

      // таймер
      this.timerText = this.add.text(WIDTH / 2, top + 2, String(this.timeLeft), {
        fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '40px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5, 0);

      // лічильник раундів (по дві позначки на сторону)
      this.pPips = this._makePips(m + 4, top + barH + 30, 1);
      this.bPips = this._makePips(WIDTH - m - 4, top + barH + 30, -1);
    }

    _makePips(x, y, side) {
      const arr = [];
      for (let i = 0; i < CFG().MATCH.ROUNDS_TO_WIN; i++) {
        const cx = x + side * i * 26;
        arr.push(this.add.circle(cx, y, 9, 0x33476e).setStrokeStyle(2, 0xffffff).setOrigin(0.5));
      }
      return arr;
    }

    _updateHud() {
      const max = CFG().FIGHT.MAX_HP;
      const pr = Phaser.Math.Clamp(this.player.hp / max, 0, 1);
      const br = Phaser.Math.Clamp(this.bot.hp / max, 0, 1);
      this.pHpFill.width = this._barW * pr;
      this.bHpFill.width = this._barW * br;
      this.pHpFill.setFillStyle(this._hpColor(pr));
      this.bHpFill.setFillStyle(this._hpColor(br));
      this.timerText.setText(String(Math.max(0, Math.ceil(this.timeLeft))));
    }

    _hpColor(r) {
      if (r > 0.5) return 0x5fa46f;
      if (r > 0.25) return 0xf0c453;
      return 0xc0392b;
    }

    _refreshPips() {
      const gold = 0xf0c453;
      this.pPips.forEach((p, i) => p.setFillStyle(i < this.wins.player ? gold : 0x33476e));
      this.bPips.forEach((p, i) => p.setFillStyle(i < this.wins.bot ? gold : 0x33476e));
    }

    // ---------- Потік раундів ----------
    _startRound() {
      this.phase = 'intro';
      this.timeLeft = CFG().MATCH.ROUND_TIME;
      this.player.reset(320, 1);
      this.bot.reset(640, -1);
      this._updateHud();
      this._refreshPips();

      const total = CFG().MATCH.ROUNDS_TO_WIN * 2 - 1;
      let label;
      if (this.round === 1) label = 'РАУНД 1';
      else if (this.round >= total) label = 'ФІНАЛЬНИЙ РАУНД';
      else label = 'РАУНД ' + this.round;

      this._showBanner(label, 1000, () => {
        this._showBanner('БІЙ!', 600, () => {
          this.phase = 'fight';
          this._tickAt = this.time.now;
        });
      });
    }

    _endRound(winner) {
      if (this.phase !== 'fight') return;
      this.phase = 'roundover';

      if (winner === 'player') this.wins.player++;
      else if (winner === 'bot') this.wins.bot++;
      this._refreshPips();

      let msg;
      if (winner === 'player') msg = 'РАУНД ЗА ТОБОЮ!';
      else if (winner === 'bot') msg = 'РАУНД ПРОГРАНО';
      else msg = 'НІЧИЯ';

      this._showBanner(msg, 1500, () => {
        if (this.wins.player >= CFG().MATCH.ROUNDS_TO_WIN) {
          this.phase = 'matchover';
          this.time.delayedCall(200, () => this.scene.start('Rescue'));
        } else if (this.wins.bot >= CFG().MATCH.ROUNDS_TO_WIN) {
          this.phase = 'matchover';
          this._showBanner('ПОРАЗКА', 1600, () => this.scene.start('Menu'));
        } else {
          if (winner !== 'draw') this.round++;
          this._startRound();
        }
      });
    }

    _showBanner(text, holdMs, onDone) {
      this.banner.setText(text).setAlpha(0).setScale(0.6);
      this.tweens.add({
        targets: this.banner, alpha: 1, scale: 1, duration: 220, ease: 'Back.easeOut',
        onComplete: () => {
          this.time.delayedCall(holdMs, () => {
            this.tweens.add({
              targets: this.banner, alpha: 0, scale: 0.8, duration: 200,
              onComplete: () => { if (onDone) onDone(); },
            });
          });
        },
      });
    }

    // ---------- Кадр ----------
    update(time) {
      if (!this.player || !this.bot) return;

      if (this.phase === 'fight') {
        // таймер
        if (time - this._tickAt >= 1000) {
          this._tickAt += 1000;
          this.timeLeft -= 1;
          if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this._updateHud();
            this._timeoutResult();
            return;
          }
        }

        this.player.update(time, this.playerInput.get(), this.bot);
        this.bot.update(time, this.botAI.decide(time, this.bot, this.player), this.player);

        this._updateHud();

        // нокаут?
        if (!this.player.alive || !this.bot.alive) {
          const winner = !this.bot.alive ? 'player' : 'bot';
          this._endRound(winner);
        }
      } else {
        // поза боєм: бійці нічого не натискають (але фізика/падіння триває)
        this.player.update(time, IDLE(), this.bot);
        this.bot.update(time, IDLE(), this.player);
        this._updateHud();
      }
    }

    _timeoutResult() {
      let winner;
      if (this.player.hp > this.bot.hp) winner = 'player';
      else if (this.bot.hp > this.player.hp) winner = 'bot';
      else winner = 'draw';
      this._endRound(winner);
    }

    _toggleTouchUI(show) {
      const el = document.getElementById('touch-controls');
      if (!el) return;
      const on = show && window.NOSYK.isTouchDevice();
      el.style.display = on ? 'flex' : 'none';
    }
  }

  window.NOSYK.FightScene = FightScene;
})();
