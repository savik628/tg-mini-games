/**
 * Группа 1: Скорость и Реакция (6 игр)
 * 1. reaction_tap (Перехватчик)
 * 2. color_switch_tap (Цветовой импульс)
 * 3. catch_drop (Ловец кристаллов)
 * 4. laser_dodge (Лазерный рубеж)
 * 5. tempo_hit (Ритм-удар)
 * 6. fast_clicker (Тап-спринт)
 */

// 1. reaction_tap
window.ReactionTapGame = class extends window.BaseGame {
  constructor(c) {
    super(c, { app_id: "reaction_tap" });
    this.state = "wait"; // wait, ready, clicked
    this.startTime = 0;
    this.canvas.onclick = () => this.tap();
    this.startRound();
  }

  startRound() {
    this.state = "wait";
    this.draw("Ждите зелёного сигнала...", "#f59e0b");
    const delay = 1500 + Math.random() * 2500;
    this.setTimeout(() => {
      if (this.isPaused || this.isOver) return;
      this.state = "ready";
      this.startTime = performance.now();
      this.draw("ЖМИ СЕЙЧАС!", "#10b981");
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred("heavy");
      }
    }, delay);
  }

  tap() {
    if (this.isPaused || this.isOver) return;
    if (this.state === "wait") {
      this.draw("Слишком рано! Фальстарт.", "#ef4444");
      this.setTimeout(() => this.gameOver(0), 1000);
    } else if (this.state === "ready") {
      const ms = Math.round(performance.now() - this.startTime);
      const pts = Math.max(10, 1000 - ms);
      this.draw(`${ms} мс (+${pts} очков)`, "#38bdf8");
      if (window.snd) window.snd.playSuccess();
      this.setTimeout(() => this.gameOver(pts), 1200);
    }
  }

  draw(msg, color) {
    this.ctx.fillStyle = "#0b0f19";
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = color;
    this.ctx.font = "bold 20px -apple-system, sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.fillText(msg, this.width / 2, this.height / 2);
  }
};

// 2. color_switch_tap
window.ColorSwitchTapGame = class extends window.BaseGame {
  constructor(c) {
    super(c, { app_id: "color_switch_tap" });
    this.colors = ["#ef4444", "#38bdf8", "#10b981", "#f59e0b"];
    this.targetColor = this.colors[0];
    this.currentColor = this.colors[1];
    this.round = 0;
    this.canvas.onclick = () => this.tap();
    this.nextRound();
  }

  nextRound() {
    if (this.isOver) return;
    this.targetColor = this.colors[Math.floor(Math.random() * this.colors.length)];
    this.currentColor = this.colors[Math.floor(Math.random() * this.colors.length)];
    this.draw();

    this.timer = this.setTimeout(() => {
      // Авто-переключение цвета
      if (this.currentColor === this.targetColor) {
        // Пропустил верный цвет!
        this.gameOver(this.score);
      } else {
        this.nextRound();
      }
    }, 1200);
  }

  tap() {
    if (this.isPaused || this.isOver) return;
    clearTimeout(this.timer);
    if (this.currentColor === this.targetColor) {
      this.score += 100;
      if (window.snd) window.snd.playClick();
      this.nextRound();
    } else {
      this.gameOver(this.score);
    }
  }

  draw() {
    this.ctx.fillStyle = "#0b0f19";
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = "#94a3b8";
    this.ctx.font = "14px sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.fillText(`Счёт: ${this.score}`, this.width / 2, 40);
    this.ctx.fillText("Жми, когда цвет круга совпадёт с рамкой!", this.width / 2, 70);

    // Рамка (целевой цвет)
    this.ctx.strokeStyle = this.targetColor;
    this.ctx.lineWidth = 8;
    this.ctx.strokeRect(this.width / 2 - 80, this.height / 2 - 80, 160, 160);

    // Центр (текущий цвет)
    this.ctx.fillStyle = this.currentColor;
    this.ctx.beginPath();
    this.ctx.arc(this.width / 2, this.height / 2, 50, 0, Math.PI * 2);
    this.ctx.fill();
  }
};

// 3. catch_drop
window.CatchDropGame = class extends window.BaseGame {
  constructor(c) {
    super(c, { app_id: "catch_drop" });
    this.playerX = this.width / 2;
    this.drops = [];
    this.canvas.ontouchmove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.playerX = e.touches[0].clientX - rect.left;
    };
    this.canvas.onmousemove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.playerX = e.clientX - rect.left;
    };
    this.loop();
  }

  loop() {
    if (this.isOver) return;
    if (!this.isPaused) {
      if (Math.random() < 0.04) {
        this.drops.push({
          x: 20 + Math.random() * (this.width - 40),
          y: -10,
          speed: 3 + Math.random() * 3,
          isBomb: Math.random() < 0.25
        });
      }

      this.ctx.fillStyle = "#0b0f19";
      this.ctx.fillRect(0, 0, this.width, this.height);

      // Ловец
      this.ctx.fillStyle = "#38bdf8";
      this.ctx.beginPath();
      this.ctx.roundRect(this.playerX - 35, this.height - 40, 70, 14, 7);
      this.ctx.fill();

      // Капли
      for (let i = this.drops.length - 1; i >= 0; i--) {
        const d = this.drops[i];
        d.y += d.speed;

        this.ctx.fillStyle = d.isBomb ? "#ef4444" : "#10b981";
        this.ctx.beginPath();
        this.ctx.arc(d.x, d.y, 8, 0, Math.PI * 2);
        this.ctx.fill();

        // Попадание в ловца
        if (d.y >= this.height - 45 && d.y <= this.height - 25 && Math.abs(d.x - this.playerX) < 40) {
          if (d.isBomb) {
            this.gameOver(this.score);
            return;
          } else {
            this.score += 25;
            if (window.snd) window.snd.playClick();
            this.drops.splice(i, 1);
            continue;
          }
        }

        if (d.y > this.height) {
          if (!d.isBomb) {
            this.gameOver(this.score);
            return;
          }
          this.drops.splice(i, 1);
        }
      }

      this.ctx.fillStyle = "#fff";
      this.ctx.font = "bold 16px sans-serif";
      this.ctx.fillText(`Счёт: ${this.score}`, 20, 30);
    }
    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }
};

// 4. laser_dodge
window.LaserDodgeGame = class extends window.BaseGame {
  constructor(c) {
    super(c, { app_id: "laser_dodge" });
    this.barriers = [];
    this.dotY = this.height / 2;
    this.canvas.ontouchmove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.dotY = e.touches[0].clientY - rect.top;
    };
    this.canvas.onmousemove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.dotY = e.clientY - rect.top;
    };
    this.loop();
  }

  loop() {
    if (this.isOver) return;
    if (!this.isPaused) {
      if (Math.random() < 0.02) {
        const gapY = 50 + Math.random() * (this.height - 150);
        this.barriers.push({ x: this.width, gapY: gapY, gapH: 80, speed: 3.5 });
      }

      this.ctx.fillStyle = "#0b0f19";
      this.ctx.fillRect(0, 0, this.width, this.height);

      // Игрок
      this.ctx.fillStyle = "#38bdf8";
      this.ctx.beginPath();
      this.ctx.arc(60, this.dotY, 10, 0, Math.PI * 2);
      this.ctx.fill();

      for (let i = this.barriers.length - 1; i >= 0; i--) {
        const b = this.barriers[i];
        b.x -= b.speed;

        this.ctx.fillStyle = "#ef4444";
        // Верхний луч
        this.ctx.fillRect(b.x, 0, 12, b.gapY);
        // Нижний луч
        this.ctx.fillRect(b.x, b.gapY + b.gapH, 12, this.height - (b.gapY + b.gapH));

        // Коллизия
        if (b.x <= 70 && b.x >= 48) {
          if (this.dotY - 8 < b.gapY || this.dotY + 8 > b.gapY + b.gapH) {
            this.gameOver(this.score);
            return;
          }
        }

        if (b.x < 48 && !b.passed) {
          b.passed = true;
          this.score += 50;
        }

        if (b.x < -20) this.barriers.splice(i, 1);
      }

      this.ctx.fillStyle = "#fff";
      this.ctx.font = "bold 16px sans-serif";
      this.ctx.fillText(`Счёт: ${this.score}`, 20, 30);
    }
    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }
};

// 5. tempo_hit
window.TempoHitGame = class extends window.BaseGame {
  constructor(c) {
    super(c, { app_id: "tempo_hit" });
    this.markerX = 0;
    this.speed = 5;
    this.dir = 1;
    this.canvas.onclick = () => this.hit();
    this.loop();
  }

  hit() {
    if (this.isPaused || this.isOver) return;
    const center = this.width / 2;
    const diff = Math.abs(this.markerX - center);
    if (diff < 20) {
      this.score += 150;
      if (window.snd) window.snd.playSuccess();
      this.speed = Math.min(12, this.speed + 0.8);
    } else if (diff < 45) {
      this.score += 50;
      if (window.snd) window.snd.playClick();
    } else {
      this.gameOver(this.score);
    }
  }

  loop() {
    if (this.isOver) return;
    if (!this.isPaused) {
      this.markerX += this.speed * this.dir;
      if (this.markerX >= this.width - 20) this.dir = -1;
      if (this.markerX <= 20) this.dir = 1;

      this.ctx.fillStyle = "#0b0f19";
      this.ctx.fillRect(0, 0, this.width, this.height);

      // Зона попадания
      this.ctx.fillStyle = "rgba(56, 189, 248, 0.2)";
      this.ctx.fillRect(this.width / 2 - 45, this.height / 2 - 40, 90, 80);
      this.ctx.fillStyle = "#10b981";
      this.ctx.fillRect(this.width / 2 - 15, this.height / 2 - 40, 30, 80);

      // Бегунок
      this.ctx.fillStyle = "#f59e0b";
      this.ctx.fillRect(this.markerX - 4, this.height / 2 - 50, 8, 100);

      this.ctx.fillStyle = "#fff";
      this.ctx.font = "bold 16px sans-serif";
      this.ctx.fillText(`Счёт: ${this.score}`, 20, 30);
      this.ctx.font = "13px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.fillText("Жми в зеленой зоне!", this.width / 2, this.height / 2 + 80);
      this.ctx.textAlign = "left";
    }
    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }
};

// 6. fast_clicker
window.FastClickerGame = class extends window.BaseGame {
  constructor(c) {
    super(c, { app_id: "fast_clicker" });
    this.timeLeft = 15.0;
    this.score = 0;
    this.canvas.onclick = () => this.click();
    this.lastTime = performance.now();
    this.loop();
  }

  click() {
    if (this.isPaused || this.isOver) return;
    this.score += 1;
    if (window.snd) window.snd.playClick();
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred("light");
    }
  }

  loop() {
    if (this.isOver) return;
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    if (!this.isPaused) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.gameOver(this.score);
        return;
      }

      this.ctx.fillStyle = "#0b0f19";
      this.ctx.fillRect(0, 0, this.width, this.height);

      this.ctx.fillStyle = "#38bdf8";
      this.ctx.beginPath();
      this.ctx.arc(this.width / 2, this.height / 2, 75, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = "#0b0f19";
      this.ctx.font = "bold 28px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.fillText("ТАП!", this.width / 2, this.height / 2 + 10);

      this.ctx.fillStyle = "#fff";
      this.ctx.font = "bold 20px sans-serif";
      this.ctx.fillText(`Клики: ${this.score}`, this.width / 2, 60);
      this.ctx.fillStyle = this.timeLeft < 4 ? "#ef4444" : "#f59e0b";
      this.ctx.fillText(`Время: ${this.timeLeft.toFixed(1)}c`, this.width / 2, 95);
      this.ctx.textAlign = "left";
    }
    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }
};
