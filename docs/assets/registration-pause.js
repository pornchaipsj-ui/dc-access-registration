(() => {
  "use strict";

  const config = window.APP_CONFIG || {};
  if (config.REGISTRATION_ENABLED === false) return;

  const form = document.querySelector("#access-form");
  const main = document.querySelector("main.container");
  if (!form || !main) return;

  // Hide the registration content until the PIN is accepted.
  Array.from(main.children).forEach((element) => {
    if (element !== form) element.hidden = true;
  });
  form.hidden = true;

  const gate = document.createElement("section");
  gate.id = "registration-pin-gate";
  gate.className = "login-shell";
  gate.innerHTML = `
    <form id="registration-pin-form" class="login-card" autocomplete="off">
      <p class="eyebrow">Access Registration</p>
      <h1>Enter Access PIN</h1>
      <p>กรุณาใส่ PIN เพื่อเปิดหน้าลงทะเบียน / Please enter the PIN to continue.</p>
      <label>
        PIN
        <input id="registration-pin" type="password" inputmode="numeric"
          pattern="[0-9]*" maxlength="6" autocomplete="off" required>
      </label>
      <p id="registration-pin-error" class="error-message" hidden>
        PIN ไม่ถูกต้อง / Incorrect PIN
      </p>
      <button class="button button--primary" type="submit">Continue / ดำเนินการต่อ</button>
    </form>
  `;
  main.prepend(gate);

  const pinForm = gate.querySelector("#registration-pin-form");
  const pinInput = gate.querySelector("#registration-pin");
  const error = gate.querySelector("#registration-pin-error");

  pinForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (pinInput.value === String(config.REGISTRATION_PIN || "")) {
      gate.remove();
      Array.from(main.children).forEach((element) => {
        element.hidden = false;
      });
      form.hidden = false;
      return;
    }

    error.hidden = false;
    pinInput.value = "";
    pinInput.focus();
  });
})();
