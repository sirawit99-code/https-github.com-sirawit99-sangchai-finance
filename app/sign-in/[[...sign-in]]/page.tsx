import { signIn } from "../actions";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="auth-shell">
    <form action={signIn} className="login-card">
      <div className="brand-mark">SC</div>
      <p className="eyebrow">SECURE ADMIN ACCESS</p>
      <h1>เข้าสู่ระบบหลังบ้าน</h1>
      <p>สำหรับผู้บริหารและผู้ดูแลระบบที่ได้รับอนุญาต</p>
      {error ? <div className="login-error">อีเมลหรือรหัสผ่านไม่ถูกต้อง</div> : null}
      <label>อีเมล<input name="email" type="email" autoComplete="username" required /></label>
      <label>รหัสผ่าน<input name="password" type="password" autoComplete="current-password" required /></label>
      <button className="primary-button full" type="submit">เข้าสู่ระบบ</button>
    </form>
  </main>;
}
