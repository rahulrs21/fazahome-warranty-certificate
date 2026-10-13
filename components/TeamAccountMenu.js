import { useState } from "react";
import Link from "next/link";

export default function TeamAccountMenu({ user }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const logout = async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/session", { method: "DELETE" });
      if (!response.ok) throw new Error("Could not sign out. Please try again.");
      window.location.assign("/login/");
    } catch (error) { setError(error.message); setBusy(false); }
  };
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
      <span title={user.email} className="max-w-40 truncate text-slate-500">Welcome <b>{user.name || user.email}</b></span>
      {user.role === "admin" && <Link href="/admin/" className="rounded-lg bg-blue-50 px-3 py-2 font-semibold text-blue-700 hover:bg-blue-100">Manage team</Link>}
      <button type="button" onClick={logout} disabled={busy} className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">{busy ? "Signing out…" : "Sign out"}</button>
      {error && <span role="alert" className="w-full text-right text-red-600">{error}</span>}
    </div>
  );
}
