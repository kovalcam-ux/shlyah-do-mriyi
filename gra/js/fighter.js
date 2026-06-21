/* ============================================================
   Боєць. Один клас і для гравця, і для бота.

   Фігура — намальована кодом людиноподібна постать (голова, тулуб,
   дві руки, дві ноги). При ударі рукою передня рука витягується
   вперед, при ударі ногою передня нога піднімається — щоб дію було
   видно. Це все ще ТИМЧАСОВІ фігури; справжній піксель-арт — окремий
   етап (готовність до спрайтів лишається в config.js).

   Фізика рахується невидимим прямокутним тілом (this.sprite), а
   постать (this.view) щокадру повторює його позицію.
   ============================================================ */
window.NOSYK = window.NOSYK || {};

(function () {
  const C = () => window.NOSYK.CONFIG;
  const FX = () => window.NOSYK.Effects;

  function darken(color, amt) {
    const c = Phaser.Display.Color.IntegerToColor(color);
    return Phaser.Display.Color.GetColor(
      Math.max(0, c.red - amt), Math.max(0, c.green - amt), Math.max(0, c.blue - amt)
    );
  }

  class Fighter {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} x       стартова позиція X
     * @param {number} facing  +1 (дивиться праворуч) або -1
     * @param {object} cfg      запис із CONFIG.FIGHTERS
     */
    constructor(scene, x, facing, cfg) {
      this.scene = scene;
      this.cfg = cfg;
      const F = C().FIGHT;

      this.maxHp = F.MAX_HP;
      this.hp = this.maxHp;
      this.facing = facing;
      this.alive = true;

      const groundY = C().GROUND_Y;
      this.standH = cfg.bodyH;

      // Невидиме фізичне тіло (заглушка-текстура 'px_<key>' із BootScene)
      this.sprite = scene.physics.add.sprite(x, groundY - this.standH / 2, 'px_' + cfg.key);
      this.sprite.setVisible(false);
      this.sprite.body.setSize(cfg.bodyW, this.standH);
      this.sprite.setCollideWorldBounds(true);

      // Намальована постать
      this.view = this._buildView(scene);

      // Стан
      this.state = 'idle';
      this.isBlocking = false;
      this.isCrouching = false;
      this.busyUntil = 0;        // зайнятий атакою до цього часу (мс)
      this.hitstunUntil = 0;     // оглушення до цього часу
      this.punchReadyAt = 0;
      this.kickReadyAt = 0;
      this.attackKind = null;
      this.attackHitAt = 0;
      this.attackDidHit = false;

      this._syncView();
    }

    // ---------- Побудова постаті ----------
    _buildView(scene) {
      const cfg = this.cfg, w = cfg.bodyW, h = cfg.bodyH;
      const col = cfg.color, trim = cfg.trim, dark = darken(col, 40);

      const view = scene.add.container(this.sprite.x, this.sprite.y).setDepth(10);

      const shoulderY = -h * 0.20, hipY = h * 0.10;
      const sxF = w * 0.12, sxB = -w * 0.12;
      const headY = -h * 0.34, headR = w * 0.30;
      const armW = w * 0.17, armLen = h * 0.30;
      const legW = w * 0.21, legLen = h * 0.36;
      this._geom = { shoulderY, hipY, sxF, sxB, headY, headR, armW, armLen, legW, legLen };

      // задні кінцівки (темніші — для глибини)
      this.pArmBack = this._bone(scene, sxB, shoulderY, armW, armLen, dark);
      this.pLegBack = this._bone(scene, sxB, hipY, legW, legLen, dark);
      // тулуб
      this.pTorso = scene.add.rectangle(0, -h * 0.05, w * 0.5, h * 0.42, col)
        .setStrokeStyle(3, trim).setOrigin(0.5);
      // передні кінцівки
      this.pLegFront = this._bone(scene, sxF, hipY, legW, legLen, col);
      this.pArmFront = this._bone(scene, sxF, shoulderY, armW, armLen, col);
      // голова + око (дивиться вперед, +x)
      this.pHead = scene.add.circle(0, headY, headR, col).setStrokeStyle(3, trim);
      this.pEye = scene.add.circle(headR * 0.4, headY - headR * 0.08, headR * 0.2, 0x0b1322);

      view.add([this.pArmBack, this.pLegBack, this.pTorso, this.pLegFront, this.pArmFront, this.pHead, this.pEye]);

      // Прикметні деталі персонажа
      if (cfg.key === 'dilok') {
        // капелюх (читається як «базарний ділок»)
        const hatY = headY - headR * 0.85;
        this.pHatBrim = scene.add.rectangle(0, hatY, headR * 2.6, headR * 0.5, 0x14100c);
        this.pHatTop = scene.add.rectangle(headR * 0.1, hatY - headR * 0.5, headR * 1.5, headR * 0.7, 0x14100c);
        this.pHatBand = scene.add.rectangle(headR * 0.1, hatY - headR * 0.18, headR * 1.5, headR * 0.18, 0xc0392b);
        // брова — лиходійський погляд
        this.pBrow = scene.add.rectangle(headR * 0.42, headY - headR * 0.4, headR * 0.7, headR * 0.16, 0x14100c)
          .setAngle(18);
        // торба з грошима
        this.pBag = scene.add.circle(-w * 0.46, hipY + legLen * 0.25, w * 0.22, 0x9c7b34).setStrokeStyle(3, 0x5c4718);
        this.pBagS = window.NOSYK.addText(scene, -w * 0.46, hipY + legLen * 0.25, '$', {
          fontFamily: 'Arial Black, Arial, sans-serif', fontSize: Math.round(w * 0.3) + 'px',
          color: '#f0c453', fontStyle: 'bold',
        }).setOrigin(0.5);
        view.add([this.pBag, this.pBagS, this.pHatBrim, this.pHatTop, this.pHatBand, this.pBrow]);
      } else {
        // герой Носик — доброзичливий: світла хустинка-комір + усмішка
        this.pScarf = scene.add.rectangle(0, shoulderY + h * 0.04, w * 0.52, h * 0.06, trim);
        // усмішка: дуга нижньої частини кола (без заливки), кінці догори
        this.pSmile = scene.add.arc(headR * 0.25, headY + headR * 0.18, headR * 0.32, 20, 160, false, 0x000000, 0)
          .setStrokeStyle(3, 0x0b1322).setClosePath(false);
        view.add([this.pScarf, this.pSmile]);
      }

      // спалах при влучанні (накриває постать)
      this.flash = scene.add.rectangle(0, -h * 0.05, w * 1.1, h, 0xffffff, 0).setVisible(false);
      view.add(this.flash);

      return view;
    }

    /** «Кістка» — прямокутник із віссю обертання біля верхнього кінця (суглоб). */
    _bone(scene, x, y, w, len, color) {
      return scene.add.rectangle(x, y, w, len, color).setOrigin(0.5, 0.12);
    }

    get grounded() {
      return this.sprite.body.blocked.down || this.sprite.body.touching.down;
    }

    faceTowards(opponent) {
      const dx = opponent.sprite.x - this.sprite.x;
      if (Math.abs(dx) > 2) this.facing = dx > 0 ? 1 : -1;
    }

    /** Головне оновлення кожен кадр. */
    update(time, controls, opponent) {
      this._think(time, controls, opponent);
      this._syncView();
    }

    /** Логіка/фізика (може робити return будь-де). */
    _think(time, controls, opponent) {
      const F = C().FIGHT;
      const body = this.sprite.body;

      if (!this.alive) { body.setVelocityX(0); return; }

      // Оглушення після влучання
      if (time < this.hitstunUntil) { this.state = 'hit'; return; }

      // Виконання атаки (зайнятий)
      if (time < this.busyUntil) {
        body.setVelocityX(0);
        this._runAttack(time, opponent);
        return;
      } else if (this.attackKind) {
        this.attackKind = null;
        this.state = 'idle';
      }

      // Дивимось на суперника, коли стоїмо на землі
      if (this.grounded) this.faceTowards(opponent);

      // --- Блок (найвищий пріоритет) ---
      if (controls.block && this.grounded) {
        this.isBlocking = true;
        this.isCrouching = false;
        this.state = 'block';
        body.setVelocityX(0);
        return;
      }
      this.isBlocking = false;

      // --- Удари (тільки на землі) ---
      if (this.grounded && controls.punch && time >= this.punchReadyAt) {
        this._startAttack('punch', time);
        return;
      }
      if (this.grounded && controls.kick && time >= this.kickReadyAt) {
        this._startAttack('kick', time);
        return;
      }

      // --- Присід ---
      if (controls.down && this.grounded) {
        this.isCrouching = true;
        this.state = 'crouch';
        body.setVelocityX(0);
        return;
      }
      this.isCrouching = false;

      // --- Рух ---
      let vx = 0;
      if (controls.left) vx -= F.MOVE_SPEED;
      if (controls.right) vx += F.MOVE_SPEED;
      body.setVelocityX(vx);

      // --- Стрибок ---
      if (controls.up && this.grounded) {
        body.setVelocityY(F.JUMP_VELOCITY);
        this.state = 'jump';
      } else if (!this.grounded) {
        this.state = 'jump';
      } else {
        this.state = vx !== 0 ? 'walk' : 'idle';
      }
    }

    _startAttack(kind, time) {
      const F = C().FIGHT;
      this.attackKind = kind;
      this.attackDidHit = false;
      this.isCrouching = false;
      this.sprite.body.setVelocityX(0);

      if (kind === 'punch') {
        this.busyUntil = time + 230;
        this.attackHitAt = time + 80;
        this.punchReadyAt = time + F.PUNCH_COOLDOWN;
        this.state = 'punch';
      } else {
        this.busyUntil = time + 320;
        this.attackHitAt = time + 130;
        this.kickReadyAt = time + F.KICK_COOLDOWN;
        this.state = 'kick';
      }
    }

    _runAttack(time, opponent) {
      const F = C().FIGHT;
      const kind = this.attackKind;
      const reach = kind === 'punch' ? F.PUNCH_REACH : F.KICK_REACH;
      const yOff = kind === 'punch' ? -this.standH * 0.18 : this.standH * 0.10;
      if (!this.attackDidHit && time >= this.attackHitAt) {
        this.attackDidHit = true;
        this._tryHit(opponent, kind, reach, yOff);
      }
    }

    _tryHit(opponent, kind, reach, yOff) {
      if (!opponent.alive) return;
      const F = C().FIGHT;
      const dx = opponent.sprite.x - this.sprite.x;
      const dist = Math.abs(dx);
      const dy = Math.abs(opponent.sprite.y - this.sprite.y);

      if (Math.sign(dx) !== this.facing) return;
      if (dist > reach + opponent.cfg.bodyW / 2) return;
      if (dy > F.HIT_VERTICAL) return;
      // присід ухиляється від удару рукою (рука летить вище)
      if (opponent.isCrouching && kind === 'punch') return;

      const dmg = kind === 'punch' ? F.PUNCH_DMG : F.KICK_DMG;
      const contactX = this.sprite.x + this.facing * (this.cfg.bodyW / 2 + reach * 0.4);
      const contactY = this.sprite.y + yOff;
      opponent.receiveHit(dmg, this.facing, contactX, contactY);
    }

    receiveHit(dmg, dir, cx, cy) {
      if (!this.alive) return;
      const F = C().FIGHT;
      const scene = this.scene;

      const facingAttacker = this.facing === -dir;
      if (this.isBlocking && facingAttacker) {
        const reduced = Math.round(dmg * (1 - F.BLOCK_REDUCTION));
        this.hp = Math.max(0, this.hp - reduced);
        FX().blockSpark(scene, cx, cy);
        this.sprite.body.setVelocityX(dir * 50);
      } else {
        this.hp = Math.max(0, this.hp - dmg);
        this.hitstunUntil = scene.time.now + F.HITSTUN;
        this.sprite.body.setVelocityX(dir * F.KNOCKBACK);
        FX().hitBurst(scene, cx, cy, dir);
        // спалах постаті
        this.flash.setVisible(true).setAlpha(0.75);
        scene.tweens.add({
          targets: this.flash, alpha: 0, duration: 130,
          onComplete: () => this.flash.setVisible(false),
        });
        scene.cameras.main.shake(90, 0.004);
      }

      if (this.hp <= 0) this._knockout();
    }

    _knockout() {
      this.alive = false;
      this.state = 'ko';
      this.isBlocking = false;
      this.isCrouching = false;
      this.view.setAlpha(0.75);
    }

    // ---------- Синхронізація постаті з фізикою + пози ----------
    _syncView() {
      const v = this.view;
      v.x = this.sprite.x;
      v.y = this.sprite.y;
      v.scaleX = this.facing;
      v.scaleY = (this.isCrouching && this.alive) ? 0.66 : 1;

      if (!this.alive) {
        v.angle = this.facing === 1 ? -82 : 82; // повалений
        return;
      }
      v.angle = 0;
      this._pose();
    }

    /** Кути кінцівок залежно від стану (0° = вниз; «вперед» = бік погляду). */
    _pose() {
      let armF = 10, armB = -12, legF = 8, legB = -8;
      switch (this.state) {
        case 'walk': legF = 22; legB = -22; armF = -16; armB = 16; break;
        case 'jump': legF = 34; legB = 22; armF = -28; armB = -28; break;
        case 'crouch': legF = 28; legB = -28; armF = 22; armB = -22; break;
        case 'punch': armF = -92; armB = -8; legF = 6; legB = -10; break;
        case 'kick': legF = -74; armF = 24; armB = -24; legB = -6; break;
        case 'block': armF = -58; armB = -30; legF = 10; legB = -10; break;
        case 'hit': armF = 34; armB = 30; legF = -6; legB = 8; break;
        default: break; // idle
      }
      this.pArmFront.setAngle(armF);
      this.pArmBack.setAngle(armB);
      this.pLegFront.setAngle(legF);
      this.pLegBack.setAngle(legB);
    }

    reset(x, facing) {
      this.hp = this.maxHp;
      this.alive = true;
      this.facing = facing;
      this.state = 'idle';
      this.isBlocking = false;
      this.isCrouching = false;
      this.busyUntil = 0;
      this.hitstunUntil = 0;
      this.attackKind = null;
      this.sprite.clearTint();
      this.sprite.setPosition(x, C().GROUND_Y - this.standH / 2);
      this.sprite.body.setVelocity(0, 0);
      this.view.setAlpha(1).setAngle(0);
      this.flash.setVisible(false).setAlpha(0);
      this._syncView();
    }
  }

  window.NOSYK.Fighter = Fighter;
})();
