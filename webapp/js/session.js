// Менеджер активной игровой сессии и Heartbeat (Раздел 4.7-4.8 RULES.md)
class SessionManager {
  constructor() {
    this.currentSessionId = null;
    this.currentAppId = null;
    this.heartbeatTimer = null;
    this.isActive = false;

    // 4.7: Минуты не списываются при паузе/сворачивании
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });
  }

  async start(appId, onTimeExceeded) {
    this.currentAppId = appId;
    const res = await window.api.startSession(appId);
    
    if (res.error) {
      if (res.require_paywall) {
        window.showPaywall(res.error);
      } else {
        alert(res.error);
      }
      return false;
    }

    this.currentSessionId = res.session_id;
    this.isActive = true;
    this.onTimeExceeded = onTimeExceeded;

    // Запуск цикла Heartbeat раз в 30 секунд (п. 4.8)
    this.heartbeatTimer = setInterval(async () => {
      if (!this.isActive || !this.currentSessionId) return;

      const hbRes = await window.api.sendHeartbeat(this.currentSessionId);
      if (hbRes.error) {
        console.warn("Heartbeat error:", hbRes.error);
        this.stop();
        if (this.onTimeExceeded) this.onTimeExceeded(hbRes.error);
      } else {
        window.updateMinutesDisplay(hbRes.minutes);
      }
    }, 30000);

    return true;
  }

  pause() {
    this.isActive = false;
  }

  resume() {
    if (this.currentSessionId) {
      this.isActive = true;
    }
  }

  async stop() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.currentSessionId) {
      await window.api.endSession(this.currentSessionId);
      this.currentSessionId = null;
    }
    this.isActive = false;
  }
}

window.sessionMgr = new SessionManager();
