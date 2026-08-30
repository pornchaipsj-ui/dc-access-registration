(() => {
  "use strict";

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const content = q("#detail-content");
  if (!content || !window.AccessApp) return;

  const CARD_TYPES = ["VEN", "CUS"];
  const CARD_COUNT = 200;
  let currentType = "VEN";
  let timer = null;

  function esc(value) {
    return window.AccessApp.escapeHtml(value);
  }

  function cardOptions(type, current = "") {
    const cards = Array.from({ length: CARD_COUNT }, (_, i) =>
      `${type}.${String(i + 1).padStart(2, "0")}`
    );

    const values = current && !cards.includes(current)
      ? [current, ...cards]
      : cards;

    return [
      `<option value="">ไม่ได้แลกบัตร / No Card</option>`,
      ...values.map((card) =>
        `<option value="${esc(card)}"${card === current ? " selected" : ""}>${esc(card)}</option>`
      )
    ].join("");
  }

  function inferType(value) {
    const match = String(value || "").toUpperCase().match(/^(VEN|CUS)\./);
    return match ? match[1] : currentType;
  }

  function ensureTypeControl() {
    if (q("#tidc-card-type", content)) return;
    const instruction = q(".security-instruction", content);
    if (!instruction) return;

    const firstValue = q(".tidc-card", content)?.value || "";
    currentType = inferType(firstValue);

    const wrapper = document.createElement("div");
    wrapper.className = "tidc-card-type-control";
    wrapper.innerHTML = `
      <label>
        <strong>TIDC Card Type / ประเภทบัตร TIDC</strong>
        <select id="tidc-card-type" class="table-input">
          ${CARD_TYPES.map((type) =>
            `<option value="${type}"${type === currentType ? " selected" : ""}>${type}</option>`
          ).join("")}
        </select>
      </label>
      <small>เลือกครั้งเดียวสำหรับใบงานนี้ / Select once for this request</small>
    `;

    instruction.parentNode.insertBefore(wrapper, instruction);

    q("#tidc-card-type", wrapper).addEventListener("change", (event) => {
      currentType = event.target.value;
      qa("select.tidc-card", content).forEach((select) => {
        const old = select.value;
        const keep = old.startsWith(currentType + ".") ? old : "";
        select.innerHTML = cardOptions(currentType, keep);
        select.value = keep;
      });
    });
  }

  function convertInputs() {
    const inputs = qa("input.tidc-card", content);
    if (!inputs.length) return;

    const firstExisting = inputs.find((input) => input.value)?.value || "";
    currentType = inferType(firstExisting);
    ensureTypeControl();

    inputs.forEach((input) => {
      const current = String(input.value || "").trim().toUpperCase();
      const type = inferType(current);
      if (current) currentType = type;

      const select = document.createElement("select");
      select.className = input.className;
      select.setAttribute("aria-label", "TIDC Card No.");
      select.innerHTML = cardOptions(currentType, current);
      select.value = current;
      input.replaceWith(select);
    });

    const typeControl = q("#tidc-card-type", content);
    if (typeControl) typeControl.value = currentType;
  }

  function init() {
    clearTimeout(timer);
    timer = setTimeout(convertInputs, 50);
  }

  const observer = new MutationObserver(() => {
    if (q("input.tidc-card", content)) init();
  });
  observer.observe(content, { childList: true, subtree: true });
  init();

  const style = document.createElement("style");
  style.textContent = `
    select.tidc-card {
      min-width: 155px;
      pointer-events: auto !important;
      cursor: pointer !important;
      position: relative;
      z-index: 2;
    }
    .tidc-card-type-control {
      display: flex;
      align-items: end;
      gap: 14px;
      flex-wrap: wrap;
      margin: 14px 0;
      padding: 12px 14px;
      border: 1px solid #d9dde5;
      border-radius: 10px;
      background: #f8fafc;
    }
    .tidc-card-type-control label {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin: 0;
    }
    .tidc-card-type-control select { min-width: 110px; }
    .tidc-card-type-control small { color: #667085; padding-bottom: 8px; }
  `;
  document.head.appendChild(style);
})();
