// Ультралегкий процедурный звуковой генератор (Web Audio API) и тактильный отклик Haptics
// Полный размер: ~1 КБ, 0 КБ внешних файлов mp3/wav!
class SoundAndHaptics {
  constructor() {
    this.ctx = null;
    this.initAudio();
  }

  initAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    } catch (e) {
      console.warn("Web Audio API не поддерживается:", e);
    }
  }

  ensureContext() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // Тактильный виброотклик Telegram Haptic Feedback
  hapticTap() {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
    } catch (e) {}
  }

  hapticSuccess() {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
    } catch (e) {}
  }

  hapticError() {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred("error");
    } catch (e) {}
  }

  // Процедурные звуки
  playBeep(freq = 440, duration = 0.08, type = "sine") {
    if (!this.ctx) return;
    this.ensureContext();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  playSuccess() {
    this.hapticSuccess();
    this.playBeep(523.25, 0.08, "sine"); // C5
    setTimeout(() => this.playBeep(659.25, 0.12, "sine"), 80); // E5
  }

  playError() {
    this.hapticError();
    this.playBeep(220, 0.15, "sawtooth");
  }

  playClick() {
    this.hapticTap();
    this.playBeep(880, 0.03, "triangle");
  }
}

window.snd = new SoundAndHaptics();
