(() => {
  "use strict";

  const root = document.querySelector("#work-area-picker");
  const hidden = document.querySelector("#room");
  const form = document.querySelector("#access-form");
  if (!root || !hidden || !form) return;

  const groups = [
    {
      name: "TIDC-Zone",
      items: [
        "Office zone","EE-DH07","EE-DH08","EE-DH-SCR","Store-02","Store-05","Store-06","Store-07","Store-08",
        "EVL Storage-A","EVL-Storage-B","NWS-A","NWS-B","BTS room","ENT-A","ENT-D","MMR-A","MMR-B","EE-1A/1","EE-1B/1",
        "EE-2A/1","EE-2B/1","EE-Store-01","AHU","Fire SPK","SOC","FOC","Corrodor zone","External zone"
      ]
    },
    {
      name: "Customer zone",
      items: [
        "DH07","DH08","SCR01","SCR02","Office zone","Customer server room","ERAD room","SOC customer room",
        "SEC storage room","Storage room"
      ]
    }
  ];

  const selected = new Set();

  function esc(value) {
    return window.AccessApp?.escapeHtml ? window.AccessApp.escapeHtml(value) : String(value);
  }

  function sync() {
    const values = [...selected];
    hidden.value = values.join(", ");

    const summary = root.querySelector(".work-area-summary");
    const count = root.querySelector(".work-area-count");
    if (count) count.textContent = `${values.length} selected`;
    if (summary) {
      summary.textContent = values.length
        ? values.join(" • ")
        : "เลือกพื้นที่อย่างน้อย 1 รายการ / Select at least one area";
      summary.classList.toggle("is-empty", !values.length);
    }
  }

  root.innerHTML = `
    <div class="work-area-head">
      <button type="button" class="work-area-toggle">
        <span>เลือกพื้นที่ / Select work areas</span>
        <strong class="work-area-count">0 selected</strong>
      </button>
      <div class="work-area-summary is-empty">เลือกพื้นที่อย่างน้อย 1 รายการ / Select at least one area</div>
    </div>
    <div class="work-area-menu" hidden>
      ${groups.map(group => `
        <section class="work-area-group">
          <div class="work-area-group-title">${esc(group.name)}</div>
          <div class="work-area-grid">
            ${group.items.map(item => {
              const value = `${group.name}: ${item}`;
              return `<label class="work-area-option"><input type="checkbox" value="${esc(value)}"><span>${esc(item)}</span></label>`;
            }).join("")}
          </div>
        </section>
      `).join("")}
    </div>
  `;

  const toggle = root.querySelector(".work-area-toggle");
  const menu = root.querySelector(".work-area-menu");

  toggle.addEventListener("click", () => {
    menu.hidden = !menu.hidden;
    toggle.classList.toggle("is-open", !menu.hidden);
  });

  root.addEventListener("change", (event) => {
    const checkbox = event.target.closest('input[type="checkbox"]');
    if (!checkbox) return;
    if (checkbox.checked) selected.add(checkbox.value);
    else selected.delete(checkbox.value);
    sync();
  });

  document.addEventListener("click", (event) => {
    if (!root.contains(event.target)) {
      menu.hidden = true;
      toggle.classList.remove("is-open");
    }
  });

  form.addEventListener("submit", (event) => {
    if (selected.size) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    menu.hidden = false;
    toggle.classList.add("is-open");
    root.scrollIntoView({ behavior: "smooth", block: "center" });
    alert("กรุณาเลือกพื้นที่เข้าปฏิบัติงานอย่างน้อย 1 รายการ");
  }, true);

  const style = document.createElement("style");
  style.textContent = `
    .work-area-field { grid-column: span 2; }
    .work-area-picker { position: relative; }
    .work-area-toggle { width:100%; min-height:48px; border:1px solid #cfd5df; border-radius:10px; background:#fff; padding:10px 12px; display:flex; align-items:center; justify-content:space-between; gap:12px; cursor:pointer; text-align:left; }
    .work-area-toggle.is-open { border-color:#667085; box-shadow:0 0 0 3px rgba(102,112,133,.12); }
    .work-area-toggle strong { font-size:12px; color:#475467; white-space:nowrap; }
    .work-area-summary { margin-top:7px; font-size:12px; color:#344054; line-height:1.5; }
    .work-area-summary.is-empty { color:#98a2b3; }
    .work-area-menu { position:absolute; z-index:50; left:0; right:0; top:58px; max-height:430px; overflow:auto; background:#fff; border:1px solid #d0d5dd; border-radius:12px; box-shadow:0 14px 34px rgba(16,24,40,.16); padding:14px; }
    .work-area-group + .work-area-group { margin-top:16px; padding-top:14px; border-top:1px solid #eaecf0; }
    .work-area-group-title { font-weight:700; margin-bottom:9px; color:#101828; }
    .work-area-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:7px 12px; }
    .work-area-option { display:flex !important; flex-direction:row !important; align-items:center; gap:8px; margin:0 !important; padding:7px 8px; border-radius:7px; cursor:pointer; font-size:13px; }
    .work-area-option:hover { background:#f2f4f7; }
    .work-area-option input { width:16px; height:16px; margin:0; flex:0 0 auto; }
    @media (max-width:800px) { .work-area-field { grid-column:span 1; } .work-area-grid { grid-template-columns:1fr; } .work-area-menu { position:fixed; left:12px; right:12px; top:15vh; max-height:70vh; } }
  `;
  document.head.appendChild(style);
  sync();
})();
