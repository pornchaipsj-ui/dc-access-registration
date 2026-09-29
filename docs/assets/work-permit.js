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
}
["visit-date","room","requester-name","requester-company","objective","host-name","host-phone"].forEach(id=>byId(id)?.addEventListener("input",sync));
document.querySelector("#work-area-picker")?.addEventListener("change",()=>setTimeout(sync,0)); sync();
function syncAttendees(list=[]){attendees=list}
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
    permitType:val("wp-permit-type"), workType:val("wp-work-type"),
    description:val("objective"), equipment:val("wp-equipment"), area:val("room"),
    carLicense:cars.join(" / "),
    requester:val("requester-name"), requesterPhone:val("requester-phone"), requesterCompany:val("requester-company"),
    jobOwner:val("host-name"), jobOwnerPhone:val("host-phone"),
    contractor:val("wp-contractor-controller"), contractorPhone:val("wp-contractor-phone"),
    contractorCompany:val("wp-contractor-company"), contractorDepartment:val("wp-contractor-department"),
    docs:[["wp-jsa","JSA"],["wp-supervisor-cert","Cer. จป."],["wp-personnel","รายชื่อผู้ปฏิบัติงาน"],["wp-risk-checklist","แบบตรวจความปลอดภัยตามประเภทงานเสี่ยง"],["wp-tools-list","รายการเครื่องมือ/อุปกรณ์"],["wp-sds","SDS"]].filter(x=>byId(x[0])?.checked).map(x=>x[1])
  };
}
function validate(){
  if(!workPermitNo){alert("กรุณากด Run Work Permit No. ก่อน Submit");byId("wp-run-number")?.focus();return false}
  for(const id of ["wp-permit-type","wp-work-type","wp-start-time","wp-end-time","wp-contractor-controller","wp-contractor-phone","wp-contractor-company"]){
    if(!val(id)){byId(id)?.focus();alert("กรุณากรอกข้อมูล Work Permit ให้ครบ");return false}
  }
  return true;
}
byId("wp-run-number")?.addEventListener("click",runNumber);
byId("wp-preview")?.addEventListener("click",()=>{
  const url=new URL("./assets/FR-125-v03%20Work%20Permit-1.pdf",window.location.href).href;
  const w=window.open(url,"_blank");
  if(!w) window.location.href=url;
});
const st=document.createElement("style");st.textContent=`
.wp-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:0 0 18px}.wp-summary>div{padding:12px;border:1px solid #dbe3ec;border-radius:10px;background:#f8fafc}.wp-summary small{display:block;color:#64748b;margin-bottom:4px}.wp-summary strong{word-break:break-word}.wp-subsection{border-top:1px solid #e5e7eb;padding-top:12px}.wp-subsection h3{margin:0 0 10px}.wp-checks{display:flex;flex-wrap:wrap;gap:10px 22px;border:1px solid #dbe3ec;border-radius:10px;padding:14px}.wp-checks label{display:flex;align-items:center;gap:7px}.form-hint{color:#64748b;font-size:.9rem;margin-top:10px}@media(max-width:760px){.wp-summary{grid-template-columns:1fr 1fr}}`;document.head.appendChild(st);
window.WorkPermitForm={collect,validate,runNumber,syncAttendees};
})();