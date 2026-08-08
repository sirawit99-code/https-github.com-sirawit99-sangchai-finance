import { redirect } from "next/navigation";
import DashboardClient from "@/components/dashboard-client";
import { requireUser } from "@/lib/access";
import "./main-v2.css";
import "./dashboard-overrides.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    await requireUser();
  } catch {
    redirect("/sign-in");
  }
  return <DashboardClient />;
}
