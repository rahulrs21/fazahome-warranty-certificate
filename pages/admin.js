import { useEffect, useState } from "react";
import Link from "next/link";
import Head from "next/head";
import TeamAccountMenu from "../components/TeamAccountMenu";
import { getTeamPageProps } from "../lib/server/teamAuth";

async function teamRequest(method, body, pageToken) {
  const response = await fetch(`/api/admin/users${pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : ""}`, {
    method, ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (response.status === 401) { window.location.assign("/login/?next=%2Fadmin%2F"); throw new Error("Please sign in again."); }
  if (!response.ok) throw new Error(result.error || "Could not update the team.");
  return result;
}

export default function Admin({ user }) {
  const [users, setUsers] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", role: "member" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [setupLink, setSetupLink] = useState("");

  useEffect(() => {
    let active = true;
    teamRequest("GET").then((result) => { if (active) { setUsers(result.users); setNextPageToken(result.nextPageToken); } })
      .catch((error) => { if (active) setError(error.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const add = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage(""); setSetupLink("");
    try {
      const result = await teamRequest("POST", form);
      setUsers((previous) => [result.user, ...previous]);
      setSetupLink(result.setupLink || "");
      setMessage(result.setupLink ? "Account created. Share the setup link privately so this person can choose a password." : "Account created. Ask this person to use Forgot password on the sign-in page.");
      setForm({ name: "", email: "", role: "member" });
    } catch (error) { setError(error.message); } finally { setBusy(false); }
  };

  const change = async (record, patch, remove = false) => {
    if (record.protected) return;
    if (remove && !window.confirm(`Delete the account for ${record.email}? This removes their team access.`)) return;
    setBusy(true); setError(""); setMessage(""); setSetupLink("");
    try {
      const result = await teamRequest(remove ? "DELETE" : "PATCH", { uid: record.uid, ...patch });
      setUsers((previous) => remove ? previous.filter((item) => item.uid !== record.uid) : previous.map((item) => item.uid === record.uid ? result.user : item));
      setMessage(remove ? "Team account deleted." : "Account updated. This person may need to sign in again.");
    } catch (error) { setError(error.message); } finally { setBusy(false); }
  };

  const loadMore = async () => {
    setBusy(true); setError("");
    try { const result = await teamRequest("GET", null, nextPageToken); setUsers((previous) => [...new Map([...previous, ...result.users].map((item) => [item.uid, item])).values()]); setNextPageToken(result.nextPageToken); }
    catch (error) { setError(error.message); } finally { setBusy(false); }
  };
  const fieldStyle = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-900 sm:px-8">
      <Head><title>Manage team · Faza Home</title><meta name="robots" content="noindex, nofollow" /></Head>
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4"><Link href="/" className="text-sm font-semibold text-blue-600">← Warranty generator</Link><TeamAccountMenu user={user} /></header>
        <h1 className="text-3xl font-bold tracking-tight">Manage your team</h1>
        <p className="mt-2 text-sm text-slate-500">Admins manage accounts. Team members create and download certificates.</p>
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="mb-4 font-bold">Add a team member</h2>
          <form onSubmit={add} className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1.3fr_0.8fr_auto]">
            <label><span className="mb-2 block text-xs font-semibold">Full name</span><input name="memberName" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={100} required disabled={busy} className={fieldStyle} /></label>
            <label><span className="mb-2 block text-xs font-semibold">Email address</span><input name="memberEmail" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} maxLength={254} required disabled={busy} className={fieldStyle} /></label>
            <label><span className="mb-2 block text-xs font-semibold">Role</span><select aria-label="New member role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} disabled={busy} className={fieldStyle}><option value="member">Team member</option><option value="admin">Admin</option></select></label>
            <button type="submit" disabled={busy} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{busy ? "Please wait…" : "+ Add member"}</button>
          </form>
          {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {message && <p role="status" className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}
          {setupLink && <div className="mt-3 flex flex-wrap gap-2"><input aria-label="Password setup link" readOnly value={setupLink} onFocus={(event) => event.target.select()} className={`${fieldStyle} min-w-0 flex-1`} /><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(setupLink); setMessage("Setup link copied. Share it privately with the new member."); } catch { setError("Select the setup link and copy it manually."); } }} className="rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700">Copy link</button></div>}
        </section>
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="mb-4 font-bold">Team accounts</h2>
          {loading ? <p role="status" className="text-sm text-slate-500">Loading team accounts…</p> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[580px] text-left text-sm"><caption className="sr-only">Team accounts and access permissions</caption>
              <thead className="border-b border-slate-200 text-xs text-slate-500"><tr><th scope="col" className="pb-3 font-semibold">Member</th><th scope="col" className="pb-3 font-semibold">Role</th><th scope="col" className="pb-3 font-semibold">Status</th><th scope="col" className="pb-3 text-right font-semibold">Actions</th></tr></thead>
              <tbody>{users.map((record) => <tr key={record.uid} className="border-b border-slate-100 last:border-0"><td className="py-4 pr-3"><p className="font-semibold">{record.name || "Team account"}{record.uid === user.uid && <span className="ml-2 text-xs font-normal text-blue-600">You</span>}{record.protected && <span className="ml-2 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">Protected admin</span>}</p><p className="mt-1 text-xs text-slate-500">{record.email}</p></td>
                <td className="py-4 pr-3"><select aria-label={`Role for ${record.email}`} value={record.role || ""} disabled={busy || record.uid === user.uid || record.protected} onChange={(event) => change(record, { role: event.target.value || null })} className="rounded-lg border border-slate-200 bg-white p-2 text-xs"><option value="">No access</option><option value="member">Team member</option><option value="admin">Admin</option></select></td>
                <td className="py-4 pr-3"><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${record.disabled ? "bg-slate-100 text-slate-500" : record.role ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{record.disabled ? "Disabled" : record.role ? "Active" : "Not approved"}</span></td>
                <td className="py-4 text-right"><button type="button" disabled={busy || record.uid === user.uid || record.protected} onClick={() => change(record, { disabled: !record.disabled })} className="rounded-lg px-2 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-30">{record.disabled ? "Enable" : "Disable"}</button><button type="button" disabled={busy || record.uid === user.uid || record.protected} onClick={() => change(record, {}, true)} className="rounded-lg px-2 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-30">Delete</button></td>
              </tr>)}</tbody></table></div>
          )}
          {nextPageToken && <button type="button" onClick={loadMore} disabled={busy} className="mt-4 rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 disabled:opacity-50">Load more</button>}
        </section>
      </div>
    </main>
  );
}

export async function getServerSideProps(context) { return getTeamPageProps(context, true); }
