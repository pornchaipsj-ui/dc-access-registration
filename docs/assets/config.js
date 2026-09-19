window.APP_CONFIG = {
  APP_NAME: "Data Center Access Registration",
  // เปิด true เพื่อทดลองบนเครื่องเดียว ข้อมูลจะอยู่ใน localStorage เท่านั้น
  DEMO_MODE: false,
  // เปิด/ปิดการรับคำขอใหม่จากหน้าลงทะเบียนเท่านั้น
  // false = พักการลงทะเบียนชั่วคราว, true = เปิดรับลงทะเบียนตามปกติ
  REGISTRATION_ENABLED: true,
  // PIN สำหรับเปิดหน้าลงทะเบียน (เป็น client-side gate บน GitHub Pages)
  REGISTRATION_PIN: "200539",
  // หลังตั้งค่า Supabase แล้ว ให้เปลี่ยน DEMO_MODE เป็น false
  SUPABASE_URL: "https://eljumibyclgdhnrkoucm.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_GNPNDZAn-1DcX1VfMDwtYQ_5b4kpsEr",
  MAX_ATTENDEES: 100,
  MAX_FILE_SIZE_MB: 5,
  TIMEZONE: "Asia/Bangkok"
};
