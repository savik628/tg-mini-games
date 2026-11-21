/**
 * Arcade Games Module (game-harvester-adapter)
 * 1. bounce_breaker
 * 2. gravity_jump
 */

window.BounceBreakerGame = class BounceBreakerGame extends window.BaseGame {
  constructor(container) {
    super(container, { app_id: 'bounce_breaker' });
    this.paddle = { x: 0, y: 0, w: 90, h: 12 };
    this.ball = { x: 0, y: 0, vx: 0, vy: 0, r: 7 };
    this.bricks = [];
    this.rows = 4;
    this.cols = 6;
    this.score = 0;
    this.lives = 3;
    this.state = 'playing';
    this.start();
  }

  start() {
    this.paddle.w = Math.max(70, this.width * 0.22);
    this.paddle.x = (this.width - this.paddle.w) / 2;
    this.paddle.y = this.height - 70;
    this.resetBall();
    this.initBricks();
  }

  resetBall() {
    this.ball.x = this.width / 2;
    this.ball.y = this.paddle.y - 15;
    const speed = 260;
    const angle = -Math.PI / 3 - Math.random() * (Math.PI / 3);
    this.ball.vx = speed * Math.cos(angle);
    this.ball.vy = -Math.abs(speed * Math.sin(angle));
  }

  initBricks() {
    this.bricks = [];
    const padX = 20;
    const topY = 70;
    const totalW = this.width - padX * 2;
    const gap = 8;
    const brickW = (totalW - (this.cols - 1) * gap) / this.cols;
    const brickH = 18;
    const colors = ['#f43f5e', '#f59e0b', '#38bdf8', '#10b981'];

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        this.bricks.push({
          x: padX + c * (brickW + gap),
          y: topY + r * (brickH + gap),
          w: brickW,
          h: brickH,
          color: colors[r % colors.length],
          alive: true
        });
      }
    }
  }

  handleInput(x, y) {
    this.paddle.x = Math.max(10, Math.min(this.width - this.paddle.w - 10, x - this.paddle.w / 2));
    this.haptic('light');
  }

  update(dt) {
    if (this.state !== 'playing') return;

    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;

    if (this.ball.x - this.ball.r < 10) {
      this.ball.x = 10 + this.ball.r;
      this.ball.vx = Math.abs(this.ball.vx);
      this.playSound(400, 0.05);
    } else if (this.ball.x + this.ball.r > this.width - 10) {
      this.ball.x = this.width - 10 - this.ball.r;
      this.ball.vx = -Math.abs(this.ball.vx);
      this.playSound(400, 0.05);
    }

    if (this.ball.y - this.ball.r < 40) {
      this.ball.y = 40 + this.ball.r;
      this.ball.vy = Math.abs(this.ball.vy);
      this.playSound(400, 0.05);
    }

    if (
      this.ball.y + this.ball.r >= this.paddle.y &&
      this.ball.y - this.ball.r <= this.paddle.y + this.paddle.h &&
      this.ball.x >= this.paddle.x &&
      this.ball.x <= this.paddle.x + this.paddle.w &&
      this.ball.vy > 0
    ) {
      this.ball.vy = -Math.abs(this.ball.vy);
      const hitOffset = (this.ball.x - (this.paddle.x + this.paddle.w / 2)) / (this.paddle.w / 2);
      this.ball.vx += hitOffset * 120;
      this.haptic('light');
      this.playSound(520, 0.08);
    }

    let aliveCount = 0;
    for (const b of this.bricks) {
      if (!b.alive) continue;
      aliveCount++;

      if (
        this.ball.x + this.ball.r > b.x &&
        this.ball.x - this.ball.r < b.x + b.w &&
        this.ball.y + this.ball.r > b.y &&
        this.ball.y - this.ball.r < b.y + b.h
      ) {
        b.alive = false;
        this.ball.vy = -this.ball.vy;
        this.score += 25;
        this.haptic('light');
        this.playSound(660, 0.06);
        break;
      }
    }

    if (aliveCount === 0) {
      this.score += 200;
      this.haptic('success');
      this.initBricks();
      this.resetBall();
    }

    if (this.ball.y - this.ball.r > this.height) {
      this.lives--;
      this.haptic('error');
      this.playSound(200, 0.2);
      if (this.lives <= 0) {
        this.state = 'gameover';
        this.gameOver(this.score);
      } else {
        this.resetBall();
      }
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 14px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Жизни: ${'❤️'.repeat(Math.max(0, this.lives))}`, 20, 30);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`Очки: ${this.score}`, this.width - 20, 30);

    for (const b of this.bricks) {
      if (!b.alive) continue;
      ctx.save();
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(b.x, b.y, b.w, b.h, 4) : ctx.rect(b.x, b.y, b.w, b.h);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h, 6) : ctx.rect(this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = '#f8fafc';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

window.GravityJumpGame = class GravityJumpGame extends window.BaseGame {
  constructor(container) {
    super(container, { app_id: 'gravity_jump' });
    this.player = { x: 0, y: 0, vx: 0, vy: 0, r: 12 };
    this.platforms = [];
    this.score = 0;
    this.gravity = 650;
    this.jumpForce = -420;
    this.state = 'playing';
    this.start();
  }

  start() {
    this.score = 0;
    this.state = 'playing';
    this.player.x = this.width / 2;
    this.player.y = this.height - 120;
    this.player.vx = 0;
    this.player.vy = this.jumpForce;

    this.platforms = [];
    const count = 9;
    const spacing = (this.height - 150) / count;
    this.platforms.push({ x: this.width / 2 - 35, y: this.height - 80, w: 70, h: 10 });

    for (let i = 1; i < count; i++) {
      this.platforms.push({
        x: Math.random() * (this.width - 80) + 10,
        y: this.height - 80 - i * spacing,
        w: 65,
        h: 10
      });
    }
  }

  handleInput(x, y) {
    const dir = x < this.width / 2 ? -1 : 1;
    this.player.vx = dir * 240;
    this.haptic('light');
  }

  update(dt) {
    if (this.state !== 'playing') return;

    this.player.vy += this.gravity * dt;
    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    if (this.player.x < 0) this.player.x = this.width;
    if (this.player.x > this.width) this.player.x = 0;

    if (this.player.vy > 0) {
      for (const p of this.platforms) {
        if (
          this.player.x + this.player.r > p.x &&
          this.player.x - this.player.r < p.x + p.w &&
          this.player.y + this.player.r >= p.y &&
          this.player.y + this.player.r <= p.y + p.h + 8
        ) {
          this.player.vy = this.jumpForce;
          this.haptic('light');
          this.playSound(480, 0.08);
          break;
        }
      }
    }

    if (this.player.y < this.height * 0.45) {
      const diff = this.height * 0.45 - this.player.y;
      this.player.y = this.height * 0.45;
      this.score += Math.floor(diff);

      for (const p of this.platforms) {
        p.y += diff;
        if (p.y > this.height) {
          p.y = 0;
          p.x = Math.random() * (this.width - 80) + 10;
        }
      }
    }

    if (this.player.y - this.player.r > this.height) {
      this.state = 'gameover';
      this.haptic('error');
      this.playSound(220, 0.25);
      this.gameOver(this.score);
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#38bdf8';
    ctx.font = '600 15px -apple-system, sans-serif';
    ctx.fillText(`Высота: ${this.score}`, this.width - 20, 32);

    for (const p of this.platforms) {
      ctx.save();
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(p.x, p.y, p.w, p.h, 4) : ctx.rect(p.x, p.y, p.w, p.h);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
};

if (window.GameRegistry) {
  window.GameRegistry.register('bounce_breaker', window.BounceBreakerGame);
  window.GameRegistry.register('gravity_jump', window.GravityJumpGame);
}
