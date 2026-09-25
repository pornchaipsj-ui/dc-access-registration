(() => {
"use strict";
const detail=document.querySelector("#detail-panel");
if(!detail)return;
const esc=s=>String(s??"-").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function wpFromRequest(r){
  if(!r)return null;
  let w=r.work_permit||r.work_permit_data||null;
  if(typeof w==="string"){try{w=JSON.parse(w)}catch{return null}}
  return w;
}
function render(r){
 const w=wpFromRequest(r);
 if(!w)return `<section class="safety-review"><div class="section-heading"><div><p class="eyebrow">Safety Review</p><h3>FR-125 Work Permit</h3></div></div><div class="privacy-note">ยังไม่มีข้อมูล FR-125 ในคำขอนี้ / No FR-125 data is stored for this request.</div></section>`;
 return `<section class="safety-review">
 <div class="section-heading"><div><p class="eyebrow">Safety Review</p><h3>FR-125 Work Permit Review</h3></div><span class="status-note">Section 1</span></div>
 <div class="safety-grid">
 <div><span>Permit Type</span><strong>${esc(w.permitType)}</strong></div><div><span>Type of Work</span><strong>${esc(w.workType)}</strong></div>
 <div><span>Work Time</span><strong>${esc(w.startTime)} – ${esc(w.endTime)}</strong></div><div><span>Area</span><strong>${esc(w.area)}</strong></div>
 <div class="wide"><span>Work Description</span><strong>${esc(w.description||w.objective)}</strong></div>
 <div><span>Permit Requester</span><strong>${esc(w.requester)}</strong><small>${esc(w.requesterCompany)}</small></div>
 <div><span>Contractor Job Controller</span><strong>${esc(w.contractor)}</strong><small>${esc(w.contractorPhone)}</small></div>
 <div><span>Job Owner / TIDC</span><strong>${esc(w.jobOwner)}</strong><small>${esc(w.jobOwnerPhone)}</small></div>
 <div><span>Supporting Documents</span><strong>${esc((w.docs||[]).join(", "))}</strong></div>
 <div class="wide"><span>Tools / Equipment</span><strong>${esc(w.tools)}</strong></div><div class="wide"><span>PPE</span><strong>${esc(w.ppe)}</strong></div>
 </div>
 <div class="safety-comment"><label>Safety Comment / ความเห็น Safety<textarea id="safety-review-comment" placeholder="ระบุข้อสังเกตหรือเหตุผลที่ส่งกลับแก้ไข"></textarea></label></div>
 <div class="detail-actions"><button type="button" id="safety-preview-fr125" class="button button--secondary">Preview FR-125</button><button type="button" id="safety-return" class="button button--danger">Return for Revision / ส่งกลับแก้ไข</button><button type="button" id="safety-approve" class="button button--success">Safety Approve / ผ่าน Safety</button></div>
 </section>`;
}
function inject(){
 const drawer=document.querySelector("#detail-content"); if(!drawer)return;
 const reqCode=drawer.querySelector(".eyebrow")?.textContent?.trim(); if(!reqCode)return;
 const row=[...document.querySelectorAll("#request-table-body tr[data-id]")].find(x=>x.querySelector("strong")?.textContent?.trim()===reqCode);
 if(!row)return;
 const id=row.dataset.id;
 const r=window.__accessRequests?.find?.(x=>String(x.id)===String(id));
 if(!r)return;
 drawer.querySelector(".safety-review")?.remove();
 const actions=drawer.querySelector(".detail-actions");
 (actions||drawer).insertAdjacentHTML(actions?"beforebegin":"beforeend",render(r));
}
const observer=new MutationObserver(()=>setTimeout(inject,0)); observer.observe(detail,{subtree:true,childList:true});
const style=document.createElement("style");style.textContent=`.safety-review{margin-top:22px;border-top:1px solid #eaecf0;padding-top:20px}.safety-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.safety-grid>div{border:1px solid #eaecf0;border-radius:8px;padding:10px}.safety-grid span{display:block;font-size:12px;color:#667085}.safety-grid strong,.safety-grid small{display:block;margin-top:4px}.safety-grid .wide{grid-column:1/-1}.safety-comment{margin-top:14px}@media(max-width:800px){.safety-grid{grid-template-columns:1fr}.safety-grid .wide{grid-column:auto}}`;document.head.appendChild(style);
})();