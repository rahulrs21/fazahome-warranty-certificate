import { useEffect, useRef } from "react";
import { Check, FileText, LoaderCircle, Mail, TriangleAlert, X } from "lucide-react";
import { PROTECTED_ADMIN_EMAIL } from "../lib/protectedAccount.mjs";

export default function DownloadSuccessDialog({ filename, notificationStatus, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      dialog.close();
    };
  }, []);

  const pending = notificationStatus === "pending";
  const failed = notificationStatus === "failed";
  const NotificationIcon = pending ? LoaderCircle : failed ? TriangleAlert : Mail;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="download-success-title"
      aria-describedby="download-success-description"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); onClose(); } }}
      className="m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-3xl border-0 bg-white p-0 text-slate-900 shadow-2xl"
    >
      <div className="relative overflow-hidden bg-gradient-to-br from-[#191747] via-[#232159] to-blue-700 px-6 pb-8 pt-9 text-center text-white sm:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-20 h-56 w-56 rounded-full border border-white/10 bg-white/5" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-20 h-64 w-64 rounded-full border border-white/10" />
        <button type="button" aria-label="Close download confirmation" onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
          <X size={18} aria-hidden="true" />
        </button>
        <div className="relative">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-300/10 ring-8 ring-white/5">
            <Check size={38} strokeWidth={2.5} aria-hidden="true" className="text-emerald-300" />
          </div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-200">Faza Home · Warranty certificate</p>
          <h2 id="download-success-title" className="text-2xl font-extrabold tracking-tight sm:text-[28px]">Your certificate is ready!</h2>
          <p id="download-success-description" className="mx-auto mt-3 max-w-xs text-sm leading-6 text-blue-100">Your warranty certificate PDF has been downloaded.</p>
        </div>
      </div>

      <div className="px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <span className="flex h-12 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-200"><FileText size={24} aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Downloaded PDF</p>
            <p className="mt-1 break-all text-sm font-semibold leading-5 text-slate-800">{filename}</p>
          </div>
        </div>

        <div role="status" aria-live="polite" aria-atomic="true" className={`mt-4 flex items-start gap-3 rounded-xl p-3.5 ${failed ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-800"}`}>
          <NotificationIcon size={18} aria-hidden="true" className={`mt-0.5 shrink-0 ${pending ? "animate-spin motion-reduce:animate-none" : ""}`} />
          <div className="min-w-0">
            <p className="text-xs font-bold">{pending ? "Sending email notification…" : failed ? "Downloaded successfully. Email not sent." : "Email notification sent"}</p>
            <p className="mt-1 break-words text-xs leading-5 opacity-80">{failed ? "Your PDF is saved, but the administrator’s email could not be sent. Please contact your administrator." : pending ? "Sending a copy of the PDF to the administrator." : <>A copy of the PDF was emailed to <span className="font-semibold">{PROTECTED_ADMIN_EMAIL}</span>.</>}</p>
          </div>
        </div>

        <button type="button" autoFocus onClick={onClose} className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200">Done</button>
        <p className="mt-3 text-center text-[11px] leading-5 text-slate-400">You can find the PDF in your browser’s downloads.</p>
      </div>
      <style jsx>{`
        dialog { animation: appear 220ms ease-out; }
        dialog::backdrop { background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(5px); }
        @keyframes appear { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @media (prefers-reduced-motion: reduce) { dialog { animation: none; } }
      `}</style>
    </dialog>
  );
}
