import Link from "next/link";

export default function Home() {
  const authReady = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
  const dbReady = Boolean(process.env.DATABASE_URL);

  return (
    <main className="welcome-shell">
      <section className="welcome-card">
        <div className="brand-mark">SC</div>
        <p className="eyebrow">SANGCHAI FINANCE CONTROL</p>
        <h1>ระบบหลังบ้านอนุมัติข้อมูลการเงิน</h1>
        <p className="lead">ตรวจสอบ อนุมัติ ปฏิเสธ และย้อนดูประวัติการตัดสินใจได้จากจุดเดียว</p>
        <div className="readiness">
          <span className={authReady ? "ready" : "waiting"}>{authReady ? "✓" : "!"} ระบบ Login</span>
          <span className={dbReady ? "ready" : "waiting"}>{dbReady ? "✓" : "!"} ฐานข้อมูล</span>
        </div>
        {authReady && dbReady ? (
          <Link className="primary-link" href="/admin">เข้าสู่ระบบหลังบ้าน</Link>
        ) : (
          <div className="setup-note">
            <strong>โปรเจกต์พร้อม Deploy</strong>
            <span>เชื่อม Clerk และ Neon บน Vercel แล้วกำหนด Environment Variables ก่อนเริ่มใช้งาน</span>
          </div>
        )}
      </section>
    </main>
  );
}
