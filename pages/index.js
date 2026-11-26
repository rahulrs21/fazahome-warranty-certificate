"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import PurchaseDateField from "../components/PurchaseDateField";
import TeamAccountMenu from "../components/TeamAccountMenu";
import DownloadSuccessDialog from "../components/DownloadSuccessDialog";
import { getTeamPageProps } from "../lib/server/teamAuth";
import { WARRANTY_TEMPLATES } from "../lib/warrantyTemplates";
import { generateWarrantyPdf } from "../lib/generateWarrantyPdf";
import { notifyPdfDownload, DOWNLOAD_NOTIFICATION_WARNING } from "../lib/notifyPdfDownload.mjs";
import {
  CERTIFICATE_COMPANY, CERTIFICATE_CONTACT, CERTIFICATE_SIGNATORY, CERTIFICATE_LAYOUT, certificateStatement,
  certificateWarrantyContent, normalizeWarrantyProducts,
} from "../lib/warrantyCertificate";

const initialForm = {
  invoiceNumber: "",
  purchaseDate: "",
  clientName: "",
  contactNumber: "",
};

function celebrateDownload() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  import("canvas-confetti").then(({ default: confetti }) => {
    const options = {
      particleCount: 70,
      spread: 65,
      startVelocity: 45,
      ticks: 180,
      colors: ["#2563EB", "#60A5FA", "#FBBF24", "#FFFFFF"],
      disableForReducedMotion: true,
      zIndex: 100,
    };
    confetti({ ...options, angle: 60, origin: { x: 0.15, y: 0.65 } });
    confetti({ ...options, angle: 120, origin: { x: 0.85, y: 0.65 } });
  }).catch((error) => console.warn("Could not display download confetti:", error));
}

function Field({ label, name, value, onChange, type = "text", placeholder, required = false }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}

function BrandCard({ template, selected, onSelect, onFocus }) {
  const active = selected === template.id;
  return (
    <label
      title={template.name}
      className={`relative flex w-36 shrink-0 snap-start cursor-pointer flex-col overflow-hidden rounded-xl border-2 bg-white transition hover:shadow-md focus-within:ring-2 focus-within:ring-blue-100 ${active ? "border-blue-600 shadow-md shadow-blue-100" : "border-slate-200"
        }`}
    >
      <input
        type="radio"
        name="warrantyProduct"
        value={template.id}
        checked={active}
        onChange={() => onSelect(template.id)}
        onFocus={onFocus}
        className="sr-only"
        required
      />
      <div className="absolute right-2 top-2 z-10 flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-bold text-white" style={active ? { borderColor: template.accent, backgroundColor: template.accent } : undefined}>
        {active ? "✓" : ""}
      </div>
      <div className="flex h-24 items-center justify-center px-3 py-2">
        <Image
          src={template.image}
          alt={template.name}
          width={110}
          height={40}
          draggable={false}
          className="max-h-20 w-auto max-w-[100px] object-contain"
        />
      </div>
      <div className={`flex min-h-12 flex-1 flex-col justify-center border-t px-2 py-2 text-center ${active ? "border-blue-600 bg-blue-50" : "border-slate-100 bg-slate-50"}`}>
        <span className="line-clamp-2 text-xs font-semibold leading-4 text-slate-800">{template.name}</span>
      </div>
    </label>
  );
}

function revealTemplate(track, card) {
  if (!track || !card) return;
  const left = card.offsetLeft;
  const right = left + card.offsetWidth;
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  if (left < track.scrollLeft) track.scrollTo({ left, behavior });
  else if (right > track.scrollLeft + track.clientWidth) {
    track.scrollTo({ left, behavior });
  }
}

function TemplateCarousel({ selected, onSelect }) {
  const trackRef = useRef(null);
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [navigation, setNavigation] = useState({ previous: false, next: false });

  useEffect(() => {
    const track = trackRef.current;
    const update = () => setNavigation({
      previous: track.scrollLeft > (track.querySelector("label")?.offsetLeft ?? 0) + 1,
      next: track.scrollLeft + track.clientWidth < track.scrollWidth - 1,
    });
    update();
    track.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(track);
    return () => { track.removeEventListener("scroll", update); observer.disconnect(); };
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    const input = Array.from(track.querySelectorAll("input[type=radio]")).find((item) => item.value === selected);
    revealTemplate(track, input?.closest("label"));
  }, [selected]);

  const scroll = (direction) => {
    const track = trackRef.current;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    track.scrollBy({ left: direction * Math.max(156, track.clientWidth - 156), behavior });
  };

  const startDrag = (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const track = event.currentTarget;
    // Keep the native scrollbar available for mouse users.
    if (event.clientY >= track.getBoundingClientRect().top + track.clientHeight) return;
    suppressClickRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: track.scrollLeft,
      moved: false,
    };
  };

  const moveDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const distance = event.clientX - drag.startX;
    if (!drag.moved && Math.abs(distance) < 5) return;
    const track = event.currentTarget;
    if (!drag.moved) {
      drag.moved = true;
      suppressClickRef.current = true;
      track.setPointerCapture(event.pointerId);
      track.style.scrollSnapType = "none";
      setIsDragging(true);
    }
    event.preventDefault();
    track.scrollLeft = drag.scrollLeft - distance;
  };

  const endDrag = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
    event.currentTarget.style.scrollSnapType = "";
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">01</span>
          <div className="min-w-0">
            <h2 id="warranty-template-heading" className="text-base font-bold">Select warranty template</h2>
            <p className="text-[11px] text-slate-500">Drag, swipe or use arrows to browse.</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          {[{ label: "Previous templates", direction: -1, enabled: navigation.previous }, { label: "Next templates", direction: 1, enabled: navigation.next }].map(({ label, direction, enabled }) => (
            <button key={label} type="button" aria-label={label} aria-controls="warranty-template-carousel" disabled={!enabled} onClick={() => scroll(direction)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-default disabled:opacity-30">
              <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={direction === -1 ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} /></svg>
            </button>
          ))}
        </div>
      </div>
      <div
        ref={trackRef}
        id="warranty-template-carousel"
        role="group"
        aria-labelledby="warranty-template-heading"
        className={`relative flex select-none snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 pt-1 ${isDragging ? "cursor-grabbing [&_label]:cursor-grabbing" : "cursor-grab"}`}
        style={{ scrollbarWidth: "thin", scrollSnapType: isDragging ? "none" : undefined }}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onPointerLeave={(event) => {
          if (!dragRef.current?.moved) endDrag(event);
        }}
        onDragStart={(event) => event.preventDefault()}
        onClickCapture={(event) => {
          if (suppressClickRef.current && event.detail > 0) {
            event.preventDefault();
            event.stopPropagation();
            suppressClickRef.current = false;
          }
        }}
      >
        {WARRANTY_TEMPLATES.map((item) => (
          <BrandCard key={item.id} template={item} selected={selected} onSelect={onSelect} onFocus={(event) => revealTemplate(trackRef.current, event.currentTarget.closest("label"))} />
        ))}
      </div>
    </section>
  );
}

function Preview({ form, template, products }) {
  const pageWidth = 794;
  const pageHeight = pageWidth * 297 / 210;
  const mm = (value) => value * pageWidth / 210;
  const pt = (value) => value * 4 / 3;
  const frameRef = useRef(null);
  const bodyRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [density, setDensity] = useState(0);
  const [bodyScale, setBodyScale] = useState(1);
  const capacity = mm(267 - 45);

  useEffect(() => {
    const frame = frameRef.current;
    const update = () => setScale(frame.clientWidth / pageWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setDensity(0);
    setBodyScale(1);
  }, [form, template, products]);

  useEffect(() => {
    const request = requestAnimationFrame(() => {
      const fit = Math.min(1, capacity / Math.max(1, bodyRef.current.scrollHeight));
      if (fit < 1 && density < 4) setDensity(density + 1);
      else setBodyScale(fit);
    });
    return () => cancelAnimationFrame(request);
  }, [capacity, density, form, template, products]);

  const size = 9.5 - density * 0.375;
  const termSize = 8.5 - density * 0.25;
  const line = mm(size * 0.43);
  const termLine = mm(termSize * 0.44);
  const gap = mm(4 - density * 0.375);
  const productGap = mm(CERTIFICATE_LAYOUT.productGap - density * 0.5);
  const padding = mm(2 - density * 0.35);
  const signatureWidth = mm(CERTIFICATE_LAYOUT.stampWidth - density * CERTIFICATE_LAYOUT.stampDensityStep);
  const purchaseDate = form.purchaseDate
    ? form.purchaseDate.split("-").reverse().join("/")
    : "DD/MM/YYYY";
  const details = [
    { label: "INVOICE NO.", value: form.invoiceNumber || "—" },
    { label: "PURCHASE DATE", value: purchaseDate, labelWidth: CERTIFICATE_LAYOUT.purchaseDateLabelWidth },
    { label: "CLIENT", value: form.clientName || "—", full: true },
    { label: "PHONE", value: form.contactNumber || "—", full: true },
  ];
  const warranty = certificateWarrantyContent(template, products);
  const heading = { fontSize: pt(9), fontWeight: 700, lineHeight: mm(4) + "px", marginBottom: mm(1.5) };
  const cell = { border: "0.75px solid #D5DAE4", padding: padding + "px " + mm(3) + "px", verticalAlign: "top" };

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
        <div ref={frameRef} data-testid="certificate-preview" className="relative w-full" style={{ aspectRatio: "210 / 297" }}>
          <div
            data-testid="certificate-page"
            role="region"
            aria-label="Warranty certificate preview"
            className="absolute left-0 top-0 bg-white"
            style={{ width: pageWidth, height: pageHeight, transform: "scale(" + scale + ")", transformOrigin: "top left", fontFamily: "Arial, Helvetica, sans-serif", color: "#30343B" }}
          >
            <Image src="/Faza-Home-Logo.png" alt="Faza Home" width={180} height={38} style={{ position: "absolute", left: mm(10), top: mm(9), width: mm(51), height: mm(10.6) }} />
            <div style={{ position: "absolute", right: mm(10), top: mm(12), textAlign: "right" }}>
              <p style={{ fontSize: pt(9), fontWeight: 700, lineHeight: mm(4) + "px" }}>{CERTIFICATE_COMPANY}</p>
              <p style={{ marginTop: mm(2), fontSize: pt(7.5), lineHeight: mm(3.5) + "px", color: "#64748B" }}>fazahome.ae</p>
            </div>
            <h3 style={{ position: "absolute", top: mm(28), width: "100%", textAlign: "center", fontSize: pt(19), lineHeight: mm(8) + "px", fontWeight: 700, color: "#191747" }}>Warranty Certificate</h3>
            <div style={{ position: "absolute", top: mm(39), left: mm(14), right: mm(14), borderTop: "1px solid #D5DAE4" }} />
            <Image src="/Faza-Home-Logo.png" alt="" width={800} height={167} aria-hidden="true" style={{ position: "absolute", left: mm(30), top: mm(136), width: mm(150), height: mm(31.3), opacity: 0.035, pointerEvents: "none" }} />

            <div
              ref={bodyRef}
              data-testid="certificate-content"
              style={{ position: "absolute", top: mm(45), left: mm(14), width: mm(182), fontSize: pt(size), lineHeight: line + "px", transform: "scale(" + bodyScale + ")", transformOrigin: "top left" }}
            >
              <dl style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", columnGap: mm(5), rowGap: mm(1) }}>
                {details.map(({ label, value, full, labelWidth = CERTIFICATE_LAYOUT.labelWidth }) => (
                  <div key={label} style={{ display: "grid", gridTemplateColumns: mm(labelWidth) + "px minmax(0, 1fr)", gridColumn: full ? "span 2" : undefined, padding: mm(1.5) + "px " + mm(3) + "px", borderRadius: mm(1), background: "#F5F6FA" }}>
                    <dt style={{ fontWeight: 700, fontSize: pt(size), color: "#191747", whiteSpace: "nowrap" }}>{label}:</dt>
                    <dd style={{ minWidth: 0, fontWeight: 700, overflowWrap: "anywhere" }}>{value}</dd>
                  </div>
                ))}
              </dl>
              <p style={{ marginTop: gap, overflowWrap: "anywhere" }}>{certificateStatement(template)}</p>
              <p style={{ marginTop: mm(3), fontSize: pt(7.5), lineHeight: mm(3.5) + "px", color: "#64748B" }}>{template.brand} | {template.category}</p>
              <h4 style={{ ...heading, marginTop: gap }}>PRODUCT DETAILS</h4>
              <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse" }}>
                <caption className="sr-only">Products on this certificate</caption>
                <thead style={{ background: "#191747", color: "white", fontSize: pt(8.5), lineHeight: mm(4) + "px" }}>
                  <tr style={{ height: mm(6.5) }}>
                    <th scope="col" style={{ padding: "0 " + mm(3) + "px", textAlign: "left", fontWeight: 700 }}>Product name</th>
                    <th scope="col" style={{ width: mm(24), textAlign: "center", fontWeight: 700 }}>QTY</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, index) => (
                    <tr key={product.id} style={{ background: index % 2 === 0 ? "#FAFBFD" : "transparent" }}>
                      <td style={{ ...cell, overflowWrap: "anywhere" }}>{product.name || "[Product name]"}</td>
                      <td style={{ ...cell, textAlign: "center", fontWeight: 700, overflowWrap: "anywhere" }}>{product.quantity || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div data-testid="certificate-support" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: mm(CERTIFICATE_LAYOUT.supportGap), marginTop: productGap, paddingBottom: mm(2.7) }}>
                <div>
                  <h4 style={{ fontSize: pt(8), lineHeight: mm(4) + "px", fontWeight: 700, marginBottom: mm(1) }}>PRODUCT GUIDANCE</h4>
                  <p style={{ fontSize: pt(termSize), lineHeight: termLine + "px", color: "#64748B" }}>{warranty.guidance}</p>
                </div>
                <div style={{ fontSize: pt(7.2), lineHeight: mm(3.3) + "px", textAlign: "right" }}>
                  <p data-testid="certificate-signatory-company" style={{ fontWeight: 700, fontSize: pt(CERTIFICATE_LAYOUT.companyFontSize), lineHeight: mm(CERTIFICATE_LAYOUT.companyLineHeight) + "px", whiteSpace: "nowrap" }}>{CERTIFICATE_SIGNATORY}</p>
                  <Image src="/api/certificate-stamp" unoptimized alt="Faza Home authorised signature and stamp" width={300} height={300} style={{ display: "block", width: signatureWidth, height: signatureWidth, marginLeft: "auto", marginTop: mm(2) }} />
                  <div style={{ width: mm(43), marginLeft: "auto", marginTop: mm(1.5), borderBottom: "1px solid #D5DAE4" }} />
                  <p style={{ marginTop: mm(1.5) }}>AUTHORISED SIGNATORY</p>
                </div>
              </div>
              <h4 style={{ ...heading, marginTop: gap }}>TERMS OF WARRANTY:</h4>
              <ol style={{ fontSize: pt(termSize), lineHeight: termLine + "px" }}>
                {warranty.terms.map((term, index) => (
                  <li key={term} style={{ display: "grid", gridTemplateColumns: mm(7) + "px minmax(0, 1fr)", marginBottom: mm(2) }}>
                    <span>{index + 1}.</span><span>{term}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div data-testid="certificate-footer" style={{ position: "absolute", top: mm(270.5), left: mm(14), right: mm(14), borderTop: "1px solid #D5DAE4" }} />
            <Image src="/Footer-Logos.jpg" alt="Faza Home partner brands" width={900} height={69} style={{ position: "absolute", top: mm(273), left: mm(9), width: mm(192), height: mm(12.5) }} />
            <p style={{ position: "absolute", bottom: mm(4), left: mm(9), right: mm(9), fontSize: pt(7.5), lineHeight: mm(3) + "px", textAlign: "center" }}>{CERTIFICATE_CONTACT}</p>
          </div>
        </div>
      </div>
      {bodyScale < 0.94 && <p role="status" className="mt-3 text-xs leading-5 text-amber-700">This content is too long for a readable single-page certificate. Shorten product descriptions or remove some products before downloading.</p>}
    </div>
  );
}

export async function getServerSideProps(context) { return getTeamPageProps(context); }

export default function Home({ user }) {
  const [form, setForm] = useState(initialForm);
  const [selected, setSelected] = useState("ariston-solar");
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState("");
  const [downloadedPdf, setDownloadedPdf] = useState(null);
  const [downloadPopupOpen, setDownloadPopupOpen] = useState(false);
  const [productsByBrand, setProductsByBrand] = useState({});
  const nextProductId = useRef(1);

  const template = useMemo(
    () => WARRANTY_TEMPLATES.find((item) => item.id === selected) || WARRANTY_TEMPLATES[0],
    [selected]
  );
  const products = productsByBrand[template.brand] || [{ id: "initial", name: template.name, quantity: "1" }];

  const selectTemplate = (id) => {
    const next = WARRANTY_TEMPLATES.find((item) => item.id === id);
    if (next.brand === template.brand && products.length === 1 && products[0].name === template.name) {
      setProductsByBrand((previous) => ({ ...previous, [next.brand]: [{ ...products[0], name: next.name }] }));
    }
    setSelected(id);
    setMessage("");
  };

  const updateProduct = (id, field, value) => {
    setProductsByBrand((previous) => ({
      ...previous, [template.brand]: (previous[template.brand] || products).map((product) => product.id === id ? { ...product, [field]: value } : product),
    }));
    setMessage("");
  };

  const addProduct = () => {
    const id = `product-${nextProductId.current++}`;
    setProductsByBrand((previous) => ({ ...previous, [template.brand]: [...(previous[template.brand] || products), { id, name: "", quantity: "1" }] }));
    setMessage("");
  };

  const removeProduct = (id) => {
    if (products.length === 1) return;
    setProductsByBrand((previous) => ({ ...previous, [template.brand]: (previous[template.brand] || products).filter((product) => product.id !== id) }));
    setMessage("");
  };

  const updateField = (name, value) => {
    setForm((previous) => ({ ...previous, [name]: value }));
    setMessage("");
  };

  const handleDownload = async (event) => {
    event.preventDefault();
    if (!form.invoiceNumber.trim() || !form.purchaseDate || !form.clientName.trim() || !form.contactNumber.trim()) {
      setMessage("Complete all required fields before downloading.");
      return;
    }
    setDownloading(true);
    setMessage("");
    setDownloadedPdf(null);
    setDownloadPopupOpen(false);
    try {
      const session = await fetch("/api/auth/session", { cache: "no-store" });
      if (!session.ok) {
        if (session.status === 401) window.location.assign("/login/");
        throw new Error("Please sign in again before downloading a certificate.");
      }
      const validatedProducts = normalizeWarrantyProducts(products, template);
      const { filename, pdfBlob } = await generateWarrantyPdf({ template, ...form, products: validatedProducts });
      setDownloadedPdf({ filename, notificationStatus: "pending" });
      setDownloadPopupOpen(true);
      celebrateDownload();
      const notificationSent = await notifyPdfDownload(filename, pdfBlob);
      setDownloadedPdf({ filename, notificationStatus: notificationSent ? "sent" : "failed" });
      if (!notificationSent) setMessage(DOWNLOAD_NOTIFICATION_WARNING);
    } catch (error) {
      console.error("Warranty PDF generation failed:", error);
      setMessage(error.message || "Could not create the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-8">
          <div className="flex items-center gap-4">
            <Image src="/Faza-Home-Logo.png" alt="Faza Home" width={140} height={60} className="h-auto w-32 object-contain" priority />
            <span className="hidden border-l border-slate-200 pl-4 text-sm font-medium text-slate-500 sm:block">FAZA BUILDING MATERIALS TRADING LLC</span>
          </div>
          <TeamAccountMenu user={user} />
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-9 sm:px-8">
        <div className="mb-5">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">Faza Home / After-Sales Support</p>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Warranty Certificate Generator</h1>
          <p className="mt-2 max-w-md text-sm leading-5 text-slate-600">Choose the product, enter the purchase details once, review the certificate, and download a professional PDF.</p>
        </div>

        <form onSubmit={handleDownload}>
          <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.88fr)]">
            <div className="min-w-0 space-y-6">
              <TemplateCarousel selected={selected} onSelect={selectTemplate} />

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-6 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">02</span>
                  <div>
                    <h2 className="text-lg font-bold">Customer & purchase details</h2>
                    <p className="text-xs text-slate-500">These details are shared across all templates.</p>
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Client name" name="clientName" value={form.clientName} onChange={updateField} placeholder="Customer full name" required />
                  <Field label="Invoice number" name="invoiceNumber" value={form.invoiceNumber} onChange={updateField} placeholder="e.g. LTINV - 12345" required />
                  <PurchaseDateField value={form.purchaseDate} onChange={updateField} required />
                  <Field label="Contact number" name="contactNumber" type="tel" value={form.contactNumber} onChange={updateField} placeholder="e.g. +971 50 123 4567" required />
                </div>
                <div className="mt-6 border-t border-slate-200 pt-6">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold">Product details</h3>
                      <p className="text-xs text-slate-500">List every {template.brand} product on this certificate.</p>
                    </div>
                    <button type="button" onClick={addProduct} className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 cursor-pointer">+ Add more</button>
                  </div>
                  <datalist id="warranty-product-suggestions">
                    {WARRANTY_TEMPLATES.filter((item) => item.brand === template.brand).map((item) => <option key={item.id} value={item.name} />)}
                  </datalist>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[340px] text-sm">
                      <caption className="sr-only">Edit product names and quantities</caption>
                      <thead><tr className="text-left text-xs text-slate-500"><th scope="col" className="pb-2 font-semibold">Product name</th><th scope="col" className="w-24 px-2 pb-2 font-semibold">QTY</th><th scope="col" className="w-9 pb-2"><span className="sr-only">Remove</span></th></tr></thead>
                      <tbody>
                        {products.map((product, index) => (
                          <tr key={product.id}>
                            <td className="py-1.5"><input name={`productName-${index}`} aria-label={`Product name ${index + 1}`} value={product.name} onChange={(event) => updateProduct(product.id, "name", event.target.value)} list="warranty-product-suggestions" placeholder={`e.g. ${template.name} 200L`} required className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></td>
                            <td className="px-2 py-1.5"><input name={`productQuantity-${index}`} aria-label={`Quantity ${index + 1}`} type="number" min="1" step="1" value={product.quantity} onChange={(event) => updateProduct(product.id, "quantity", event.target.value)} required className="w-full rounded-lg border border-slate-200 px-2 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></td>
                            <td className="py-1.5"><button type="button" onClick={() => removeProduct(product.id)} disabled={products.length === 1} aria-label={`Remove product ${index + 1}`} className="rounded-lg px-2 py-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30">×</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">Add one row per model and enter its quantity. Use a separate certificate for another brand.</p>
                </div>
              </section>

              <div className="rounded-2xl bg-slate-900 p-5 text-white sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-base font-bold">Ready to issue the certificate?</p>
                    <p className="mt-1 text-xs leading-5 text-slate-300">Review the live preview, then download an A4 PDF.</p>
                  </div>
                  <button type="submit" disabled={downloading} aria-busy={downloading} className="inline-flex min-w-[220px] items-center justify-center gap-2.5 rounded-xl bg-blue-500 px-6 py-3 text-sm font-bold cursor-pointer text-white transition hover:bg-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-wait disabled:opacity-60">
                    {downloading && (
                      <svg aria-hidden="true" className="h-5 w-5 shrink-0 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-90" d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                    )}
                    <span aria-live="polite">{downloading ? downloadedPdf ? "Sending notification…" : "Creating PDF…" : "↓ Download Warranty PDF"}</span>
                  </button>
                </div>
                {message && <p role="status" aria-live="polite" className="mt-3 text-sm text-blue-100">{message}</p>}
              </div>
            </div>

            <aside className="min-w-0 xl:sticky xl:top-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold">Live certificate preview</h2>
                  <p className="text-xs text-slate-500">Updates as you enter details and change templates</p>
                </div>
                <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600">A4 portrait</span>
              </div>
              <Preview form={form} template={template} products={products} />
              {/* <p className="mt-3 text-xs leading-5 text-slate-500">Warranty wording is sample administrative copy. Replace it in <code>lib/warrantyTemplates.js</code> with each manufacturer&apos;s approved warranty conditions before issuing certificates to customers.</p> */}
            </aside>
          </div>
        </form>
        <footer className="mt-14 border-t border-slate-200 pt-6 text-center text-xs text-slate-500">© {new Date().getFullYear()} Faza Home • Made by Rahul</footer>
      </div>
      {downloadPopupOpen && downloadedPdf && (
        <DownloadSuccessDialog filename={downloadedPdf.filename} notificationStatus={downloadedPdf.notificationStatus} onClose={() => setDownloadPopupOpen(false)} />
      )}
    </main>
  );
}
