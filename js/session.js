// Менеджер сессии с фоновой очередью офлайн-синхронизации (Offline Sync Queue v1.1)
class SessionManager {
  constructor() {
    this.currentSessionId = null;
    this.currentAppId = null;
    this.heartbeatTimer = null;
    this.isActive = false;
    this.pendingHeartbeats = [];

    // При выходе в онлайн — отправляем накопленный буфер
    window.addEventListener("online", () => this.flushOfflineQueue());

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
      if (typeof window.switchTab === 'function') {
        window.switchTab('store');
      }
      alert(res.error);
      return false;
    }

    this.currentSessionId = res.session_id;
    this.isActive = true;
    this.onTimeExceeded = onTimeExceeded;

    this.heartbeatTimer = setInterval(async () => {
      if (!this.isActive || !this.currentSessionId) return;

      try {
        const hbRes = await window.api.sendHeartbeat(this.currentSessionId);
        if (hbRes.error) {
          console.warn("Heartbeat error:", hbRes.error);
          this.stop();
          if (this.onTimeExceeded) this.onTimeExceeded(hbRes.error);
        } else {
          window.updateMinutesDisplay(hbRes.minutes);
        }
      } catch (err) {
        // Раздел 8.6: При разрыве сети накапливаем heartbeat в буфер
        console.warn("Сетевой сбой heartbeat, сохраняем в офлайн-очередь:", err);
        this.pendingHeartbeats.push({
          session_id: this.currentSessionId,
          timestamp: Date.now()
        });
      }
    }, 30000);

    return true;
  }

  async flushOfflineQueue() {
    if (this.pendingHeartbeats.length === 0) return;
    console.log(`Отправка ${this.pendingHeartbeats.length} отложенных heartbeat...`);
    for (const item of [...this.pendingHeartbeats]) {
      try {
        await window.api.sendHeartbeat(item.session_id);
        this.pendingHeartbeats.shift();
      } catch (e) {
        break;
      }
    }
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
      try {
        await window.api.endSession(this.currentSessionId);
      } catch (e) {}
      this.currentSessionId = null;
    }
    this.isActive = false;
  }
}

window.sessionMgr = new SessionManager();
