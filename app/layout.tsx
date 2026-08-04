import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sangchai Finance Control Center | 3 ธนาคาร",
  description: "Dashboard สรุปและตรวจสอบกระแสเงิน KBANK, BBL และ KTB",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
