import { useEffect, useState } from "react";
import { Check, RefreshCw, ShieldCheck, X } from "lucide-react";

async function permissionRequest(method, body, pageToken) {
  const response = await fetch(`/api/admin/permissions/${pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : ""}`, {
    method, cache: "no-store", ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (response.status === 401) { window.location.assign("/login/?next=%2Fadmin%2F"); throw new Error("Please sign in again."); }
  if (!response.ok) throw new Error(result.error || "Could not load registration requests.");
  return result;
}

function registrationDate(value) {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dubai" }).format(date)
    : "—";
}

export default function RegistrationPermissions({ onApproved, teamBusy = false }) {
  const [requests, setRequests] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [processingUid, setProcessingUid] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    permissionRequest("GET").then((result) => {
      if (active) { setRequests(result.requests); setNextPageToken(result.nextPageToken); }
    }).catch((error) => { if (active) setError(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const reload = async (append = false) => {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await permissionRequest("GET", null, append ? nextPageToken : undefined);
      setRequests((previous) => append ? [...new Map([...previous, ...result.requests].map((record) => [record.uid, record])).values()] : result.requests);
      setNextPageToken(result.nextPageToken);
    } catch (error) { setError(error.message); } finally { setBusy(false); }
  };

  const review = async (record, decision) => {
    if (decision === "deny" && !window.confirm(`Deny the registration for ${record.email}? They will not receive team access.`)) return;
    setBusy(true); setProcessingUid(record.uid); setError(""); setMessage("");
    try {
      const result = await permissionRequest("POST", { uid: record.uid, decision });
      setRequests((previous) => previous.filter((item) => item.uid !== record.uid));
      if (decision === "approve") onApproved(result.user);
      setMessage(decision === "approve" ? `${record.name} approved as a team member. They can now sign in.` : `${record.name}'s registration was denied. They cannot access the generator.`);
    } catch (error) { setError(error.message); } finally { setBusy(false); setProcessingUid(""); }
  };

  return (
    <section aria-labelledby="permission-heading" className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><ShieldCheck size={20} aria-hidden="true" /></span>
          <div>
            <h2 id="permission-heading" className="flex items-center gap-2 font-bold">Permission <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">{loading ? "…" : `${requests.length}${nextPageToken ? "+" : ""}`} pending</span></h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Review registrations before granting access. Approved accounts become team members.</p>
          </div>
        </div>
        <button type="button" onClick={() => reload()} disabled={busy || loading || teamBusy} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={14} aria-hidden="true" />Refresh</button>
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="mb-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}
      {loading ? <p role="status" className="text-sm text-slate-500">Loading registration requests…</p> : requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center"><p className="text-sm font-semibold text-slate-700">No pending registrations</p><p className="mt-1 text-xs leading-5 text-slate-500">New registration requests will appear here for your approval.</p></div>
      ) : (
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Pending team registrations. Registration dates are shown in Dubai time.</caption>
          <thead className="border-b border-slate-200 text-xs text-slate-500"><tr><th scope="col" className="pb-3 font-semibold">Applicant</th><th scope="col" className="pb-3 font-semibold">Role</th><th scope="col" className="pb-3 font-semibold">Registered · Dubai</th><th scope="col" className="pb-3 text-right font-semibold">Decision</th></tr></thead>
          <tbody>{requests.map((record) => <tr key={record.uid} className="border-b border-slate-100 last:border-0">
            <td className="py-4 pr-3"><p className="font-semibold">{record.name || "Team applicant"}</p><p className="mt-1 text-xs text-slate-500">{record.email}</p></td>
            <td className="py-4 pr-3"><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">Team member</span></td>
            <td className="py-4 pr-3 text-xs text-slate-500">{registrationDate(record.registeredAt)}</td>
            <td className="py-4 text-right"><div className="flex justify-end gap-2">
              <button type="button" aria-label={`Approve ${record.name || record.email}`} onClick={() => review(record, "approve")} disabled={busy || teamBusy} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-50"><Check size={14} aria-hidden="true" />{processingUid === record.uid ? "Please wait…" : "Approve"}</button>
              <button type="button" aria-label={`Deny ${record.name || record.email}`} onClick={() => review(record, "deny")} disabled={busy || teamBusy} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-50"><X size={14} aria-hidden="true" />Deny</button>
            </div></td>
          </tr>)}</tbody>
        </table></div>
      )}
      {nextPageToken && <button type="button" onClick={() => reload(true)} disabled={busy || teamBusy} className="mt-4 rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50">Load more requests</button>}
    </section>
  );
}
