import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sangchai Finance Approval",
  description: "ระบบหลังบ้านสำหรับอนุมัติและตรวจสอบข้อมูลการเงิน",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const configured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  return (
    <html lang="th">
      <body>{configured ? <ClerkProvider>{children}</ClerkProvider> : children}</body>
    </html>
  );
}
