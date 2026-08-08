import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="welcome-shell">
      <section className="welcome-card">
        <div className="brand-mark">!</div>
        <p className="eyebrow">ACCESS CONTROL</p>
        <h1>บัญชีนี้ยังไม่มีสิทธิ์</h1>
        <p className="lead">กรุณาให้ Admin เพิ่มอีเมลเป็น Reviewer หรือ Viewer ก่อนเปิดข้อมูลการเงิน</p>
        <div className="readiness"><Link className="primary-link" href="/">กลับหน้าหลัก</Link></div>
      </section>
    </main>
  );
}
