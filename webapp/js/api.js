// Серверный клиент и менеджер сессий Telegram Mini Apps
const API_BASE = window.location.origin;

class PlatformAPI {
  constructor() {
    this.token = localStorage.getItem("platform_session_token");
    this.user = null;
    this.initData = window.Telegram?.WebApp?.initData || "";
  }

  async authenticate() {
    // В dev-режиме, если нет настоящего initData от Telegram, создаем тестовую сессию
    if (!this.initData) {
      console.warn("Telegram WebApp initData отсутствует. Проверяем локальный dev-токен.");
    }

    try {
      const res = await fetch(`${API_BASE}/auth/telegram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          init_data: this.initData,
          device_id: this.getDeviceId()
        })
      });

      if (!res.ok) {
        // Fallback для локального тестирования в браузере вне Telegram
        console.warn("Dev mode fallback авторизации.");
        return false;
      }

      const data = await res.json();
      this.token = data.token;
      localStorage.setItem("platform_session_token", this.token);
      return true;
    } catch (e) {
      console.error("Auth error:", e);
      return false;
    }
  }

  getDeviceId() {
    let id = localStorage.getItem("platform_device_id");
    if (!id) {
      id = "dev_" + Math.random().toString(36).substring(2, 12);
      localStorage.setItem("platform_device_id", id);
    }
    return id;
  }

  async fetchWithAuth(url, options = {}) {
    options.headers = options.headers || {};
    if (this.token) {
      options.headers["Authorization"] = `Bearer ${this.token}`;
    }
    return fetch(url, options);
  }

  async getProfile() {
    const res = await this.fetchWithAuth(`${API_BASE}/me`);
    if (!res.ok) throw new Error("Не удалось загрузить профиль");
    return res.json();
  }

  async getApps() {
    const res = await this.fetchWithAuth(`${API_BASE}/apps`);
    if (!res.ok) throw new Error("Не удалось загрузить список игр");
    return res.json();
  }

  async startSession(appId) {
    const res = await this.fetchWithAuth(`${API_BASE}/session/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_id: appId })
    });
    return res.json();
  }

  async sendHeartbeat(sessionId) {
    const res = await this.fetchWithAuth(`${API_BASE}/session/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId })
    });
    return res.json();
  }

  async endSession(sessionId) {
    return this.fetchWithAuth(`${API_BASE}/session/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId })
    });
  }

  async claimAdReward() {
    const res = await this.fetchWithAuth(`${API_BASE}/ad/reward`, { method: "POST" });
    return res.json();
  }

  async buyStarsProduct(productKey) {
    const res = await this.fetchWithAuth(`${API_BASE}/payment/stars/invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product: productKey })
    });
    const data = await res.json();

    // Если Telegram WebApp поддерживает нативную оплату инвойсов и сервер вернул invoice_link
    if (data.invoice_link && window.Telegram?.WebApp?.openInvoice) {
      return new Promise((resolve) => {
        window.Telegram.WebApp.openInvoice(data.invoice_link, (status) => {
          if (status === "paid") {
            resolve({ status: "ok", message: `Оплата ${data.stars} Stars успешно завершена!` });
          } else if (status === "cancelled") {
            resolve({ status: "cancelled", message: "Оплата отменена." });
          } else if (status === "failed") {
            resolve({ status: "error", message: "Ошибка при проведении платежа Stars." });
          } else {
            resolve({ status: status, message: `Статус оплаты: ${status}` });
          }
        });
      });
    }

    return data;
  }

  async requestOfflineToken() {
    const res = await this.fetchWithAuth(`${API_BASE}/offline/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: this.getDeviceId() })
    });
    return res.json();
  }
}

window.api = new PlatformAPI();
