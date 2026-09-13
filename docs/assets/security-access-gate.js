(() => {
  "use strict";

  const ACCESS_CODE = "20052539";
  const SESSION_KEY = "security_access_gate_ok";

  function unlock() {
    sessionStorage.setItem(SESSION_KEY, "1");
    document.documentElement.style.visibility = "";
  }

  if (sessionStorage.getItem(SESSION_KEY) === "1") {
    document.documentElement.style.visibility = "";
    return;
  }

  document.documentElement.style.visibility = "hidden";

  window.addEventListener("DOMContentLoaded", () => {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:99999;background:#f5f7fa;display:flex;align-items:center;justify-content:center;padding:20px;visibility:visible";
    overlay.innerHTML = `
      <form id="security-access-gate" style="width:min(420px,100%);background:#fff;border:1px solid #d9e0e7;border-radius:14px;padding:28px;box-shadow:0 16px 40px rgba(0,0,0,.12);font-family:Arial,sans-serif">
        <p style="margin:0 0 8px;color:#667085;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Security Access</p>
        <h1 style="margin:0 0 20px;font-size:24px">Access Code / รหัสเข้าใช้งาน</h1>
        <label style="display:block;font-size:14px;font-weight:600">Access Code
          <input id="security-access-code" type="password" inputmode="numeric" autocomplete="off" required style="box-sizing:border-box;width:100%;margin-top:8px;padding:12px;border:1px solid #cfd7df;border-radius:8px;font-size:18px">
        </label>
        <p id="security-access-error" style="display:none;color:#b42318;margin:10px 0 0">Access Code ไม่ถูกต้อง</p>
        <button type="submit" style="width:100%;margin-top:18px;padding:12px;border:0;border-radius:8px;background:#111827;color:#fff;font-size:15px;font-weight:700;cursor:pointer">Continue / ดำเนินการต่อ</button>
      </form>`;
    document.body.appendChild(overlay);
    document.documentElement.style.visibility = "visible";

    overlay.querySelector("#security-access-gate").addEventListener("submit", (event) => {
      event.preventDefault();
      const value = overlay.querySelector("#security-access-code").value.trim();
      const error = overlay.querySelector("#security-access-error");
      if (value !== ACCESS_CODE) {
        error.style.display = "block";
        return;
      }
      unlock();
      overlay.remove();
    });
  }, { once: true });
})();
