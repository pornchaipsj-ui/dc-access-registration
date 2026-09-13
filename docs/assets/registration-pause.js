(() => {
  "use strict";

  const enabled = window.APP_CONFIG?.REGISTRATION_ENABLED !== false;
  if (enabled) return;

  const form = document.querySelector("#access-form");
  const modeBanner = document.querySelector("#mode-banner");
  const submitButton = document.querySelector("#submit-button");

  if (modeBanner) {
    modeBanner.hidden = false;
    modeBanner.innerHTML = `
      <strong>Registration Paused / ปิดรับการลงทะเบียน</strong><br>
      ระบบยังคงเก็บข้อมูลเดิมทั้งหมด และหน้า Approver / Security ยังใช้งานได้ตามปกติ<br>
      Existing records are unchanged. Approver and Security functions remain available.
    `;
  }

  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    window.alert("ระบบลงทะเบียนเข้าพื้นที่ปิดให้บริการ กรุณาติดต่อผู้ประสานงาน");
  }, true);

  form.querySelectorAll("input, select, textarea, button").forEach((element) => {
    element.disabled = true;
  });

  if (submitButton) {
    submitButton.textContent = "Registration Paused / ปิดรับการลงทะเบียน";
  }

  form.setAttribute("aria-disabled", "true");
  form.style.opacity = "0.58";
  form.style.pointerEvents = "none";
})();
