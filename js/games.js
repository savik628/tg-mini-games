// Полноценные Canvas-игры на внимание и реакцию платформы «Мини игры»

// 1. Matrix Grid: Игра на запоминание узора плиток
class MatrixGridGame {
  constructor(container, onComplete) {
    this.container = container;
    this.onComplete = onComplete;
    this.size = 3; // 3x3
    this.activeTiles = [];
    this.userTiles = [];
    this.score = 0;
    this.isShowing = false;
    this.render();
    this.startRound();
  }

  render() {
    this.container.innerHTML = `
      <div style="font-weight: 700; margin-bottom: 12px; font-size: 1.1rem;">
        Раунд: <span id="matrixScore" style="color: var(--primary);">1</span>
      </div>
      <div id="gridBoard" style="
        display: grid; 
        grid-template-columns: repeat(${this.size}, 1fr); 
        gap: 10px; 
        max-width: 280px; 
        margin: 0 auto;
      "></div>
      <div id="matrixHint" style="margin-top: 16px; font-size: 0.85rem; color: var(--text-muted);">
        Запоминайте подсвеченные плитки...
      </div>
    `;
  }

  startRound() {
    const totalTiles = this.size * this.size;
    const highlightCount = Math.min(3 + this.score, 7);
    this.activeTiles = [];
    this.userTiles = [];
    this.isShowing = true;

    while (this.activeTiles.length < highlightCount) {
      const idx = Math.floor(Math.random() * totalTiles);
      if (!this.activeTiles.includes(idx)) this.activeTiles.push(idx);
    }

    const board = document.getElementById("gridBoard");
    board.innerHTML = "";

    for (let i = 0; i < totalTiles; i++) {
      const tile = document.createElement("div");
      tile.id = `tile_${i}`;
      tile.style.cssText = `
        aspect-ratio: 1;
        background: var(--card-border);
        border-radius: 10px;
        cursor: pointer;
        transition: background 0.2s, transform 0.1s;
      `;
      tile.onclick = () => this.handleTileClick(i);
      board.appendChild(tile);
    }

    // Подсветка плиток
    setTimeout(() => {
      this.activeTiles.forEach(idx => {
        const el = document.getElementById(`tile_${idx}`);
        if (el) el.style.background = "var(--primary)";
      });
      window.snd.playBeep(440, 0.1);

      // Скрытие плиток через 1.2 секунды
      setTimeout(() => {
        this.activeTiles.forEach(idx => {
          const el = document.getElementById(`tile_${idx}`);
          if (el) el.style.background = "var(--card-border)";
        });
        this.isShowing = false;
        const hint = document.getElementById("matrixHint");
        if (hint) hint.textContent = "Повторите узор!";
      }, 1200);
    }, 400);
  }

  handleTileClick(idx) {
    if (this.isShowing) return;
    if (this.userTiles.includes(idx)) return;

    const el = document.getElementById(`tile_${idx}`);
    if (this.activeTiles.includes(idx)) {
      this.userTiles.push(idx);
      el.style.background = "var(--success)";
      window.snd.playClick();

      if (this.userTiles.length === this.activeTiles.length) {
        window.snd.playSuccess();
        this.score++;
        document.getElementById("matrixScore").textContent = this.score + 1;
        document.getElementById("matrixHint").textContent = "Отлично! Следующий уровень...";
        if (this.score >= 5) this.size = 4;
        setTimeout(() => this.startRound(), 1000);
      }
    } else {
      el.style.background = "var(--danger)";
      window.snd.playError();
      document.getElementById("matrixHint").textContent = "Ошибка! Игра перезапускается...";
      setTimeout(() => {
        this.score = 0;
        this.size = 3;
        this.render();
        this.startRound();
      }, 1200);
    }
  }

  destroy() {
    this.container.innerHTML = "";
  }
}

// 2. Stroop Focus: Тест когнитивного внимания Струпа
class StroopFocusGame {
  constructor(container) {
    this.container = container;
    this.score = 0;
    this.colors = [
      { name: "КРАСНЫЙ", value: "#ef4444" },
      { name: "СИНИЙ", value: "#38bdf8" },
      { name: "ЗЕЛЕНЫЙ", value: "#10b981" },
      { name: "ЖЕЛТЫЙ", value: "#f59e0b" }
    ];
    this.render();
    this.nextQuestion();
  }

  render() {
    this.container.innerHTML = `
      <div style="font-weight: 700; margin-bottom: 12px; font-size: 1.1rem;">
        Очки: <span id="stroopScore" style="color: var(--primary);">0</span>
      </div>
      <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 20px;">
        Совпадает ли значение слова с цветом шрифта?
      </div>
      <div id="stroopWord" style="font-size: 2.2rem; font-weight: 900; margin: 30px 0; letter-spacing: 2px;">
        СЛОВО
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-width: 280px; margin: 0 auto;">
        <button id="btnYes" class="btn-primary" style="background: var(--success); color: white;">ДА (Совпадает)</button>
        <button id="btnNo" class="btn-primary" style="background: var(--danger); color: white;">НЕТ (Разные)</button>
      </div>
    `;

    document.getElementById("btnYes").onclick = () => this.answer(true);
    document.getElementById("btnNo").onclick = () => this.answer(false);
  }

  nextQuestion() {
    const wordObj = this.colors[Math.floor(Math.random() * this.colors.length)];
    const isMatch = Math.random() > 0.5;
    let colorObj = wordObj;

    if (!isMatch) {
      const otherColors = this.colors.filter(c => c.value !== wordObj.value);
      colorObj = otherColors[Math.floor(Math.random() * otherColors.length)];
    }

    this.currentMatches = (wordObj.value === colorObj.value);
    const wordEl = document.getElementById("stroopWord");
    wordEl.textContent = wordObj.name;
    wordEl.style.color = colorObj.value;
  }

  answer(userChoice) {
    if (userChoice === this.currentMatches) {
      this.score++;
      window.snd.playSuccess();
      document.getElementById("stroopScore").textContent = this.score;
    } else {
      window.snd.playError();
    }
    this.nextQuestion();
  }

  destroy() {
    this.container.innerHTML = "";
  }
}

// 3. Speed Reaction: Тест реакции на скорость
class SpeedReactionGame {
  constructor(container) {
    this.container = container;
    this.state = "idle"; // idle, waiting, ready
    this.startTime = 0;
    this.timer = null;
    this.bestTime = null;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div style="font-weight: 700; margin-bottom: 12px; font-size: 1.1rem;">
        Рекорд: <span id="bestReaction" style="color: var(--primary);">-</span>
      </div>
      <div id="reactionTarget" style="
        width: 100%;
        max-width: 300px;
        height: 220px;
        background: var(--card-border);
        border-radius: var(--radius-lg);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        margin: 0 auto;
        cursor: pointer;
        padding: 20px;
      ">
        <div id="targetText" style="font-size: 1.2rem; font-weight: 700;">Нажмите для старта</div>
        <div id="targetSub" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 8px;">Ждите зеленый цвет</div>
      </div>
    `;

    document.getElementById("reactionTarget").onclick = () => this.handleClick();
  }

  handleClick() {
    const target = document.getElementById("reactionTarget");
    const title = document.getElementById("targetText");
    const sub = document.getElementById("targetSub");

    if (this.state === "idle") {
      this.state = "waiting";
      target.style.background = "#eab308"; // желтый
      title.textContent = "Ждите...";
      sub.textContent = "Не нажимайте раньше времени!";
      window.snd.playClick();

      const delay = 1500 + Math.random() * 2500;
      this.timer = setTimeout(() => {
        this.state = "ready";
        this.startTime = performance.now();
        target.style.background = "#10b981"; // зеленый
        title.textContent = "ЖМИ СЕЙЧАС!";
        sub.textContent = "";
        window.snd.playBeep(880, 0.05);
      }, delay);
    } else if (this.state === "waiting") {
      clearTimeout(this.timer);
      this.state = "idle";
      target.style.background = "#ef4444";
      title.textContent = "Фальстарт!";
      sub.textContent = "Нажмите, чтобы попробовать снова";
      window.snd.playError();
    } else if (this.state === "ready") {
      const reactionTime = Math.round(performance.now() - this.startTime);
      this.state = "idle";
      target.style.background = "var(--card-border)";
      title.textContent = `${reactionTime} мс!`;
      sub.textContent = "Отличная реакция! Нажмите для повтора";
      window.snd.playSuccess();

      if (!this.bestTime || reactionTime < this.bestTime) {
        this.bestTime = reactionTime;
        document.getElementById("bestReaction").textContent = `${this.bestTime} мс`;
      }
    }
  }

  destroy() {
    clearTimeout(this.timer);
    this.container.innerHTML = "";
  }
}

window.MatrixGridGame = MatrixGridGame;
window.StroopFocusGame = StroopFocusGame;
window.SpeedReactionGame = SpeedReactionGame;
