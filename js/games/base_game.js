/**
 * Базовый абстрактный класс для всех 30 игр платформы «Мини игры»
 * Стандарт: GAME-TEMPLATE.md, UI-KIT.md v1.1
 */
window.BaseGame = class BaseGame {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.score = 0;
    this.isPaused = false;
    this.isOver = false;
    this.animationFrameId = null;
    this.timers = [];

    this.container.innerHTML = "";
    this.canvas = document.createElement("canvas");
    this.canvas.style.display = "block";
    this.canvas.style.touchAction = "none";
    this.canvas.style.maxWidth = "100%";
    this.canvas.style.maxHeight = "100%";
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");

    this.resize();
    this._bindEvents();
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const width = Math.min(rect.width || 360, 420);
    const height = Math.min(rect.height || 560, 640);
    const dpr = window.devicePixelRatio || 1;

    this.width = width;
    this.height = height;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.scale(dpr, dpr);
  }

  _bindEvents() {
    this._onResize = () => this.resize();
    window.addEventListener("resize", this._onResize);
  }

  setTimeout(fn, ms) {
    const id = window.setTimeout(fn, ms);
    this.timers.push(id);
    return id;
  }

  setInterval(fn, ms) {
    const id = window.setInterval(fn, ms);
    this.timers.push(id);
    return id;
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  gameOver(score) {
    if (this.isOver) return;
    this.isOver = true;
    this.score = score;
    if (window.snd) window.snd.playGameOver();
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred("error");
    }

    // Сохраняем локальный рекорд
    const key = `best_score_${this.options.app_id || "game"}`;
    const best = Math.max(score, parseInt(localStorage.getItem(key) || "0", 10));
    localStorage.setItem(key, best.toString());

    if (typeof window.showResultsOverlay === "function") {
      window.showResultsOverlay(score, best);
    }
  }

  destroy() {
    this.isOver = true;
    this.isPaused = true;
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
    window.removeEventListener("resize", this._onResize);
    this.container.innerHTML = "";
  }
};
