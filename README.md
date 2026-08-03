# DC Access Registration — Separate Pages v2

ระบบแบ่งเป็น 3 URL โดยไม่มีเมนูเชื่อมถึงกัน:

- `/` หน้าลงทะเบียนสำหรับผู้ขอเข้าพื้นที่
- `/approve.html` หน้าผู้อนุมัติ
- `/admin.html` หน้า รปภ.

หน้า รปภ. บันทึกตามลำดับ Card No., เวลาเข้า, เวลาออก, เวลาแลกบัตร และเวลาคืนบัตร

> หมายเหตุ: การซ่อนลิงก์ไม่ใช่การควบคุมสิทธิ์จริง เมื่อเชื่อม Supabase ต้องแยกบัญชีและ Role ของ Approver กับ Security ด้วย RLS

# เริ่มใช้งานแบบง่ายบน Windows (ไม่ต้องติดตั้ง Python)

1. แตกไฟล์ ZIP ทั้งหมดก่อน
2. เข้าโฟลเดอร์ `dc-access-registration-upload-stafftemplate`
3. ดับเบิลคลิก `START-WEB.bat`
4. ระบบจะเปิดหน้า `http://localhost:8080/` อัตโนมัติ
5. หน้า รปภ./Admin อยู่ที่ `http://localhost:8080/admin.html`

ต้องเปิดหน้าต่างสีดำของ `START-WEB.bat` ค้างไว้ระหว่างทดลองใช้งาน กด `Ctrl+C` เพื่อหยุดระบบ

---

# Data Center Access Registration — StaffTemplate Upload

เว็บแอปสำหรับอัปโหลด `StaffTemplate.xlsx` และนำรายชื่อไปสร้างแบบฟอร์ม `FR-037.xlsx` โดยไม่ให้ผู้ยื่นคำขอกรอกเวลาเข้า–ออกล่วงหน้า

## Workflow

1. ผู้ขอเข้าพื้นที่กรอก Location, วันที่ตามแผน, Project, Objective และ Room
2. อัปโหลดไฟล์ `StaffTemplate.xlsx`
3. ระบบตรวจสอบหัวคอลัมน์และข้อมูล 1–25 รายชื่อ
4. ข้อมูลถูกส่งเป็นคำขอให้ รปภ. ตรวจสอบ
5. รปภ. บันทึก `Card no. TIDC`, `Time In` และ `Time Out` ของแต่ละคน
6. รปภ. ดาวน์โหลดหรือพิมพ์ FR-037 ที่กรอกข้อมูลแล้ว

## StaffTemplate ที่รองรับ

ระบบอ่านชีตชื่อ `Data` และต้องมีคอลัมน์ตามลำดับนี้:

1. COMPANY
2. ATTENDEE TYPE
3. NAME
4. MOBILE
5. EMAIL
6. CARD TYPE
7. ID
8. CAR LICENSE

รองรับ `ATTENDEE TYPE`: STAFF, STAFF-EMERGENCY, STAFF-TECHNICIAN, VENDOR, VISITOR

รองรับ `CARD TYPE`: ID, PASSPORT

## สิ่งที่เปลี่ยนจากเวอร์ชันเดิม

- ยกเลิกการกรอกรายชื่อทีละคนบนหน้าเว็บ
- ยกเลิกช่องเวลาเข้าและเวลาออกของผู้ยื่นคำขอ
- ใช้วันที่เข้าพื้นที่ตามแผนแบบ Date เท่านั้น
- รปภ. เป็นผู้บันทึก Card no. TIDC และเวลาเข้า–ออกจริงรายบุคคล
- FR-037 จะเว้นเวลาเป็นช่องว่างจนกว่า รปภ. จะบันทึก
- ไม่เก็บไฟล์ StaffTemplate ต้นฉบับไว้ในฐานข้อมูล เก็บเฉพาะชื่อไฟล์และข้อมูลที่ผ่านการตรวจสอบ

## ทดลองใช้งาน

ค่าเริ่มต้นใน `docs/assets/config.js` เป็น `DEMO_MODE: true` ข้อมูลจะอยู่ใน Local Storage ของ Browser เครื่องเดียว

- หน้า Upload: `http://localhost:8080/`
- หน้า รปภ.: `http://localhost:8080/admin.html`

ใน Demo mode ไม่ต้อง Login

## ตั้งค่าใช้งานจริงด้วย Supabase

### ระบบใหม่

1. สร้าง Supabase Project
2. เปิด SQL Editor และรัน `supabase/schema.sql`
3. ไปที่ Authentication > Users และสร้างบัญชีเจ้าหน้าที่
4. คัดลอก UUID ของ User แล้วรัน:

```sql
insert into public.admin_users (user_id, display_name)
values ('USER-UUID-HERE', 'Security Admin');
```

5. แก้ `docs/assets/config.js`:

```js
window.APP_CONFIG = {
  APP_NAME: "Data Center Access Registration",
  DEMO_MODE: false,
  SUPABASE_URL: "https://xxxxx.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-ANON-KEY",
  MAX_ATTENDEES: 25,
  MAX_FILE_SIZE_MB: 5,
  TIMEZONE: "Asia/Bangkok"
};
```

### เคยติดตั้งเวอร์ชันเดิมแล้ว

รัน `supabase/migration_v2.sql` ก่อน แล้วแทนที่ฟังก์ชัน `submit_access_request` ด้วยเวอร์ชันใน `supabase/schema.sql` ตามคำอธิบายในไฟล์ Migration

## Deploy GitHub Pages

1. สร้าง Repository และนำไฟล์ทั้งหมดขึ้น branch `main`
2. ไปที่ Settings > Pages
3. Source เลือก **GitHub Actions**
4. Push เข้า `main`
5. URL หน้า รปภ. คือ `<pages-url>/admin.html`

## การ Map ข้อมูลไป FR-037

| StaffTemplate / Web | FR-037 |
|---|---|
| Project Name | Project Name |
| NAME | Name |
| ID | Last 4 National ID / Passport |
| MOBILE | Mobile No |
| EMAIL | Email |
| ATTENDEE TYPE | Type |
| COMPANY | Company Name |
| รปภ. บันทึก | Card no. TIDC |
| Objective | Objective |
| Room | Room |
| รปภ. บันทึก | Time In |
| รปภ. บันทึก | Time Out |

`CAR LICENSE` แสดงใน Dashboard เพื่อให้ รปภ. ตรวจสอบรถ แต่ไม่มีคอลัมน์ใน FR-037 ฉบับนี้

## การคุ้มครองข้อมูล

- Browser อ่านไฟล์ Excel ฝั่งผู้ใช้ และไม่อัปโหลดไฟล์ต้นฉบับไปเก็บ
- ระบบส่งและเก็บเฉพาะ 4 ตัวท้ายของ ID / Passport พร้อมค่าแบบปกปิด
- จำกัดการอ่านและแก้ไขด้วย Supabase Auth + RLS
- ไม่ควรนำ Service Role Key ขึ้น GitHub
- ควรกำหนดระยะเวลาลบข้อมูลตามนโยบายองค์กร


## Approval view of Security records
ผู้อนุมัติสามารถเปิดคำขอที่อนุมัติแล้วหรือเสร็จสิ้น เพื่อดู Card No., เวลาเข้า, เวลาออก, เวลาแลกบัตร และเวลาคืนบัตรที่ รปภ. บันทึก โดยเป็นสิทธิ์ดูอย่างเดียวและไม่สามารถแก้ไขข้อมูลจากหน้า Approval ได้
