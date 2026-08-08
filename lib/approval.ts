export const approvalTypes = {
  file: "ไฟล์นำเข้า",
  vendor: "คู่ค้าและบัญชี",
  anomaly: "รายการผิดปกติ",
  reconciliation: "การกระทบยอด",
} as const;

export const approvalStatuses = {
  pending: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ไม่อนุมัติ",
} as const;

export type ApprovalStatus = keyof typeof approvalStatuses;

export function formatAmount(satang: number) {
  return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(satang / 100);
}
