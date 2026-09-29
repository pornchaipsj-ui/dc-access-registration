(() => {
"use strict";
const root=document.querySelector("#fr125-original-form");
if(!root)return;
const e=s=>document.getElementById(s);
root.innerHTML=`
<div class="fr125-sheet">
 <div class="fr125-title-row"><div><b>ใบขออนุญาตปฏิบัติงาน</b><br><b>(Work Permit)</b></div><div>Work Permit No. <input id="wp-number"><br>เขียนเมื่อวันที่ <input id="wp-written-date" type="date"></div></div>
 <div class="fr125-note">หมายเหตุ : Work Permit ใช้งานวัน/วัน มีอายุไม่เกิน 1 กะการทำงาน ต้องขออนุญาตก่อนเข้าทำงานอย่างน้อย 1 วัน</div>
 <div class="fr125-checks permit-types">
  <label><input type="radio" name="wp-permit-type" value="งานทั่วไป" required> งานทั่วไป</label>
  <label><input type="radio" name="wp-permit-type" value="งานในพื้นที่อับอากาศ"> งานในพื้นที่อับอากาศ</label>
  <label><input type="radio" name="wp-permit-type" value="งานบนที่สูง > 1.8 m."> งานบนที่สูง &gt; 1.8 m.</label>
  <label><input type="radio" name="wp-permit-type" value="งานขุด"> งานขุด</label>
  <label><input type="radio" name="wp-permit-type" value="งานที่เกี่ยวข้องกับรังสี"> งานที่เกี่ยวข้องกับรังสี</label>
  <label><input type="radio" name="wp-permit-type" value="Hot Work"> Hot Work</label>
  <label><input type="radio" name="wp-permit-type" value="งานยก (Mobile Crane)"> งานยก (Mobile Crane)</label>
  <label><input type="radio" name="wp-permit-type" value="งานไฟฟ้า"> งานไฟฟ้า</label>
  <label><input type="radio" name="wp-permit-type" value="อื่นๆ"> อื่นๆ <input id="wp-permit-other"></label>
 </div>
 <div class="fr125-section-title">1. การขออนุญาตปฏิบัติงาน : Work Permit Requisition <span>(ส่วนที่ 1 โดย Permit Requester)</span></div>
 <div class="fr125-line">ขออนุญาตเข้าปฏิบัติงานวันที่ <input id="wp-work-date" type="date" required> เริ่มต้นเวลา <input id="wp-start-time" type="time" required> ถึงเวลา <input id="wp-end-time" type="time" required></div>
 <div class="fr125-line">1.1 มีความประสงค์จะขออนุญาตปฏิบัติงาน <input id="wp-description" class="grow" required></div>
 <div class="fr125-line">ชื่ออุปกรณ์ <input id="wp-equipment" class="grow"> พื้นที่ <input id="wp-area" class="medium"></div>
 <div class="fr125-line"><b>ประเภทของงาน :</b></div>
 <div class="fr125-checks work-types">
  <label><input type="radio" name="wp-work-type" value="งานก่อสร้าง" required> งานก่อสร้าง</label>
  <label><input type="radio" name="wp-work-type" value="ระบบภายในอาคาร"> ระบบภายในอาคาร</label>
  <label><input type="radio" name="wp-work-type" value="งานจัดการอาคาร"> งานจัดการอาคาร</label>
  <label><input type="radio" name="wp-work-type" value="งานซ่อมบำรุง"> งานซ่อมบำรุง</label>
  <label><input type="radio" name="wp-work-type" value="Security"> Security</label>
  <label><input type="radio" name="wp-work-type" value="อื่นๆ"> อื่นๆ <input id="wp-work-other"></label>
 </div>
 <div class="fr125-line">ทะเบียนรถที่นำเข้าอาคาร <input id="wp-car-license" class="grow"></div>
 <div class="fr125-line">1.2 Permit Requester (ชื่อ-สกุล) <input id="wp-requester-name" class="medium" required> โทรศัพท์ <input id="wp-requester-phone"> บริษัท <input id="wp-requester-company" class="medium" required></div>
 <div class="fr125-line">1.3 เจ้าของงาน/ TIDC Job Controller (ชื่อ-สกุล) <input id="wp-job-owner" class="medium"> โทรศัพท์ <input id="wp-job-owner-phone"> บริษัท <input id="wp-job-owner-company" class="medium"></div>
 <div class="fr125-line">1.4 Contractor Job Controller (ชื่อ-สกุล) <input id="wp-contractor-controller" class="medium" required> โทรศัพท์ <input id="wp-contractor-phone" required> บริษัท <input id="wp-contractor-company" class="medium" required></div>
 <div class="fr125-line"><b>1.5 เอกสารประกอบการขออนุญาต (เอกสารแนบ)</b></div>
 <div class="fr125-checks docs">
  <label><input id="wp-jsa" type="checkbox"> การวิเคราะห์งานเพื่อความปลอดภัยและสิ่งแวดล้อม (JSA)</label>
  <label><input id="wp-supervisor-cert" type="checkbox"> Cer. จป.ตั้งแต่ระดับหัวหน้างานขึ้นไปอย่างใดอย่างหนึ่ง (กรณี Contractor Job Controller)</label>
  <label><input id="wp-personnel" type="checkbox"> รายชื่อผู้ปฏิบัติงาน จำนวน <input id="wp-person-count" type="number" min="0"> คน</label>
  <label><input id="wp-risk-checklist" type="checkbox"> แบบตรวจความปลอดภัยตามประเภทงานเสี่ยง</label>
  <label><input id="wp-tools-list" type="checkbox"> รายการแสดงเครื่องมือ/อุปกรณ์</label>
  <label><input id="wp-sds" type="checkbox"> Safety Data Sheet: SDS (ถ้ามี) <input id="wp-sds-detail"></label>
 </div>
 <div class="fr125-line"><b>1.6.1 PPE พื้นฐาน ต้องมีเป็นอย่างน้อย</b>　☐ หมวกนิรภัยพร้อมสายรัดคาง　☐ รองเท้านิรภัย</div>
 <div class="fr125-line"><b>1.6.2 PPE ตามความเสี่ยง :</b></div>
 <div class="fr125-checks ppe">
  <label><input type="checkbox" value="อุปกรณ์ป้องกันศีรษะ"> อุปกรณ์ป้องกันศีรษะ</label><label><input type="checkbox" value="อุปกรณ์ป้องกันเสียง"> อุปกรณ์ป้องกันเสียง</label><label><input type="checkbox" value="อุปกรณ์ป้องกันเท้า"> อุปกรณ์ป้องกันเท้า</label>
  <label><input type="checkbox" value="อุปกรณ์ป้องกันใบหน้าและดวงตา"> อุปกรณ์ป้องกันใบหน้าและดวงตา</label><label><input type="checkbox" value="อุปกรณ์ป้องกันการหายใจ"> อุปกรณ์ป้องกันการหายใจ</label><label><input type="checkbox" value="อุปกรณ์ป้องกันการตกจากที่สูง"> อุปกรณ์ป้องกันการตกจากที่สูง</label>
  <label><input type="checkbox" value="อุปกรณ์ป้องกันมือ"> อุปกรณ์ป้องกันมือ</label><label><input type="checkbox" value="อุปกรณ์ป้องกันลำตัว"> อุปกรณ์ป้องกันลำตัว</label>
 </div>
 <div class="fr125-line">1.7 ลงชื่อผู้ตรวจสอบความครบถ้วนและมาตรการขออนุญาตปฏิบัติงาน <input class="grow" id="wp-requester-sign"> (Permit Requester)</div>
 <div class="fr125-warning">หมายเหตุ : Contractor จะต้องเป็นผู้รับผิดชอบต่อเหตุการณ์ที่เกิดขึ้นระหว่างการทำงาน และแจ้งผู้ตรวจสอบงาน/ ผู้อนุมัติ รับทราบทันที โทรศัพท์ 064-7025197, 0638408622</div>
 <div class="fr125-locked"><b>2. การอนุญาตปฏิบัติงาน : Permit Initial Approval</b> (ส่วนที่ 2 โดย Permit Approver)<br><small>ส่วนนี้ให้ผู้อนุมัติกรอกในขั้นตอน Safety / Approval — ไม่เปิดให้ Permit Requester แก้ไข</small></div>
 <div class="fr125-locked"><b>3. การรับรองความปลอดภัยหน้างาน : On Field Permit Verify</b> (ส่วนที่ 3 โดย Permit Requester, Field Approver, Job Controller)<br><small>ดำเนินการที่หน้างานหลังได้รับอนุมัติ</small></div>
 <div class="fr125-footer">Effective date: 28/11/2025　　Internal Use Only　　FR-125-v03</div>
</div>`;

function radio(name){return document.querySelector(`input[name="${name}"]:checked`)?.value||""}
function val(id){return e(id)?.value?.trim()||""}
function sync(){
 if(e("wp-work-date")&&!e("wp-work-date").value)e("wp-work-date").value=e("visit-date")?.value||"";
 if(e("wp-area"))e("wp-area").value=e("room")?.value||e("wp-area").value;
 if(e("wp-description")&&!e("wp-description").value)e("wp-description").value=e("objective")?.value||"";
 if(e("wp-requester-name"))e("wp-requester-name").value=e("requester-name")?.value||e("wp-requester-name").value;
 if(e("wp-requester-phone"))e("wp-requester-phone").value=e("requester-phone")?.value||e("wp-requester-phone").value;
 if(e("wp-requester-company"))e("wp-requester-company").value=e("requester-company")?.value||e("wp-requester-company").value;
 if(e("wp-job-owner")&&!e("wp-job-owner").value)e("wp-job-owner").value=e("host-name")?.value||"";
 if(e("wp-job-owner-phone")&&!e("wp-job-owner-phone").value)e("wp-job-owner-phone").value=e("host-phone")?.value||"";
}
["visit-date","room","objective","requester-name","requester-phone","requester-company","host-name","host-phone"].forEach(id=>e(id)?.addEventListener("change",sync));
document.querySelector("#work-area-picker")?.addEventListener("change",()=>setTimeout(sync,0));
sync();

function collect(){
 sync();
 return {number:val("wp-number"),writtenDate:val("wp-written-date"),startDate:val("wp-work-date"),endDate:e("visit-end-date")?.value||"",startTime:val("wp-start-time"),endTime:val("wp-end-time"),permitType:radio("wp-permit-type"),workType:radio("wp-work-type"),description:val("wp-description"),equipment:val("wp-equipment"),area:val("wp-area"),carLicense:val("wp-car-license"),requester:val("wp-requester-name"),requesterPhone:val("wp-requester-phone"),requesterCompany:val("wp-requester-company"),jobOwner:val("wp-job-owner"),jobOwnerPhone:val("wp-job-owner-phone"),jobOwnerCompany:val("wp-job-owner-company"),contractor:val("wp-contractor-controller"),contractorPhone:val("wp-contractor-phone"),contractorCompany:val("wp-contractor-company"),docs:[["wp-jsa","JSA"],["wp-supervisor-cert","Cer. จป."],["wp-personnel","รายชื่อผู้ปฏิบัติงาน"],["wp-risk-checklist","แบบตรวจความปลอดภัยตามประเภทงานเสี่ยง"],["wp-tools-list","รายการเครื่องมือ/อุปกรณ์"],["wp-sds","SDS"]].filter(x=>e(x[0])?.checked).map(x=>x[1]),ppe:[...root.querySelectorAll(".ppe input[type=checkbox]:checked")].map(x=>x.value),tools:""};
}
function valid(){sync();for(const x of root.querySelectorAll("[required]"))if(!x.checkValidity()){x.reportValidity();return false}return true}
function preview(printNow=false){if(!valid())return;const w=window.open("","_blank");if(!w)return alert("Please allow pop-ups.");w.document.write("<!doctype html><meta charset=utf-8><title>FR-125-v03 (TH)</title>"+document.querySelector("style[data-fr125-style]").outerHTML+root.innerHTML);w.document.close();if(printNow)setTimeout(()=>w.print(),400)}
window.WorkPermitForm={collect,validate:valid,preview:()=>preview(false),print:()=>preview(true)};
e("wp-preview")?.addEventListener("click",()=>preview(false));e("wp-print")?.addEventListener("click",()=>preview(true));

const st=document.createElement("style");st.dataset.fr125Style="1";st.textContent=`
.fr125-original-form{overflow:auto;background:#eef1f5;padding:16px;border-radius:12px}.fr125-sheet{width:100%;max-width:1040px;min-width:900px;margin:auto;background:#fff;color:#111;border:1px solid #111;font-family:Arial,"Noto Sans Thai",sans-serif;font-size:12px;line-height:1.25;box-shadow:0 4px 18px #0002}.fr125-title-row{display:grid;grid-template-columns:70% 30%;text-align:center;font-size:15px}.fr125-title-row>div{border-bottom:1px solid #111;padding:8px}.fr125-title-row>div+div{border-left:1px solid #111;text-align:left;font-size:11px}.fr125-note{color:#e31b23;text-align:center;border-bottom:1px solid #111;padding:4px}.fr125-section-title{font-weight:700;border-top:1px solid #111;border-bottom:1px solid #111;padding:5px}.fr125-section-title span{color:#1546d8}.fr125-line{padding:5px 6px;border-bottom:1px solid #bbb}.fr125-checks{display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid #111;padding:4px 6px;gap:3px 10px}.fr125-checks label{display:flex!important;flex-direction:row!important;align-items:center;gap:4px;margin:0!important;font-size:11px}.fr125-sheet input:not([type=radio]):not([type=checkbox]){border:0;border-bottom:1px dotted #333;border-radius:0;background:#fffbe6;padding:1px 3px;height:22px;min-width:90px}.fr125-sheet input[type=radio],.fr125-sheet input[type=checkbox]{width:13px;height:13px;margin:0}.fr125-sheet input.grow{width:65%}.fr125-sheet input.medium{width:180px}.fr125-warning{padding:5px 6px;border-bottom:1px solid #111;font-size:10px}.fr125-locked{padding:8px 6px;border-bottom:1px solid #111;background:#f6f7f9}.fr125-locked small{color:#667085}.fr125-footer{padding:8px 6px;text-align:center;font-size:11px}.wp-actions{justify-content:flex-end}@media print{body{margin:0}.fr125-original-form{padding:0;background:#fff}.fr125-sheet{box-shadow:none;border:1px solid #111;max-width:none;min-width:0;width:100%}.wp-actions{display:none}}`;document.head.appendChild(st);
})();