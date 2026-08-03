import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "รายงานบัญชี แสงชัยพาณิชย์",
  description: "รายงานวิเคราะห์เงินเข้า เงินออก EDC และรายการเดินบัญชี มกราคม–มิถุนายน 2569",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
