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
async function previewFilledPdf(){
  const popup=window.open("","_blank");
  try{
    if(!window.PDFLib) throw new Error("PDF library not loaded");
    const data=collect(), url=new URL("./assets/FR-125-v03%20Work%20Permit-1.pdf",window.location.href).href;
    const bytes=await fetch(url).then(r=>{if(!r.ok)throw new Error("โหลด FR-125 ไม่สำเร็จ");return r.arrayBuffer()});
    const pdf=await PDFLib.PDFDocument.load(bytes), page=pdf.getPages()[0], {width:w,height:h}=page.getSize();
    const font=await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
    const text=(s,x,y,size=8)=>{if(!s)return;page.drawText(String(s),{x:w*x/100,y:h-h*y/100,size,font,color:PDFLib.rgb(0,0,0),maxWidth:w*.28})};
    const mark=(on,x,y)=>{if(on)page.drawText("X",{x:w*x/100,y:h-h*y/100,size:9,font})};
    text(data.workPermitNo,73,7.9,8);
    text(data.startDate,28,23.5,8); text(data.startTime,52,23.5,8); text(data.endTime,73,23.5,8);
    text(data.description,28,26.3,8); text(data.equipment,20,28.8,8); text(data.area,69,28.8,8);
    text(data.carLicense,25,34.5,8);
    text(data.requester,25,37.2,8); text(data.requesterPhone,54,37.2,8); text(data.requesterCompany,71,37.2,8);
    text(data.jobOwner,28,39.5,8); text(data.jobOwnerPhone,54,39.5,8);
    text(data.contractor,30,41.8,8); text(data.contractorPhone,54,41.8,8); text(data.contractorCompany,71,41.8,8);
    const permit={"งานทั่วไป":[8,16.7],"งานในพื้นที่อับอากาศ":[28,16.7],"งานบนที่สูง > 1.8 m.":[50,16.7],"งานขุด":[70,16.7],"งานที่เกี่ยวข้องกับรังสี":[83,16.7],"Hot Work":[8,19],"งานยก (Mobile Crane)":[28,19],"งานไฟฟ้า":[50,19],"อื่นๆ":[70,19]};
    if(permit[data.permitType])mark(true,...permit[data.permitType]);
    const wt={"งานก่อสร้าง":[15,31],"ระบบภายในอาคาร":[44,31],"งานจัดการอาคาร":[74,31],"งานซ่อมบำรุง":[15,33.2],"Security":[44,33.2],"อื่นๆ":[74,33.2]};
    if(wt[data.workType])mark(true,...wt[data.workType]);
    const dm={"JSA":[8.5,45.4],"Cer. จป.":[44.7,45.4],"รายชื่อผู้ปฏิบัติงาน":[8.5,47.7],"แบบตรวจความปลอดภัยตามประเภทงานเสี่ยง":[44.7,47.7],"รายการเครื่องมือ/อุปกรณ์":[8.5,50],"SDS":[44.7,50]};
    data.docs.forEach(d=>{if(dm[d])mark(true,...dm[d])});
    const out=await pdf.save(), blob=new Blob([out],{type:"application/pdf"}), blobUrl=URL.createObjectURL(blob);
    if(popup)popup.location.href=blobUrl;else window.location.href=blobUrl;
    setTimeout(()=>URL.revokeObjectURL(blobUrl),60000);
  }catch(e){if(popup)popup.close();alert(e.message||"สร้าง Preview FR-125 ไม่สำเร็จ")}
}
byId("wp-preview")?.addEventListener("click",previewFilledPdf);
const st=document.createElement("style");st.textContent=`
.wp-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:0 0 18px}.wp-summary>div{padding:12px;border:1px solid #dbe3ec;border-radius:10px;background:#f8fafc}.wp-summary small{display:block;color:#64748b;margin-bottom:4px}.wp-summary strong{word-break:break-word}.wp-subsection{border-top:1px solid #e5e7eb;padding-top:12px}.wp-subsection h3{margin:0 0 10px}.wp-checks{display:flex;flex-wrap:wrap;gap:10px 22px;border:1px solid #dbe3ec;border-radius:10px;padding:14px}.wp-checks label{display:flex;align-items:center;gap:7px}.form-hint{color:#64748b;font-size:.9rem;margin-top:10px}@media(max-width:760px){.wp-summary{grid-template-columns:1fr 1fr}}`;document.head.appendChild(st);
window.WorkPermitForm={collect,validate,runNumber,syncAttendees};
})();