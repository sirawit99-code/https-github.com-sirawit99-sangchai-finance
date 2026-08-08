import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sangchai Finance Approval",
  description: "ระบบหลังบ้านสำหรับอนุมัติและตรวจสอบข้อมูลการเงิน",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
