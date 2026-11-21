/**
 * Memory Games Collection (RULES.md, UI-KIT.md, GAME-TEMPLATE.md compliant)
 * Game: matrix_grid (Неоновая сетка памяти)
 */

class MatrixGridGame extends BaseGame {
  constructor(canvas) {
    super(canvas);
    this.gridSize = 3; // 3x3
    this.targetCells = [];
    this.selectedCells = [];
    this.state = 'showing'; // 'showing', 'input', 'success', 'fail'
    this.showTimer = 1.5;
    this.level = 1;
    this.score = 0;
  }

  init() {
    this.startRound();
  }

  startRound() {
    this.gridSize = Math.min(3 + Math.floor((this.level - 1) / 3), 5); // 3x3, 4x4, up to 5x5
    const totalCells = this.gridSize * this.gridSize;
    const highlightCount = Math.min(3 + this.level, Math.floor(totalCells * 0.45));
    
    this.targetCells = [];
    this.selectedCells = [];
    
    const indices = Array.from({ length: totalCells }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    this.targetCells = indices.slice(0, highlightCount);
    
    this.state = 'showing';
    this.showTimer = 1.4;
    this.playSound(440, 0.1);
  }

  handleInput(x, y) {
    if (this.state !== 'input') return;

    const size = Math.min(this.width, this.height) * 0.8;
    const startX = (this.width - size) / 2;
    const startY = (this.height - size) / 2;
    const cellSize = size / this.gridSize;
    const gap = 8;

    if (x < startX || x > startX + size || y < startY || y > startY + size) return;

    const col = Math.floor((x - startX) / cellSize);
    const row = Math.floor((y - startY) / cellSize);
    const index = row * this.gridSize + col;

    if (this.selectedCells.includes(index)) return;

    this.selectedCells.push(index);
    this.haptic('light');

    if (this.targetCells.includes(index)) {
      this.playSound(587.33, 0.08); // D5 success note
      if (this.selectedCells.length === this.targetCells.length) {
        // Level clear!
        this.score += this.level * 100;
        this.level++;
        this.state = 'success';
        this.haptic('success');
        this.playSound(880, 0.2);
        setTimeout(() => this.startRound(), 800);
      }
    } else {
      // Mistake!
      this.state = 'fail';
      this.haptic('error');
      this.playSound(220, 0.3); // A3 low error buzz
      setTimeout(() => {
        this.gameOver(this.score);
      }, 900);
    }
  }

  update(dt) {
    if (this.state === 'showing') {
      this.showTimer -= dt;
      if (this.showTimer <= 0) {
        this.state = 'input';
        this.playSound(523.25, 0.08); // C5 start sound
      }
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Top HUD
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 15px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Уровень: ${this.level}`, 24, 34);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`Очки: ${this.score}`, this.width - 24, 34);

    // Prompt text
    ctx.textAlign = 'center';
    ctx.font = '700 16px -apple-system, sans-serif';
    if (this.state === 'showing') {
      ctx.fillStyle = '#f59e0b';
      ctx.fillText('⚡️ Запоминай неоновые ячейки!', this.width / 2, 70);
    } else if (this.state === 'input') {
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`Нажми ячейки (${this.selectedCells.length}/${this.targetCells.length})`, this.width / 2, 70);
    } else if (this.state === 'success') {
      ctx.fillStyle = '#10b981';
      ctx.fillText('✨ Отлично! Следующий уровень...', this.width / 2, 70);
    } else if (this.state === 'fail') {
      ctx.fillStyle = '#f43f5e';
      ctx.fillText('❌ Ошибка! Раунд завершён', this.width / 2, 70);
    }

    // Grid rendering
    const size = Math.min(this.width, this.height) * 0.76;
    const startX = (this.width - size) / 2;
    const startY = (this.height - size) / 2 + 20;
    const gap = 8;
    const cellSize = (size - (this.gridSize - 1) * gap) / this.gridSize;

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const index = row * this.gridSize + col;
        const cellX = startX + col * (cellSize + gap);
        const cellY = startY + row * (cellSize + gap);

        let cellColor = '#1e293b'; // Default card surface
        let borderColor = 'rgba(255, 255, 255, 0.08)';
        let isGlow = false;

        if (this.state === 'showing' && this.targetCells.includes(index)) {
          cellColor = '#38bdf8';
          borderColor = '#7dd3fc';
          isGlow = true;
        } else if (this.selectedCells.includes(index)) {
          if (this.targetCells.includes(index)) {
            cellColor = '#10b981'; // Green correct
            borderColor = '#34d399';
            isGlow = true;
          } else {
            cellColor = '#f43f5e'; // Red wrong
            borderColor = '#fb7185';
            isGlow = true;
          }
        }

        ctx.save();
        if (isGlow) {
          ctx.shadowColor = cellColor;
          ctx.shadowBlur = 12;
        }
        ctx.fillStyle = cellColor;
        this.drawRoundedRect(ctx, cellX, cellY, cellSize, cellSize, 10);
        ctx.fill();

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

// Register in Game Registry
if (window.GameRegistry) {
  window.GameRegistry.register('matrix_grid', MatrixGridGame);
}
