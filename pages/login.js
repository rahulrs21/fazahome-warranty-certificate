import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import { getAdminSetupStatus } from "../firebase/admin.mjs";
import { getSessionUser, preventCaching } from "../lib/server/teamAuth";

function loginError(error) {
  if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-login-credentials"].includes(error.code)) return "The email or password is incorrect.";
  if (error.code === "auth/user-disabled") return "Your account is disabled. Please contact your administrator.";
  if (error.code === "auth/too-many-requests") return "Too many attempts. Please wait a moment and try again.";
  if (error.code === "auth/network-request-failed") return "Check your connection and try again.";
  if (error.code === "auth/invalid-email") return "Enter a valid email address.";
  if (error.code?.startsWith("auth/")) return "Sign-in is temporarily unavailable. Please contact your administrator.";
  return error.message || "Could not sign in. Please try again.";
}

export default function Login({ configured, setupIssues = [] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [reset, setReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!reset && !configured) {
      setFailed(true); setMessage("Sign-in is unavailable until your administrator completes the setup.");
      return;
    }
    setBusy(true); setMessage(""); setFailed(false);
    let auth;
    try {
      const [{ getFirebaseAuth }, sdk] = await Promise.all([import("../firebase/firebase"), import("firebase/auth")]);
      auth = getFirebaseAuth();
      await sdk.setPersistence(auth, sdk.inMemoryPersistence);
      if (reset) {
        try { await sdk.sendPasswordResetEmail(auth, email.trim()); }
        catch (error) { if (error.code !== "auth/user-not-found") throw error; }
        setMessage("If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.");
        return;
      }
      const credential = await sdk.signInWithEmailAndPassword(auth, email.trim(), password);
      const idToken = await credential.user.getIdToken();
      const response = await fetch("/api/auth/session/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const destination = router.query.next === "/admin/" && result.user.role === "admin" ? "/admin/" : "/";
      window.location.assign(destination);
    } catch (error) {
      setFailed(true); setMessage(loginError(error));
    } finally {
      // Only the server's HttpOnly session remains after the token exchange.
      if (auth?.currentUser) {
        const { signOut } = await import("firebase/auth");
        await signOut(auth).catch(() => {});
      }
      setPassword(""); setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12 text-slate-900">
      <Head><title>Team sign in · Faza Home</title><meta name="robots" content="noindex, nofollow" /></Head>
      <div className="w-full max-w-md">
        <Image src="/Faza-Home-Logo.png" alt="Faza Home" width={180} height={38} priority className="mx-auto mb-8 h-auto w-44" />
        <section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/50 sm:p-9">
          <span className="mb-4 inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Faza Home team</span>
          <h1 className="text-2xl font-bold tracking-tight">{reset ? "Reset your password" : "Welcome back"}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{reset ? "Enter your team email and we’ll send a reset link." : "Sign in to create and manage warranty certificates."}</p>
          {!configured && !reset && <div role="status" className="mt-5 rounded-xl bg-amber-50 p-3 text-sm leading-5 text-amber-800"><p className="font-semibold">Sign-in is not ready yet</p><p className="mt-1">Your administrator needs to finish the Firebase setup before you can sign in.</p></div>}
          {setupIssues.length > 0 && !reset && <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600">
            <summary className="cursor-pointer font-semibold text-slate-800">Local development: finish Firebase setup</summary>
            <ul className="mt-3 space-y-2">{setupIssues.map((issue) => <li key={issue} className="break-words">{issue}</li>)}</ul>
            <p className="mt-3">Open Firebase Console → Project settings → Service accounts → Generate new private key. Copy the JSON values into your local environment file, then restart the development server.</p>
            <p className="mt-3">Next, create your login account under Authentication → Users and assign admin access with:</p>
            <code className="mt-2 block overflow-x-auto rounded-lg bg-white p-2 text-[11px]">npm run auth:make-admin -- YOUR_FIREBASE_USER_UID</code>
            <p className="mt-2">Full instructions are in FIREBASE_AUTH_SETUP.md in your project.</p>
          </details>}
          <form onSubmit={submit} className="mt-6 space-y-5">
            <label className="block"><span className="mb-2 block text-sm font-semibold">Email address</span><input name="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={busy} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" placeholder="you@fazahome.ae" /></label>
            {!reset && <label className="block"><span className="mb-2 block text-sm font-semibold">Password</span><div className="flex rounded-xl border border-slate-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100"><input name="password" type={visible ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={busy} className="min-w-0 flex-1 rounded-xl px-4 py-3 text-sm outline-none" /><button type="button" aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} onClick={() => setVisible(!visible)} className="mr-2 rounded-lg px-2 text-xs font-semibold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200">{visible ? "Hide" : "Show"}</button></div></label>}
            {message && <p role={failed ? "alert" : "status"} className={`rounded-xl p-3 text-sm leading-5 ${failed ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-800"}`}>{message}</p>}
            <button type="submit" disabled={busy || (!reset && !configured)} aria-busy={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {busy && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none" />}
              {busy ? "Please wait…" : reset ? "Send reset link" : "Sign in"}
            </button>
          </form>
          <button type="button" disabled={busy} onClick={() => { setReset(!reset); setMessage(""); setPassword(""); }} className="mt-5 w-full rounded-lg py-1 text-center text-sm font-medium text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200">{reset ? "Back to sign in" : "Forgot password?"}</button>
        </section>
        <p className="mt-6 text-center text-xs leading-5 text-slate-500">Use the email and password for your approved team account.<br />Contact your administrator if you haven’t received an account.</p>
      </div>
    </main>
  );
}

export async function getServerSideProps({ req, res }) {
  preventCaching(res);
  let user;
  try { user = await getSessionUser(req); } catch { user = null; }
  if (user) return { redirect: { destination: "/", permanent: false } };
  const setup = getAdminSetupStatus();
  if (!setup.ready && process.env.NODE_ENV === "production") {
    // Only setting names and validation messages are logged, never credential values.
    console.warn("Faza Home Firebase setup incomplete:", setup.issues.join(" "));
  }
  const hostname = (req.headers.host || "").split(":")[0];
  const localDevelopment = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(hostname);
  return { props: { configured: setup.ready, setupIssues: localDevelopment ? setup.issues : [] } };
}
