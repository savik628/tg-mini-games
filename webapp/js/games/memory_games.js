/**
 * Memory Games Collection (RULES.md, UI-KIT.md, GAME-TEMPLATE.md compliant)
 * Game: matrix_grid (Неоновая сетка памяти)
 */

window.MatrixGridGame = class MatrixGridGame extends window.BaseGame {
  constructor(container) {
    super(container, { app_id: 'matrix_grid' });
    this.gridSize = 3;
    this.targetCells = [];
    this.selectedCells = [];
    this.state = 'showing';
    this.showTimer = 1.5;
    this.level = 1;
    this.score = 0;
    this.startRound();
  }

  startRound() {
    this.gridSize = Math.min(3 + Math.floor((this.level - 1) / 3), 5);
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

    if (x < startX || x > startX + size || y < startY || y > startY + size) return;

    const col = Math.floor((x - startX) / cellSize);
    const row = Math.floor((y - startY) / cellSize);
    const index = row * this.gridSize + col;

    if (this.selectedCells.includes(index)) return;

    this.selectedCells.push(index);
    this.haptic('light');

    if (this.targetCells.includes(index)) {
      this.playSound(587.33, 0.08);
      if (this.selectedCells.length === this.targetCells.length) {
        this.score += this.level * 100;
        this.level++;
        this.state = 'success';
        this.haptic('success');
        this.playSound(880, 0.2);
        setTimeout(() => this.startRound(), 800);
      }
    } else {
      this.state = 'fail';
      this.haptic('error');
      this.playSound(220, 0.3);
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
        this.playSound(523.25, 0.08);
      }
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 15px -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Уровень: ${this.level}`, 24, 34);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`Очки: ${this.score}`, this.width - 24, 34);

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

        let cellColor = '#1e293b';
        let borderColor = 'rgba(255, 255, 255, 0.08)';
        let isGlow = false;

        if (this.state === 'showing' && this.targetCells.includes(index)) {
          cellColor = '#38bdf8';
          borderColor = '#7dd3fc';
          isGlow = true;
        } else if (this.selectedCells.includes(index)) {
          if (this.targetCells.includes(index)) {
            cellColor = '#10b981';
            borderColor = '#34d399';
            isGlow = true;
          } else {
            cellColor = '#f43f5e';
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
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(cellX, cellY, cellSize, cellSize, 10) : ctx.rect(cellX, cellY, cellSize, cellSize);
        ctx.fill();

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    }
  }
};

if (window.GameRegistry) {
  window.GameRegistry.register('matrix_grid', window.MatrixGridGame);
}
