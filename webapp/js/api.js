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
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/me`);
      if (res && res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Backend /me unreachable, using default player profile:", e);
    }

    // Fallback profile с точным учетом пакетов минут и Plus
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    const isLocalPlus = localStorage.getItem("user_is_plus") === "true";
    const extraMinutes = parseFloat(localStorage.getItem("user_extra_minutes") || "0");
    const baseMinutes = 10.0;
    const totalRemaining = isLocalPlus ? 999999 : (baseMinutes + extraMinutes);

    return {
      user: {
        user_id: tgUser?.id || 1001,
        first_name: tgUser?.first_name || "Игрок",
        status: isLocalPlus ? "plus" : "free"
      },
      minutes: {
        total_remaining: totalRemaining,
        remaining_minutes: isLocalPlus ? "Plus ∞" : totalRemaining.toFixed(1),
        is_plus: isLocalPlus,
        streak_days: 1,
        breakdown: {
          free_minutes: baseMinutes,
          streak_minutes: 0,
          extra_minutes: extraMinutes,
          referral_minutes: 0
        }
      },
      referrals: {
        verified_friends: 0,
        referral_link: "https://t.me/minigame2_bot?start=" + (tgUser?.id || "ref")
      }
    };
  }

  async getApps() {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/apps`);
      if (res && res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Backend /apps unreachable, using client catalogue fallback:", e);
    }
    // Fallback to static catalogue when running on GitHub Pages
    if (window.DEFAULT_APPS && window.DEFAULT_APPS.length > 0) {
      return { apps: window.DEFAULT_APPS };
    }
    return { apps: [] };
  }

  async startSession(appId) {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/session/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_id: appId })
      });
      if (res && res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Backend session/start unreachable, evaluating offline token & balance policy:", e);
    }

    // Жесткая проверка баланса и офлайн-доступа (RULES.md п. 8.1 - 8.7)
    const isLocalPlus = localStorage.getItem("user_is_plus") === "true";
    let extraMinutes = parseFloat(localStorage.getItem("user_extra_minutes") || "0");
    const todayKey = "free_min_date_" + new Date().toISOString().slice(0, 10);
    const usedToday = parseFloat(localStorage.getItem(todayKey) || "0");
    const freeDailyBase = 10.0;
    const remainingFree = Math.max(0, freeDailyBase - usedToday);
    const totalRemaining = remainingFree + extraMinutes;

    // Если нет Plus и суммарный баланс минут исчерпан (<= 0) — жесткая блокировка
    if (!isLocalPlus && totalRemaining <= 0.05) {
      return {
        error: "Лимит игрового времени исчерпан. Пополните баланс в Магазине или дождитесь обновления в 00:00 UTC.",
        require_paywall: true
      };
    }

    // Если пользователь Plus — разрешаем офлайн-сессию
    // Если Free — разрешаем играть только в пределах оставшихся минут
    return {
      session_id: "offline_sess_" + Date.now(),
      app_id: appId,
      started_at: new Date().toISOString(),
      is_offline: true,
      remaining_minutes: isLocalPlus ? "Plus ∞" : totalRemaining.toFixed(1)
    };
  }

  async sendHeartbeat(sessionId) {
    try {
      const res = await this.fetchWithAuth(`${API_BASE}/session/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId })
      });
      if (res && res.ok) {
        return await res.json();
      }
    } catch (e) {}

    // Офлайн-списание: каждые 30 секунд списываем 0.5 минуты
    const isLocalPlus = localStorage.getItem("user_is_plus") === "true";
    if (isLocalPlus) {
      return { ok: true, minutes: { is_plus: true, remaining_minutes: "Plus ∞" } };
    }

    const todayKey = "free_min_date_" + new Date().toISOString().slice(0, 10);
    let usedToday = parseFloat(localStorage.getItem(todayKey) || "0");
    let extraMinutes = parseFloat(localStorage.getItem("user_extra_minutes") || "0");

    if (usedToday < 10.0) {
      usedToday = Math.min(10.0, usedToday + 0.5);
      localStorage.setItem(todayKey, usedToday.toString());
    } else if (extraMinutes > 0) {
      extraMinutes = Math.max(0, extraMinutes - 0.5);
      localStorage.setItem("user_extra_minutes", extraMinutes.toString());
    }

    const remFree = Math.max(0, 10.0 - usedToday);
    const totalRemaining = remFree + extraMinutes;

    if (totalRemaining <= 0.01) {
      return {
        error: "Ваше время игры подошло к концу. Перейдите в Магазин для продления.",
        require_paywall: true
      };
    }

    return {
      ok: true,
      minutes: {
        is_plus: false,
        remaining_minutes: totalRemaining.toFixed(1)
      }
    };
  }

  async endSession(sessionId) {
    try {
      return await this.fetchWithAuth(`${API_BASE}/session/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId })
      });
    } catch (e) {}
    return { ok: true };
  }

  async claimAdReward() {
    const res = await this.fetchWithAuth(`${API_BASE}/ad/reward`, { method: "POST" });
    return res.json();
  }

  async buyStarsProduct(productKey) {
    const staticInvoices = {
      "plus_30d": { link: "https://t.me/$En1kvnmMEEgiIAAAW8nTriEXlhc", stars: 199, title: "Plus на 30 дней" },
      "plus_180d": { link: "https://t.me/$kMhuRHmMEEgjIAAAJ0Tj9GwUCTw", stars: 999, title: "Plus на 180 дней" },
      "pack_30m": { link: "https://t.me/$NZpmsXmMEEgkIAAAv0oCN4IVpnI", stars: 25, title: "Пакет +30 минут" },
      "pack_120m": { link: "https://t.me/$jFTO5nmMEEglIAAAJJEykxECYOY", stars: 79, title: "Пакет +120 минут" }
    };

    let invoiceLink = null;
    let starsAmount = 199;

    try {
      const res = await this.fetchWithAuth(`${API_BASE}/payment/stars/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product: productKey })
      });
      if (res && res.ok) {
        const data = await res.json();
        if (data.invoice_link) {
          invoiceLink = data.invoice_link;
          starsAmount = data.stars;
        }
      }
    } catch (e) {
      console.warn("Backend /payment/stars/invoice unreachable, using pre-generated Bot Stars invoice:", e);
    }

    if (!invoiceLink && staticInvoices[productKey]) {
      invoiceLink = staticInvoices[productKey].link;
      starsAmount = staticInvoices[productKey].stars;
    }

    // Открываем нативную шторку оплаты инвойса в Telegram WebApp
    if (invoiceLink && window.Telegram?.WebApp?.openInvoice) {
      return new Promise((resolve) => {
        window.Telegram.WebApp.openInvoice(invoiceLink, (status) => {
          if (status === "paid") {
            // Дифференцированное начисление: Plus подписка vs Пакет минут
            if (productKey === "plus_30d" || productKey === "plus_180d") {
              localStorage.setItem("user_is_plus", "true");
              resolve({ status: "ok", message: `Оплата ${starsAmount} Stars завершена! Подписка Plus активирована.` });
            } else if (productKey === "pack_30m") {
              const currentExtra = parseFloat(localStorage.getItem("user_extra_minutes") || "0");
              localStorage.setItem("user_extra_minutes", (currentExtra + 30).toString());
              resolve({ status: "ok", message: `Оплата ${starsAmount} Stars завершена! Начислено +30 минут.` });
            } else if (productKey === "pack_120m") {
              const currentExtra = parseFloat(localStorage.getItem("user_extra_minutes") || "0");
              localStorage.setItem("user_extra_minutes", (currentExtra + 120).toString());
              resolve({ status: "ok", message: `Оплата ${starsAmount} Stars завершена! Начислено +120 минут.` });
            } else {
              resolve({ status: "ok", message: `Оплата ${starsAmount} Stars успешно завершена!` });
            }
          } else if (status === "cancelled") {
            resolve({ status: "cancelled", message: "Оплата отменена." });
          } else if (status === "failed") {
            resolve({ status: "error", message: "Ошибка проведения платежа Telegram Stars." });
          } else {
            resolve({ status: status, message: `Статус оплаты: ${status}` });
          }
        });
      });
    } else if (invoiceLink && window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(invoiceLink);
      return { status: "pending", message: "Инвойс открыт в Telegram." };
    }

    return { status: "error", message: "Не удалось открыть инвойс оплаты." };
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
