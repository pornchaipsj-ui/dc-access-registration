(() => {
  "use strict";

  const config = window.APP_CONFIG || {};
  const hasSupabaseConfig = Boolean(
    config.SUPABASE_URL &&
    config.SUPABASE_ANON_KEY &&
    !config.SUPABASE_URL.includes("YOUR-PROJECT") &&
    !config.SUPABASE_ANON_KEY.includes("YOUR-SUPABASE")
  );
  const demoMode = config.DEMO_MODE !== false || !hasSupabaseConfig;
  let client = null;
  let supabaseLoader = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded === "true") {
          resolve();
          return;
        }
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", () => reject(new Error(`โหลด Script ไม่สำเร็จ: ${src}`)), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => {
        script.dataset.loaded = "true";
        resolve();
      };
      script.onerror = () => reject(new Error(`โหลด Script ไม่สำเร็จ: ${src}`));
      document.head.append(script);
    });
  }

  async function getClient() {
    if (demoMode) return null;
    if (client) return client;
    if (!supabaseLoader) {
      supabaseLoader = (async () => {
        if (!window.supabase) {
          await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
        }
        client = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
          auth: { persistSession: true, autoRefreshToken: true }
        });
        return client;
      })();
    }
    return supabaseLoader;
  }

  const demoKey = "dc_access_requests_v2_staff_upload";

  function randomCode(prefix = "REQ") {
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: config.TIMEZONE || "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date()).replaceAll("-", "");
    const suffix = crypto.getRandomValues(new Uint32Array(1))[0]
      .toString(36)
      .toUpperCase()
      .slice(0, 6)
      .padEnd(6, "0");
    return `${prefix}-${date}-${suffix}`;
  }

  function readDemoRequests() {
    try {
      const value = JSON.parse(localStorage.getItem(demoKey) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function writeDemoRequests(items) {
    localStorage.setItem(demoKey, JSON.stringify(items));
  }

  function saveDemoRequest(request, attendees) {
    const items = readDemoRequests();
    const now = new Date().toISOString();
    const record = {
      id: crypto.randomUUID(),
      request_code: randomCode(),
      status: "pending",
      created_at: now,
      updated_at: now,
      reviewed_at: null,
      reviewed_by: null,
      ...request,
      attendees: attendees.map((person) => ({
        id: crypto.randomUUID(),
        tidc_card_no: null,
        card_exchange_time: null,
        entry_time: null,
        exit_time: null,
        card_return_time: null,
        ...person
      }))
    };
    items.unshift(record);
    writeDemoRequests(items);
    return record;
  }

  function updateDemoRequest(id, patch) {
    const items = readDemoRequests();
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) throw new Error("ไม่พบรายการ");
    items[index] = { ...items[index], ...patch, updated_at: new Date().toISOString() };
    writeDemoRequests(items);
    return items[index];
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDateTime(value) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("th-TH", {
      timeZone: config.TIMEZONE || "Asia/Bangkok",
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  }

  function parseDateOnly(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0);
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = parseDateOnly(value) || new Date(value);
    if (Number.isNaN(date.valueOf())) return "-";
    return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(date);
  }

  function formatTime(value) {
    if (!value) return "";
    const timeMatch = String(value).match(/^(\d{1,2}):(\d{2})/);
    if (timeMatch) return `${String(timeMatch[1]).padStart(2, "0")}:${timeMatch[2]}`;
    const date = new Date(value);
    if (Number.isNaN(date.valueOf())) return "";
    return new Intl.DateTimeFormat("th-TH", {
      timeZone: config.TIMEZONE || "Asia/Bangkok",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(date);
  }

  function todayDateString() {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: config.TIMEZONE || "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    return formatter.format(new Date());
  }

  function attendeeTypeLabel(type) {
    return ({
      STAFF: "Staff",
      "STAFF-EMERGENCY": "Staff-Emergency",
      "STAFF-TECHNICIAN": "Staff-Technician",
      VENDOR: "Vendor",
      VISITOR: "Visitor"
    })[type] || type || "-";
  }

  window.AccessApp = {
    config,
    demoMode,
    getClient,
    loadScript,
    randomCode,
    readDemoRequests,
    saveDemoRequest,
    updateDemoRequest,
    escapeHtml,
    formatDateTime,
    formatDate,
    formatTime,
    todayDateString,
    attendeeTypeLabel
  };
})();
