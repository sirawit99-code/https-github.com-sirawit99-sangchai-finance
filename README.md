# Sangchai Finance Control Center

Dashboard ตรวจสอบ Statement ของ KBANK, BBL และ KTB สำหรับผู้บริหาร ครอบคลุมเงินเข้า เงินออก ยอดคงเหลือ EDC คู่ค้า การกระทบยอด และ Audit Log

ข้อมูลตัวอย่างที่ติดมากับ Source Code ครอบคลุม **1 มกราคม–30 กันยายน 2569** ส่วนข้อมูลที่ผู้ใช้บันทึกผ่านหน้าเว็บและไฟล์หลักฐานที่อัปโหลดจริงเก็บในฐานข้อมูล/พื้นที่ไฟล์ของระบบ Hosting

## เปิดใน Codex เครื่องใหม่

### สิ่งที่ต้องมี

- Codex Desktop
- Git
- Node.js 22.13 ขึ้นไป
- npm
- สิทธิ์อ่าน GitHub repository นี้
- หากต้องแก้เว็บออนไลน์เดิม: บัญชี Codex ที่มีสิทธิ์ Editor/Owner ของ Sites project

### ติดตั้งแบบเร็ว

```bash
git clone --branch sites-dashboard-portable --single-branch https://github.com/sirawit99-code/https-github.com-sirawit99-sangchai-finance.git
cd https-github.com-sirawit99-sangchai-finance
npm run setup:codex
npm run dev
```

เปิด `http://localhost:3000`

หาก Clone ไว้แล้ว:

```bash
git pull
npm run setup:codex
```

`setup:codex` จะตรวจเวอร์ชัน Node, ติดตั้ง dependency ด้วย `npm ci`, ตรวจไฟล์สำคัญ, lint, test และ build ให้ครบ

## คำสั่งสำคัญ

```bash
npm run doctor       # ตรวจว่าเครื่องพร้อมและข้อมูลหลักครบ
npm run dev          # เปิด Dashboard สำหรับพัฒนา
npm run lint         # ตรวจโค้ด
npm test             # Build และทดสอบระบบ
npm run build        # สร้าง production build
npm run setup:codex  # เตรียมเครื่องใหม่แบบครบชุด
```

## โครงสร้างข้อมูล

- `public/dashboard-data.json` — Snapshot รายการและยอดสรุปที่ Dashboard ใช้
- `public/sangchai-finance-dashboard.pdf` — รายงาน PDF ล่าสุด
- `app/api/` — API สำหรับทะเบียนไฟล์ คู่ค้า Audit Log และสถานะกระทบยอด
- `scripts/` — ตัวนำเข้า Statement และเครื่องมือจัดทำรายงาน
- `.openai/hosting.json` — Binding ของ Sites: ฐานข้อมูล `DB` และพื้นที่ไฟล์ `FILES`
- `PROJECT_CONTEXT.md` — กติกาทางบัญชี ข้อจำกัด และบริบทสำหรับ Codex เครื่องใหม่

## ฐานข้อมูลและไฟล์อัปโหลด

เมื่อ Run ในเครื่องใหม่ ระบบ local จะสร้าง D1/R2 จำลองไว้ใน `.wrangler/` โดยอัตโนมัติ ข้อมูลตั้งต้นจะถูก Seed จากโค้ด แต่ข้อมูลต่อไปนี้ **ไม่ได้เดินทางมากับ Git**:

- การแก้ไข/ยืนยันฐานข้อมูลคู่ค้าในระบบออนไลน์
- Audit Log ที่เกิดหลังใช้งานจริง
- สถานะกระทบยอดที่ผู้บริหารบันทึก
- ไฟล์ PDF/XLS ที่ผู้ใช้อัปโหลดเข้า R2

การทำงานกับเว็บเดิมต้องใช้ Sites project ID ใน `.openai/hosting.json` และบัญชีที่ได้รับสิทธิ์ใน Project เดิม หากสร้าง Project ใหม่ ต้อง Export/Import D1 และคัดลอก R2 แยกต่างหาก

## ความปลอดภัย

- ห้าม Commit Statement ต้นฉบับ รหัสเปิด PDF ไฟล์ `.env` หรือข้อมูลรับรองระบบ
- Statement ต้นฉบับควรเก็บในพื้นที่เข้ารหัสหรือ Cloud Storage ที่กำหนดสิทธิ์
- ไฟล์ `.env.example` มีเฉพาะชื่อค่าที่อาจต้องตั้ง ไม่มีรหัสจริง
- เว็บไซต์มีข้อมูลทางการเงิน ควรตรวจ Access Policy ก่อนเผยแพร่ทุกครั้ง

## ก่อนแก้หรือเผยแพร่

```bash
git status
npm run doctor
npm run lint
npm test
```

จากนั้น Commit และ Push ขึ้น GitHub ก่อนเผยแพร่ Hosting เพื่อให้ Source Code ของทุกเครื่องตรงกัน
