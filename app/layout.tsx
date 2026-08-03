import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KBANK 1-6/69",
  description: "สรุปยอดเงินฝากและการโอนผ่านธนาคาร มกราคม–มิถุนายน 2569",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
