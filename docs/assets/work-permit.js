(() => {
"use strict";
const byId=id=>document.getElementById(id), val=id=>byId(id)?.value?.trim()||"";
if(!byId("work-permit-section")) return;
let workPermitNo="", attendees=[];
function setText(id,v){const e=byId(id);if(e)e.textContent=v||"-"}
function sync(){
  setText("wp-auto-date",val("visit-date"));
  setText("wp-auto-area",val("room"));
  setText("wp-auto-requester",[val("requester-name"),val("requester-company")].filter(Boolean).join(" / "));
  setText("wp-rq-name",val("requester-name")); setText("wp-rq-phone",val("requester-phone")); setText("wp-rq-company",val("requester-company")); setText("wp-rq-dept",val("requester-department"));
  setText("wp-owner-name",val("host-name")); setText("wp-owner-phone",val("host-phone"));
}
["visit-date","room","requester-name","requester-company","objective","host-name","host-phone"].forEach(id=>byId(id)?.addEventListener("input",sync));
document.querySelector("#work-area-picker")?.addEventListener("change",()=>setTimeout(sync,0)); sync();
function syncAttendees(list=[]){attendees=list;setText("wp-personnel-count",list.length+" คน")}
async function runNumber(){
  if(workPermitNo)return workPermitNo;
  const btn=byId("wp-run-number"); btn.disabled=true; btn.textContent="กำลังรันเลข…";
  try{
    if(window.AccessApp?.demoMode) workPermitNo="WP-DEMO-"+Date.now().toString().slice(-6);
    else{
      const client=await window.AccessApp.getClient();
      const {data,error}=await client.rpc("reserve_work_permit_no");
      if(error)throw error; workPermitNo=String(data||"");
    }
    setText("wp-number-display",workPermitNo); btn.textContent=workPermitNo; return workPermitNo;
  }catch(e){btn.textContent="Run Work Permit No. / รันเลข Work Permit";alert(e.message||"ไม่สามารถรันเลข Work Permit ได้");throw e}
  finally{btn.disabled=false}
}
function collect(){
  sync();
  const cars=[...new Set(attendees.map(x=>String(x.car_license||"").trim()).filter(Boolean))].slice(0,4);
  return {
    workPermitNo,
    startDate:val("visit-date"), endDate:val("visit-end-date"),
    startTime:val("wp-start-time"), endTime:val("wp-end-time"),
    permitTypes:[...document.querySelectorAll('input[name="wp-permit-type"]:checked')].map(e=>e.value), workTypes:[...document.querySelectorAll('input[name="wp-work-type"]:checked')].map(e=>e.value),
    description:val("objective"), equipment:val("wp-equipment"), area:val("room"),
    carLicense:cars.join(" / "),
    requester:val("requester-name"), requesterPhone:val("requester-phone"), requesterCompany:val("requester-company"),
    jobOwner:val("host-name"), jobOwnerPhone:val("host-phone"),
    contractor:val("wp-contractor-controller"), contractorPhone:val("wp-contractor-phone"),
    contractorCompany:val("wp-contractor-company"), contractorDepartment:val("wp-contractor-department"),
    ppe:[["wp-ppe-helmet","หมวกนิรภัยพร้อมสายรัดคาง"],["wp-ppe-shoes","รองเท้านิรภัย"],["wp-ppe-head","ป้องกันศีรษะ"],["wp-ppe-hearing","ป้องกันการได้ยิน"],["wp-ppe-foot","ป้องกันเท้า"],["wp-ppe-eye","ใบหน้าและดวงตา"],["wp-ppe-respiratory","ระบบหายใจ"],["wp-ppe-fall","ป้องกันการตก"],["wp-ppe-hand","ป้องกันมือ"],["wp-ppe-body","ป้องกันร่างกาย"]].filter(x=>byId(x[0])?.checked).map(x=>x[1]),
    requesterConfirmed:!!byId("wp-requester-confirm")?.checked,
    personnelCount:attendees.length,
    ppeNotes:{head:val("wp-ppe-head-note"),hearing:val("wp-ppe-hearing-note"),foot:val("wp-ppe-foot-note"),eye:val("wp-ppe-eye-note"),respiratory:val("wp-ppe-respiratory-note"),fall:val("wp-ppe-fall-note"),hand:val("wp-ppe-hand-note"),body:val("wp-ppe-body-note")},
    docs:[["wp-jsa","JSA"],["wp-supervisor-cert","Cer. จป."],["wp-personnel","รายชื่อผู้ปฏิบัติงาน"],["wp-risk-checklist","แบบตรวจความปลอดภัยตามประเภทงานเสี่ยง"],["wp-tools-list","รายการเครื่องมือ/อุปกรณ์"],["wp-sds","SDS"]].filter(x=>byId(x[0])?.checked).map(x=>x[1])
  };
}
function validate(){
  if(!workPermitNo){alert("กรุณากด Run Work Permit No. ก่อน Submit");byId("wp-run-number")?.focus();return false}
  if(!document.querySelector('input[name="wp-permit-type"]:checked')){alert("กรุณาเลือกประเภทใบอนุญาตอย่างน้อย 1 ประเภท");return false}
  if(!document.querySelector('input[name="wp-work-type"]:checked')){alert("กรุณาเลือกประเภทของงานอย่างน้อย 1 ประเภท");return false}
  for(const id of ["wp-start-time","wp-end-time","wp-contractor-controller","wp-contractor-phone","wp-contractor-company"]){
    if(!val(id)){byId(id)?.focus();alert("กรุณากรอกข้อมูล Work Permit ให้ครบ");return false}
  }
  if(!byId("wp-requester-confirm")?.checked){byId("wp-requester-confirm")?.focus();alert("กรุณายืนยันข้อมูล Permit Requester ในข้อ 1.7");return false}
  return true;
}
byId("wp-run-number")?.addEventListener("click",runNumber);
function previewHtml(){
 const d=collect(),w=window.open("","_blank"); if(!w){alert("Browser บล็อก Preview");return}
 const e=s=>String(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
 const f=s=>'<span class="f">'+e(s)+'</span>', m=(v,a)=>(a||[]).includes(v)?"☒":"☐", o=v=>d.workType===v?"☒":"☐", q=v=>(d.docs||[]).includes(v)?"☒":"☐";
 const today=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Bangkok"}).format(new Date());
 const permit=["งานทั่วไป","งานในพื้นที่อับอากาศ","งานบนที่สูง > 1.8 m.","งานขุด","งานที่เกี่ยวข้องกับรังสี","Hot Work","งานยก (Mobile Crane)","งานไฟฟ้า","อื่นๆ"].map(x=>'<div class="ck">'+m(x,d.permitTypes)+' '+e(x)+'</div>').join("");
 const work=["งานก่อสร้าง","ระบบภายในอาคาร","งานจัดการอาคาร","งานซ่อมบำรุง","Security","อื่นๆ"].map(x=>'<div class="ck">'+m(x,d.workTypes)+' '+e(x)+'</div>').join("");
 const docs=[["JSA","การวิเคราะห์งานเพื่อความปลอดภัยและสิ่งแวดล้อม (JSA)"],["Cer. จป.","Cer. จป. ตั้งแต่ระดับหัวหน้างานขึ้นไป"],["รายชื่อผู้ปฏิบัติงาน","รายชื่อผู้ปฏิบัติงาน"],["แบบตรวจความปลอดภัยตามประเภทงานเสี่ยง","แบบตรวจความปลอดภัยตามประเภทงานเสี่ยง"],["รายการเครื่องมือ/อุปกรณ์","รายการแสดงเครื่องมือ/อุปกรณ์"],["SDS","Safety Data Sheet: SDS (ถ้ามี)"]].map(x=>'<div class="ck">'+q(x[0])+' '+x[1]+'</div>').join("");
 const css='@page{size:A4;margin:7mm}*{box-sizing:border-box}body{margin:0;background:#ddd;font:10px Tahoma,Arial,sans-serif}.p{width:210mm;min-height:297mm;margin:8px auto;background:#fff;padding:7mm;page-break-after:always}.p:last-of-type{page-break-after:auto}h1{font-size:18px}.top{border:1.4px solid;display:grid;grid-template-columns:2.2fr 1fr}.top>div{padding:6px}.dn{text-align:center;font-size:14px;font-weight:bold;border-right:1px solid}.dn small{display:block;margin-top:5px}.note{text-align:center;border:1px solid;border-top:0;padding:4px;color:#b33}.grid9,.grid6,.docs{display:grid;gap:5px 12px}.grid9{grid-template-columns:repeat(5,1fr);border:1px solid;border-top:0;padding:7px}.grid6{grid-template-columns:repeat(3,1fr)}.docs{grid-template-columns:1fr 1fr}.s{border:1px solid;border-top:0;padding:6px}.s h3{margin:0 0 7px;font-size:11px}.r{display:grid;gap:8px;margin:6px 0}.r3{grid-template-columns:1.2fr .7fr .7fr}.r2{grid-template-columns:1fr 1fr}.r4{grid-template-columns:1.2fr .7fr 1fr .8fr}.f{display:inline-block;min-width:60px;border-bottom:1px dotted;padding:0 3px;font-weight:bold}.ck{line-height:1.6}.sub{font-weight:bold;margin:8px 0 4px}.sig{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.sig div{height:58px;border:1px solid #777;text-align:center;padding:5px}.sec{border:1px solid;padding:7px;margin-bottom:7px}.mon{height:95px;border:1px solid #777}.pb{position:fixed;right:18px;bottom:18px}.pb button{padding:10px 18px}@media print{body{background:#fff}.p{margin:0;padding:0;width:auto;min-height:auto}.pb{display:none}}';
 const h='<!doctype html><html lang="th"><head><meta charset="utf-8"><title>'+e(d.workPermitNo||"FR-125")+'</title><style>'+css+'</style></head><body><div class="pb"><button onclick="print()">Print / Save PDF</button></div>'+
 '<div class="p"><h1>ใบขออนุญาตปฏิบัติงาน (Work Permit)</h1><div class="top"><div class="dn">ใบขออนุญาตปฏิบัติงาน<small>(Work Permit)</small></div><div>Work Permit No. '+f(d.workPermitNo)+'<br><br>เขียนเมื่อวันที่ '+f(today)+'</div></div><div class="note">หมายเหตุ : Work Permit ใช้งานวัน/วัน มีอายุไม่เกิน 1 กะการทำงาน ต้องขออนุญาตก่อนเข้าทำงานอย่างน้อย 1 วัน</div><div class="grid9">'+permit+'</div>'+
 '<div class="s"><h3>1. การขออนุญาตปฏิบัติงาน : Work Permit Requisition (ส่วนที่ 1 โดย Permit Requester)</h3><div class="r r3"><div>ขออนุญาตเข้าปฏิบัติงานวันที่ '+f(d.startDate)+'</div><div>เริ่มต้นเวลา '+f(d.startTime)+'</div><div>ถึงเวลา '+f(d.endTime)+'</div></div><div>1.1 มีความประสงค์จะขออนุญาตปฏิบัติงาน '+f(d.description)+'</div><div class="r r2"><div>ชื่ออุปกรณ์ '+f(d.equipment)+'</div><div>พื้นที่ '+f(d.area)+'</div></div><div class="sub">ประเภทของงาน :</div><div class="grid6">'+work+'</div><div class="sub">ทะเบียนรถที่นำเข้าอาคาร '+f(d.carLicense)+'</div>'+
 '<div class="r r4"><div>1.2 Permit Requester '+f(d.requester)+'</div><div>โทรศัพท์ '+f(d.requesterPhone)+'</div><div>บริษัท '+f(d.requesterCompany)+'</div><div>หน่วยงาน '+f("")+'</div></div><div class="r r4"><div>1.3 เจ้าของงาน/TIDC Job Controller '+f(d.jobOwner)+'</div><div>โทรศัพท์ '+f(d.jobOwnerPhone)+'</div><div>บริษัท '+f("")+'</div><div>หน่วยงาน '+f("")+'</div></div><div class="r r4"><div>1.4 Contractor Job Controller '+f(d.contractor)+'</div><div>โทรศัพท์ '+f(d.contractorPhone)+'</div><div>บริษัท '+f(d.contractorCompany)+'</div><div>หน่วยงาน '+f(d.contractorDepartment)+'</div></div>'+
 '<div class="sub">1.5 เอกสารประกอบการขออนุญาต (เอกสารแนบ)</div><div class="docs">'+docs+'</div><div class="sub">1.6 PPE พื้นฐาน ต้องมีเป็นอย่างน้อย</div><div>☐ หมวกนิรภัยพร้อมสายรัดคาง &nbsp; ☐ รองเท้านิรภัย &nbsp; PPE ตามความเสี่ยง: ศีรษะ / การได้ยิน / เท้า / ใบหน้าและดวงตา / ระบบหายใจ / ป้องกันการตก / มือ / ร่างกาย</div><div class="sub">1.7 Permit Requester</div><div class="sig"><div>Permit Requester<br><br>Sign / Date / Time</div><div>Document Check<br><br>Sign / Date / Time</div><div>Remark</div></div></div></div>'+
 '<div class="p"><h1>ใบขออนุญาตปฏิบัติงาน (Work Permit) — '+e(d.workPermitNo)+'</h1><div class="sec"><h3>2. Permit Initial Approval</h3>☐ Disable Smoke Detector &nbsp; ☐ Barricade / Signs &nbsp; ☐ Cover Openings &nbsp; ☐ LOTO &nbsp; ☐ Gas & Condition &nbsp; ☐ Other<div class="sub">☐ Approve &nbsp; ☐ Work Not Approved</div><div class="sig"><div>Permit Approver</div><div>Field Approver</div><div>TIDC EHS</div></div></div><div class="sec"><h3>3. On Field Permit Verify</h3><div class="sig"><div>Permit Requester</div><div>Field Approver</div><div>Job Controller</div></div></div><div class="sec"><h3>4. Safe Work Monitoring</h3><div>Inspect at least every 3 hours</div><div class="mon"></div><div class="sig"><div>Field Approver</div><div>Job Controller</div><div>TIDC EHS</div></div></div><div class="sec"><h3>5. Work Permit Extension</h3><div class="sig"><div>Permit Requester</div><div>Permit Approver</div><div>Field Approver / Job Controller</div></div></div><div class="sec"><h3>6. Work Permit Completion</h3>☐ Work Completed &nbsp; ☐ Area Safe & Restored<div class="sig"><div>Job Controller</div><div>Job Owner / TIDC Controller</div><div>Field Approver / FOC Team</div></div></div></div></body></html>';
 w.document.open();w.document.write(h);w.document.close();
}
byId("wp-preview")?.addEventListener("click",previewHtml);
const st=document.createElement("style");st.textContent=`
.wp-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:0 0 16px}.wp-summary>div,.wp-readonly-grid>div{padding:11px;border:1px solid #dbe3ec;border-radius:9px;background:#f8fafc}.wp-summary small,.wp-readonly-grid small{display:block;color:#64748b;margin-bottom:3px}.wp-summary strong,.wp-readonly-grid strong{word-break:break-word}.wp-card{border:1px solid #dbe3ec;border-radius:12px;padding:16px;margin:12px 0;background:#fff}.wp-card h3{margin:0 0 13px;font-size:1rem}.wp-card h3 span,.wp-group-title small{font-weight:400;color:#64748b;font-size:.82rem}.wp-permit-types{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px 14px;margin-bottom:15px}.wp-group-title{grid-column:1/-1;font-weight:700;margin-bottom:2px}.wp-permit-types label,.wp-doc-grid label,.wp-confirm{display:flex;align-items:center;gap:8px;font-weight:400}.wp-permit-types input,.wp-doc-grid input,.wp-confirm input{width:18px;height:18px;flex:0 0 18px}.wp-grid-4,.wp-readonly-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.wp-doc-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px 18px}.wp-type-work{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 12px}.wp-type-work>span{grid-column:1/-1;font-weight:700}.wp-type-work label{display:flex;gap:7px;align-items:center;font-weight:400}.wp-type-work input{width:18px;height:18px}.wp-inline-note{width:90px!important;min-width:60px;padding:4px 6px!important;height:28px!important;margin-left:auto}.wp-count{margin-left:auto;color:#64748b;font-size:.82rem}.form-hint{color:#64748b;font-size:.9rem;margin-top:10px}@media(max-width:900px){.wp-permit-types,.wp-doc-grid{grid-template-columns:repeat(2,1fr)}.wp-grid-4,.wp-readonly-grid,.wp-summary{grid-template-columns:repeat(2,1fr)}}@media(max-width:560px){.wp-permit-types,.wp-doc-grid,.wp-grid-4,.wp-readonly-grid,.wp-summary{grid-template-columns:1fr}}`;document.head.appendChild(st);
window.WorkPermitForm={collect,validate,runNumber,syncAttendees};
})();