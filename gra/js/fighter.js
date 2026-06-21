/* ============================================================
   Боєць. Один клас і для гравця, і для бота.
   Малюється заглушкою-прямокутником із простим обличчям.
   Коли зʼявляться спрайти — підставляться замість текстури.
   ============================================================ */
window.NOSYK = window.NOSYK || {};

(function () {
  const C = () => window.NOSYK.CONFIG;
  const FX = () => window.NOSYK.Effects;

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

      // Тіло бійця (заглушка-текстура згенерована у BootScene як 'px_<key>')
      this.sprite = scene.physics.add.sprite(x, groundY - this.standH / 2, 'px_' + cfg.key);
      this.sprite.setDepth(10);
      this.sprite.body.setSize(cfg.bodyW, this.standH);
      this.sprite.setCollideWorldBounds(true);

      // Кінцівка для удару (зʼявляється під час активних кадрів)
      this.limb = scene.add.rectangle(x, 0, 50, 14, cfg.trim).setDepth(11).setVisible(false);
      // Щит при блоці
      this.shield = scene.add
        .rectangle(x, 0, 16, this.standH * 0.8, C().COLORS.CREAM, 0.85)
        .setDepth(12)
        .setVisible(false);

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
    }

    get grounded() {
      return this.sprite.body.blocked.down || this.sprite.body.touching.down;
    }

    faceTowards(opponent) {
      const dx = opponent.sprite.x - this.sprite.x;
      if (Math.abs(dx) > 2) this.facing = dx > 0 ? 1 : -1;
    }

    /** Головне оновлення кожен кадр. controls — обʼєкт станів кнопок. */
    update(time, controls, opponent) {
      const F = C().FIGHT;
      const body = this.sprite.body;

      // Прапор напрямку для заглушки-обличчя
      this.sprite.setFlipX(this.facing === -1);

      if (!this.alive) {
        body.setVelocityX(0);
        this.limb.setVisible(false);
        this.shield.setVisible(false);
        return;
      }

      // Оглушення після влучання
      if (time < this.hitstunUntil) {
        this.state = 'hit';
        this.limb.setVisible(false);
        this.shield.setVisible(false);
        this._setHeight(false);
        return;
      }

      // Виконання атаки (зайнятий)
      if (time < this.busyUntil) {
        body.setVelocityX(0);
        this._runAttack(time, opponent);
        return;
      } else if (this.attackKind) {
        // атака завершилась
        this.attackKind = null;
        this.limb.setVisible(false);
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
        this._setHeight(false);
        this._showShield();
        return;
      }
      this.isBlocking = false;
      this.shield.setVisible(false);

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
        this._setHeight(true);
        return;
      }
      this.isCrouching = false;
      this._setHeight(false);

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
      this._setHeight(false);
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
      // висота кінцівки: рука — вище, нога — нижче
      const yOff = kind === 'punch' ? -this.standH * 0.18 : this.standH * 0.16;
      const len = kind === 'punch' ? 46 : 64;

      this.limb.setSize(len, kind === 'punch' ? 14 : 18);
      this.limb.x = this.sprite.x + this.facing * (this.cfg.bodyW / 2 + len / 2);
      this.limb.y = this.sprite.y + yOff;
      this.limb.setVisible(true);

      // момент влучання
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

      // має дивитись на суперника
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

      // Блок: дивиться у бік атакувальника?
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
        // спалах тіла
        this.sprite.setTintFill(0xffffff);
        scene.time.delayedCall(70, () => this.sprite.clearTint());
        scene.cameras.main.shake(90, 0.004);
      }

      if (this.hp <= 0) this._knockout();
    }

    _knockout() {
      this.alive = false;
      this.state = 'ko';
      this.isBlocking = false;
      this.isCrouching = false;
      this.limb.setVisible(false);
      this.shield.setVisible(false);
      // падає
      this.sprite.setAngle(this.facing === 1 ? -88 : 88);
      this.sprite.setTint(0x888888);
    }

    _setHeight(crouch) {
      // Присід — лише ВІЗУАЛЬНЕ стискання по висоті (фізичне тіло не чіпаємо,
      // щоб не конфліктувати з підлогою). Ухилення від удару рукою працює
      // через прапор isCrouching у _tryHit.
      const sy = crouch ? 0.62 : 1;
      if (this.sprite.scaleY !== sy) this.sprite.scaleY = sy;
    }

    _showShield() {
      this.shield.x = this.sprite.x + this.facing * (this.cfg.bodyW / 2 + 6);
      this.shield.y = this.sprite.y;
      this.shield.setVisible(true);
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
      this._curH = null;
      this.sprite.setAngle(0);
      this.sprite.clearTint();
      this.sprite.setDisplaySize(this.cfg.bodyW, this.standH);
      this.sprite.body.setSize(this.cfg.bodyW, this.standH);
      this.sprite.setPosition(x, C().GROUND_Y - this.standH / 2);
      this.sprite.body.setVelocity(0, 0);
      this.limb.setVisible(false);
      this.shield.setVisible(false);
    }
  }

  window.NOSYK.Fighter = Fighter;
})();
