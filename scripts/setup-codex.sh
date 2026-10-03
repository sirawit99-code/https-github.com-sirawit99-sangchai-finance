#!/bin/sh
set -eu

cd "$(dirname "$0")/.."

echo "[1/5] ตรวจเครื่อง"
node scripts/portable-doctor.mjs

echo "[2/5] ติดตั้ง dependencies"
npm ci

echo "[3/5] ตรวจโค้ด"
npm run lint

echo "[4/5] Build และทดสอบ"
npm test

echo "[5/5] ตรวจความพร้อมรอบสุดท้าย"
node scripts/portable-doctor.mjs

echo "พร้อมใช้งาน: รัน npm run dev แล้วเปิด http://localhost:3000"

