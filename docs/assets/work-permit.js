(() => {
  "use strict";

  const byId = id => document.getElementById(id);
  const value = id => (byId(id)?.value || "").trim();
  const checked = name => document.querySelector(`input[name="${name}"]:checked`)?.value || "";

  function data() {
    return {
      location:value("location"), area:value("room"), startDate:value("visit-date"), endDate:value("visit-end-date"),
      startTime:value("wp-start-time"), endTime:value("wp-end-time"), project:value("project-name"),
      objective:value("objective"), description:value("wp-description"), permitType:checked("wp-permit-type"),
      workType:checked("wp-work-type"), requester:value("requester-name"), requesterPhone:value("requester-phone"),
      requesterCompany:value("requester-company"), requesterDepartment:value("wp-requester-department"),
      jobOwner:value("wp-job-owner") || value("host-name"), jobOwnerPhone:value("wp-job-owner-phone") || value("host-phone"),
      jobOwnerDepartment:value("wp-job-owner-department"), contractor:value("wp-contractor-controller"),
      contractorPhone:value("wp-contractor-phone"), contractorCompany:value("wp-contractor-company"),
      contractorDepartment:value("wp-contractor-department"), tools:value("wp-tools"), ppe:value("wp-ppe"),
      docs:[
        byId("wp-jsa")?.checked && "JSA", byId("wp-personnel")?.checked && "List of Personnel",
        byId("wp-tools-list")?.checked && "Tools / Equipment List", byId("wp-risk-checklist")?.checked && "Risk Checklist",
        byId("wp-sds")?.checked && "SDS"
      ].filter(Boolean)
    };
  }

  function valid() {
    const section=byId("work-permit-section");
    const required=[...section.querySelectorAll("[required]")];
    for (const el of required) if (!el.checkValidity()) { el.reportValidity(); return false; }
    return true;
  }

  function esc(s){return String(s||"-").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

  function docHtml(d) {
    return `<!doctype html><html><head><meta charset="utf-8"><title>FR-125 Work Permit Preview</title>
    <style>body{font-family:Arial,sans-serif;margin:24px;color:#111}.sheet{max-width:900px;margin:auto;border:1px solid #222;padding:20px}h1{text-align:center;margin:0 0 4px}h2{font-size:16px;border-bottom:1px solid #333;padding-bottom:5px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 20px}.full{grid-column:1/-1}.box{border:1px solid #aaa;padding:8px;min-height:20px}.note{font-size:11px;color:#555}.actions{text-align:center;margin:18px}@media print{.actions{display:none}body{margin:0}.sheet{border:0}}</style></head><body>
    <div class="actions"><button onclick="window.print()">Print / พิมพ์</button></div><div class="sheet">
    <h1>ใบขออนุญาตปฏิบัติงาน / Work Permit</h1><div style="text-align:center">FR-125-v03 — Section 1: Work Permit Requisition</div>
    <h2>Work Information / ข้อมูลงาน</h2><div class="grid">
    <div><b>Location</b><div class="box">${esc(d.location)}</div></div><div><b>Area</b><div class="box">${esc(d.area)}</div></div>
    <div><b>Date</b><div class="box">${esc(d.startDate)} – ${esc(d.endDate)}</div></div><div><b>Time</b><div class="box">${esc(d.startTime)} – ${esc(d.endTime)}</div></div>
    <div><b>Permit Type</b><div class="box">${esc(d.permitType)}</div></div><div><b>Type of Work</b><div class="box">${esc(d.workType)}</div></div>
    <div class="full"><b>Scope / Description</b><div class="box">${esc(d.description || d.objective)}</div></div></div>
    <h2>Permit Requester / ผู้ยื่นคำขอ</h2><div class="grid"><div><b>Name</b><div class="box">${esc(d.requester)}</div></div><div><b>Tel.</b><div class="box">${esc(d.requesterPhone)}</div></div><div><b>Company</b><div class="box">${esc(d.requesterCompany)}</div></div><div><b>Department</b><div class="box">${esc(d.requesterDepartment)}</div></div></div>
    <h2>Job Controllers</h2><div class="grid"><div><b>Job Owner / TIDC</b><div class="box">${esc(d.jobOwner)}</div></div><div><b>Tel.</b><div class="box">${esc(d.jobOwnerPhone)}</div></div><div><b>Contractor Job Controller</b><div class="box">${esc(d.contractor)}</div></div><div><b>Tel.</b><div class="box">${esc(d.contractorPhone)}</div></div><div><b>Contractor Company</b><div class="box">${esc(d.contractorCompany)}</div></div><div><b>Department</b><div class="box">${esc(d.contractorDepartment)}</div></div></div>
    <h2>Supporting Information</h2><div><b>Documents</b><div class="box">${esc(d.docs.join(", "))}</div></div><div><b>Tools / Equipment</b><div class="box">${esc(d.tools)}</div></div><div><b>Additional PPE</b><div class="box">${esc(d.ppe)}</div></div>
    <p class="note">Preview generated from the registration form for review. Safety approval and later FR-125 sections are completed in the approval workflow.</p>
    </div></body></html>`;
  }

  function openPreview(printNow=false){
    if(!valid()) return;
    const w=window.open("","_blank");
    if(!w){alert("Please allow pop-ups to preview FR-125.");return;}
    w.document.open(); w.document.write(docHtml(data())); w.document.close();
    if(printNow) setTimeout(()=>w.print(),300);
  }

  window.WorkPermitForm = {
    collect: data,
    validate: valid,
    preview: () => openPreview(false),
    print: () => openPreview(true)
  };

  byId("wp-preview")?.addEventListener("click",()=>openPreview(false));
  byId("wp-print")?.addEventListener("click",()=>openPreview(true));

  const style=document.createElement("style");
  style.textContent=`.wp-box{border:1px solid #e4e7ec;border-radius:10px;padding:12px}.wp-check-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}.wp-check-grid label{display:flex!important;flex-direction:row!important;gap:8px;align-items:center}.wp-check-grid input{width:16px;height:16px;margin:0}.wp-actions{justify-content:flex-end}@media(max-width:800px){.wp-check-grid{grid-template-columns:1fr}}`;
  document.head.appendChild(style);
})();