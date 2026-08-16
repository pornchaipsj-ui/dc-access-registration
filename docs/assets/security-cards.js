(() => {
  "use strict";

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const detail = q("#detail-panel");
  const content = q("#detail-content");
  const dateFilter = q("#date-filter");

  if (!detail || !content || !dateFilter || !window.AccessApp) return;

  const CARD_TYPES = ["VEN", "CUS"];
  const CARD_COUNT = 99;
  let activeCards = new Map();
  let currentCardType = "VEN";
  let client = null;
  let refreshTimer = null;
  let bypassNextSaveValidation = false;

  function normalizeCard(value) {
    return String(value || "").trim().toUpperCase();
  }

  function inferType(values) {
    const prefixed = values
      .map(normalizeCard)
      .map((value) => value.match(/^(VEN|CUS)\.\d{2}$/)?.[1])
      .filter(Boolean);

    if (!prefixed.length) return currentCardType;
    if (prefixed.every((type) => type === prefixed[0])) return prefixed[0];
    return currentCardType;
  }

  function cardList(type) {
    return Array.from({ length: CARD_COUNT }, (_, index) =>
      `${type}.${String(index + 1).padStart(2, "0")}`
    );
  }

  async function getSupabaseClient() {
    if (window.AccessApp.demoMode) return null;
    if (!client) client = await window.AccessApp.getClient();
    return client;
  }

  async function loadActiveCards() {
    activeCards = new Map();
    const selectedDate = dateFilter.value;
    if (!selectedDate || window.AccessApp.demoMode) return;

    const supabase = await getSupabaseClient();
    if (!supabase) return;

    const result = await supabase
      .from("attendee_daily_records")
      .select("attendee_id,tidc_card_no,card_return_time")
      .eq("record_date", selectedDate)
      .not("tidc_card_no", "is", null);

    if (result.error) throw result.error;

    (result.data || []).forEach((record) => {
      const card = normalizeCard(record.tidc_card_no);
      if (card && !record.card_return_time) {
        activeCards.set(card, String(record.attendee_id));
      }
    });
  }

  function getRows() {
    return qa("tr[data-attendee-id]", content);
  }

  function rowState(row) {
    const select = q("select.tidc-card", row);
    const returnInput = q(".card-return", row);
    return {
      attendeeId: String(row.dataset.attendeeId || ""),
      card: normalizeCard(select?.value),
      returned: Boolean(returnInput?.value)
    };
  }

  function locallyReservedCards(exceptAttendeeId = "") {
    const reserved = new Map(activeCards);

    getRows().forEach((row) => {
      const state = rowState(row);
      if (!state.card || state.returned || state.attendeeId === exceptAttendeeId) return;
      reserved.set(state.card, state.attendeeId);
    });

    return reserved;
  }

  function buildOptions(select, currentValue) {
    const row = select.closest("tr[data-attendee-id]");
    const attendeeId = String(row?.dataset.attendeeId || "");
    const current = normalizeCard(currentValue ?? select.value);
    const reserved = locallyReservedCards(attendeeId);
    const options = [{ value: "", label: "ไม่ได้แลกบัตร / No Card" }];

    cardList(currentCardType).forEach((card) => {
      const holder = reserved.get(card);
      if (!holder || holder === attendeeId || card === current) {
        options.push({ value: card, label: card });
      }
    });

    if (current && !options.some((option) => option.value === current)) {
      options.splice(1, 0, {
        value: current,
        label: `${current} (ข้อมูลเดิม / Existing)`
      });
    }

    select.innerHTML = options
      .map(
        (option) =>
          `<option value="${window.AccessApp.escapeHtml(option.value)}">${window.AccessApp.escapeHtml(option.label)}</option>`
      )
      .join("");

    select.value = current;
    if (select.value !== current) select.value = "";
  }

  function refreshAllOptions() {
    const selects = qa("select.tidc-card", content);
    const currentValues = new Map(
      selects.map((select) => [
        String(select.closest("tr[data-attendee-id]")?.dataset.attendeeId || ""),
        select.value
      ])
    );

    selects.forEach((select) => {
      const attendeeId = String(select.closest("tr[data-attendee-id]")?.dataset.attendeeId || "");
      buildOptions(select, currentValues.get(attendeeId) || "");
    });
  }

  function ensureCardTypeControl() {
    if (q("#tidc-card-type", content)) return;
    const instruction = q(".security-instruction", content);
    if (!instruction) return;

    const existingValues = qa(".tidc-card", content).map((element) => element.value);
    currentCardType = inferType(existingValues);

    const wrapper = document.createElement("div");
    wrapper.className = "tidc-card-type-control";
    wrapper.innerHTML = `
      <label>
        <strong>TIDC Card Type / ประเภทบัตร TIDC</strong>
        <select id="tidc-card-type" class="table-input">
          ${CARD_TYPES.map((type) => `<option value="${type}"${type === currentCardType ? " selected" : ""}>${type}</option>`).join("")}
        </select>
      </label>
      <small>เลือกครั้งเดียวสำหรับใบงานนี้ / Select once for this request</small>
    `;
    instruction.parentNode.insertBefore(wrapper, instruction);

    q("#tidc-card-type", wrapper).addEventListener("change", (event) => {
      currentCardType = event.target.value;
      refreshAllOptions();
    });
  }

  function transformInputs() {
    const inputs = qa("input.tidc-card", content);
    if (!inputs.length) return;

    const existingValues = inputs.map((input) => input.value);
    currentCardType = inferType(existingValues);
    ensureCardTypeControl();

    inputs.forEach((input) => {
      const select = document.createElement("select");
      select.className = input.className;
      select.setAttribute("aria-label", "TIDC Card No.");
      const current = input.value;
      input.replaceWith(select);
      buildOptions(select, current);
      select.addEventListener("change", refreshAllOptions);
    });

    refreshAllOptions();
  }

  async function enhanceCurrentRequest() {
    try {
      await loadActiveCards();
      transformInputs();
      refreshAllOptions();
    } catch (error) {
      console.error("Unable to load TIDC card availability", error);
      transformInputs();
    }
  }

  function scheduleEnhance() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      if (q("input.tidc-card", content)) enhanceCurrentRequest();
    }, 0);
  }

  function findCurrentRow(attendeeId) {
    return getRows().find((row) => String(row.dataset.attendeeId) === String(attendeeId));
  }

  function validateCards() {
    const activeInForm = new Map();

    for (const row of getRows()) {
      const state = rowState(row);
      if (!state.card || state.returned) continue;

      const duplicateAttendee = activeInForm.get(state.card);
      if (duplicateAttendee && duplicateAttendee !== state.attendeeId) {
        throw new Error(`Card No. ${state.card} ถูกเลือกซ้ำในใบงานนี้`);
      }
      activeInForm.set(state.card, state.attendeeId);

      const databaseHolder = activeCards.get(state.card);
      if (databaseHolder && databaseHolder !== state.attendeeId) {
        const holderRow = findCurrentRow(databaseHolder);
        const holderReturnedNow = Boolean(holderRow && q(".card-return", holderRow)?.value);
        if (!holderReturnedNow) {
          throw new Error(`Card No. ${state.card} กำลังถูกใช้งานอยู่ กรุณาเลือกบัตรใบอื่น`);
        }
      }
    }
  }

  detail.addEventListener(
    "click",
    async (event) => {
      const saveButton = event.target.closest("#save");
      if (!saveButton) return;

      if (bypassNextSaveValidation) {
        bypassNextSaveValidation = false;
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      try {
        await loadActiveCards();
        validateCards();
        bypassNextSaveValidation = true;
        saveButton.click();
      } catch (error) {
        alert(error.message || "ไม่สามารถตรวจสอบ Card No. ได้");
      }
    },
    true
  );

  dateFilter.addEventListener("change", () => {
    loadActiveCards()
      .then(refreshAllOptions)
      .catch((error) => console.error("Unable to refresh TIDC cards", error));
  });

  const observer = new MutationObserver(scheduleEnhance);
  observer.observe(content, { childList: true, subtree: true });

  const style = document.createElement("style");
  style.textContent = `
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
    .tidc-card-type-control select {
      min-width: 110px;
    }
    .tidc-card-type-control small {
      color: #667085;
      padding-bottom: 8px;
    }
    select.tidc-card {
      min-width: 155px;
    }
  `;
  document.head.appendChild(style);
})();
