# Sangchai Finance Approval — Vercel

ระบบหลังบ้านสำหรับตรวจสอบและอนุมัติไฟล์นำเข้า คู่ค้า/บัญชี รายการผิดปกติ และการกระทบยอด พร้อม Audit Trail

## โครงสร้างระบบ

- Next.js App Router บน Vercel
- Clerk สำหรับ Login และการจัดการผู้ใช้
- Neon Postgres สำหรับข้อมูลคำขออนุมัติและประวัติ
- Vercel Blob สำหรับไฟล์ Statement (เตรียม Environment Variable ไว้แล้ว)
- Admin เริ่มต้นจาก `ADMIN_EMAILS`

## ติดตั้งบน Vercel

1. สร้าง Git repository จากโฟลเดอร์นี้ แล้ว Import เข้า Vercel
2. ติดตั้ง Clerk จาก Vercel Marketplace และเปิดเฉพาะวิธี Login ที่ต้องการ
3. ติดตั้ง Neon จาก Vercel Marketplace
4. สร้าง Vercel Blob store หากต้องการอัปโหลด Statement
5. ตั้ง `ADMIN_EMAILS=sirawit99@gmail.com,nokbinpiano@gmail.com`
6. Pull env ลงเครื่อง: `vercel env pull .env.local --yes`
7. สร้างตาราง: `npm run db:push`
8. เพิ่มข้อมูลตัวอย่างครั้งแรก: `npm run db:seed`
9. Deploy Preview ตรวจสอบก่อน แล้วจึง Promote เป็น Production

ห้ามใส่รหัสผ่านหรือ Secret ลงใน Git ระบบ Login ใช้ Clerk และรายชื่อ Admin เท่านั้น

## สิทธิ์

- `admin`: ดู เพิ่ม อนุมัติ และไม่อนุมัติ
- `reviewer`: โครงสร้างรองรับสำหรับผู้ตรวจสอบ
- `viewer`: ดูข้อมูลเท่านั้น

บัญชีใน `ADMIN_EMAILS` จะได้รับสิทธิ์ Admin อัตโนมัติ ผู้ใช้อื่นจะเข้าไม่ได้จนกว่า Admin จะกำหนด `publicMetadata.role` ใน Clerk เป็น `reviewer` หรือ `viewer`

## Environment Variables

ดูรายการทั้งหมดใน `.env.example` ค่าจริงต้องจัดเก็บใน Vercel Environment Variables เท่านั้น
