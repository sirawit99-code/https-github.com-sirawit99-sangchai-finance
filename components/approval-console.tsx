"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import { approvalStatuses, approvalTypes, formatAmount, type ApprovalStatus } from "@/lib/approval";
import type { AppRole } from "@/lib/access";

type Approval = {
  id: string;
  requestType: keyof typeof approvalTypes;
  title: string;
  description: string;
  bank: string;
  amountSatang: number;
  entityId: string;
  status: ApprovalStatus;
  priority: string;
  requestedBy: string;
  reviewedBy: string | null;
  reviewNote: string;
  createdAt: string;
  reviewedAt: string | null;
};

type Audit = {
  id: string;
  action: string;
  actorEmail: string;
  note: string;
  createdAt: string;
};

const filters: Array<ApprovalStatus | "all"> = ["all", "pending", "approved", "rejected"];

export default function ApprovalConsole({ role, initialApprovals, initialAudit }: { role: AppRole; initialApprovals: Approval[]; initialAudit: Audit[] }) {
  const [approvals, setApprovals] = useState<Approval[]>(initialApprovals);
  const [audit, setAudit] = useState<Audit[]>(initialAudit);
  const [filter, setFilter] = useState<ApprovalStatus | "all">("pending");
  const [selected, setSelected] = useState<Approval | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const fetchData = useCallback(async (targetFilter: ApprovalStatus | "all" = filter) => {
    try {
      const response = await fetch(`/api/approvals?status=${targetFilter}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "โหลดข้อมูลไม่สำเร็จ");
      setApprovals(data.approvals);
      setAudit(data.audit);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage("");
    await fetchData();
  }, [fetchData]);

  const counts = useMemo(() => ({
    total: approvals.length,
    high: approvals.filter((item) => item.priority === "high").length,
    amount: approvals.reduce((sum, item) => sum + item.amountSatang, 0),
  }), [approvals]);

  async function decide(status: ApprovalStatus) {
    if (!selected) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/approvals/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");
      setSelected(null);
      setNote("");
      setMessage(status === "approved" ? "อนุมัติรายการเรียบร้อย" : "บันทึกการไม่อนุมัติเรียบร้อย");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "บันทึกไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "สร้างคำขอไม่สำเร็จ");
      setShowCreate(false);
      setMessage("เพิ่มคำขออนุมัติแล้ว");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "สร้างคำขอไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  const canApprove = role === "admin" || role === "reviewer";

  return (
    <>
      <section className="summary-grid" aria-label="สรุปคิวอนุมัติ">
        <article><span>รายการในมุมมอง</span><strong>{counts.total}</strong><small>รายการ</small></article>
        <article><span>เร่งด่วน</span><strong>{counts.high}</strong><small>ต้องตรวจเป็นอันดับแรก</small></article>
        <article><span>มูลค่ารวม</span><strong>฿{formatAmount(counts.amount)}</strong><small>เฉพาะรายการที่มียอดเงิน</small></article>
      </section>

      <section className="control-row">
        <div className="filter-tabs" role="tablist">
          {filters.map((item) => (
            <button key={item} className={filter === item ? "active" : ""} onClick={() => { setLoading(true); setFilter(item); void fetchData(item); }}>
              {item === "all" ? "ทั้งหมด" : approvalStatuses[item]}
            </button>
          ))}
        </div>
        {canApprove && <button className="primary-button" onClick={() => setShowCreate(true)}>+ เพิ่มคำขออนุมัติ</button>}
      </section>

      {message && <p className="system-message">{message}</p>}

      <div className="content-grid">
        <section className="queue-panel">
          <div className="section-heading"><div><p className="eyebrow">APPROVAL QUEUE</p><h2>รายการรอตรวจสอบ</h2></div><button onClick={() => void loadData()}>อัปเดต</button></div>
          {loading ? <div className="empty-state">กำลังโหลดข้อมูล…</div> : approvals.length === 0 ? (
            <div className="empty-state"><strong>ไม่มีรายการในสถานะนี้</strong><span>เลือกสถานะอื่นหรือเพิ่มคำขอใหม่</span></div>
          ) : approvals.map((item) => (
            <button className={`approval-card ${item.priority === "high" ? "urgent" : ""}`} key={item.id} onClick={() => { setSelected(item); setNote(item.reviewNote); }}>
              <div className="card-top"><span className={`status ${item.status}`}>{approvalStatuses[item.status]}</span><span>{item.bank}</span></div>
              <h3>{item.title}</h3>
              <p>{item.description || "ไม่มีรายละเอียดเพิ่มเติม"}</p>
              <div className="card-metrics">
                <span><small>ประเภท</small><b>{approvalTypes[item.requestType] ?? item.requestType}</b></span>
                <span><small>เลขอ้างอิง</small><b>{item.entityId}</b></span>
                <span><small>ยอดเงิน</small><b>฿{formatAmount(item.amountSatang)}</b></span>
              </div>
            </button>
          ))}
        </section>

        <aside className="audit-panel">
          <p className="eyebrow">AUDIT TRAIL</p><h2>กิจกรรมล่าสุด</h2>
          <div className="timeline">
            {audit.length === 0 ? <span className="muted">ยังไม่มีประวัติ</span> : audit.map((item) => (
              <div className="timeline-item" key={item.id}><i /><div><strong>{item.action}</strong><span>{item.actorEmail}</span><small>{new Date(item.createdAt).toLocaleString("th-TH")}</small>{item.note && <p>{item.note}</p>}</div></div>
            ))}
          </div>
        </aside>
      </div>

      {selected && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <section className="modal-card" role="dialog" aria-modal="true" aria-label="ตรวจสอบรายการ">
            <button className="close-button" onClick={() => setSelected(null)}>×</button>
            <p className="eyebrow">DECISION</p><h2>{selected.title}</h2>
            <dl><div><dt>ธนาคาร</dt><dd>{selected.bank}</dd></div><div><dt>มูลค่า</dt><dd>฿{formatAmount(selected.amountSatang)}</dd></div><div><dt>ผู้ส่งคำขอ</dt><dd>{selected.requestedBy}</dd></div></dl>
            <label>หมายเหตุการตรวจสอบ<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="ระบุหลักฐาน เหตุผล หรือสิ่งที่ต้องติดตาม" rows={4} /></label>
            {canApprove ? <div className="decision-row"><button className="reject-button" disabled={busy} onClick={() => void decide("rejected")}>ไม่อนุมัติ</button><button className="approve-button" disabled={busy} onClick={() => void decide("approved")}>อนุมัติรายการ</button></div> : <p className="readonly-note">สิทธิ์ Viewer สามารถดูได้ แต่ไม่สามารถอนุมัติ</p>}
          </section>
        </div>
      )}

      {showCreate && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCreate(false); }}>
          <form className="modal-card create-form" onSubmit={createRequest}>
            <button type="button" className="close-button" onClick={() => setShowCreate(false)}>×</button>
            <p className="eyebrow">NEW REQUEST</p><h2>เพิ่มคำขออนุมัติ</h2>
            <label>หัวข้อ<input name="title" required /></label>
            <div className="form-grid"><label>ประเภท<select name="requestType" defaultValue="vendor">{Object.entries(approvalTypes).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label><label>ธนาคาร<select name="bank"><option>ทุกธนาคาร</option><option>KBANK</option><option>BBL</option><option>KTB</option></select></label></div>
            <div className="form-grid"><label>เลขอ้างอิง<input name="entityId" required /></label><label>ยอดเงิน (บาท)<input name="amountBaht" type="number" min="0" step="0.01" defaultValue="0" /></label></div>
            <label>รายละเอียด<textarea name="description" rows={3} /></label>
            <label className="check-line"><input type="checkbox" name="priority" value="high" /> เป็นรายการเร่งด่วน</label>
            <button className="primary-button full" disabled={busy}>บันทึกเข้าคิวอนุมัติ</button>
          </form>
        </div>
      )}
    </>
  );
}
