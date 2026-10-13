import { useEffect, useId, useRef, useState } from "react";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function calendarDate(year, month, day = 1) {
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month, day);
  return date;
}

function dateValue(date) {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function readDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return calendarDate(year, month - 1, day);
}

function displayDate(value) {
  return value ? value.split("-").reverse().join("/") : "";
}

function parseDate(text) {
  const cleaned = text.replace(/\s+/g, "");
  const display = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(cleaned);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cleaned);
  if (!display && !iso) return "";
  const [year, month, day] = display
    ? [Number(display[3]), Number(display[2]), Number(display[1])]
    : [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  const date = calendarDate(year, month - 1, day);
  if (year < 1 || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return "";
  return dateValue(date);
}

export default function PurchaseDateField({ value, onChange, required = false }) {
  const id = useId();
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const triggerRef = useRef(null);
  const [draft, setDraft] = useState({ source: value, text: displayDate(value) });
  const [showError, setShowError] = useState(false);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ year: 2000, month: 0 });
  const [focusedDate, setFocusedDate] = useState("");
  const [today, setToday] = useState("");
  // Keep partially typed text while the form stores only a valid ISO date.
  const text = draft.source === value ? draft.text : displayDate(value);
  const invalidDate = Boolean(text.trim() && !parseDate(text));
  const error = invalidDate ? "Enter a valid date in DD/MM/YYYY format." : required && !text.trim() ? "Enter a purchase date." : "";

  useEffect(() => {
    inputRef.current.setCustomValidity(invalidDate ? "Enter a valid date in DD/MM/YYYY format." : "");
  }, [invalidDate]);

  const editDate = (rawText) => {
    const iso = parseDate(rawText);
    setDraft({ source: iso, text: iso ? displayDate(iso) : rawText.trim() ? rawText : "" });
    inputRef.current.setCustomValidity(rawText.trim() && !iso ? "Enter a valid date in DD/MM/YYYY format." : "");
    onChange("purchaseDate", iso);
  };

  useEffect(() => {
    if (!open) return;
    const dismiss = (event) => {
      if (!containerRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  useEffect(() => {
    if (open && focusedDate) {
      containerRef.current.querySelector(`[data-date="${focusedDate}"]`)?.focus();
    }
  }, [open, focusedDate]);

  const close = () => {
    setOpen(false);
    triggerRef.current.focus();
  };

  const toggle = () => {
    if (open) return close();
    const current = dateValue(new Date());
    const date = readDate(value || current);
    setToday(current);
    setView({ year: date.getFullYear(), month: date.getMonth() });
    setFocusedDate(value || current);
    setOpen(true);
  };

  const select = (date) => {
    setDraft({ source: date, text: displayDate(date) });
    setShowError(false);
    onChange("purchaseDate", date);
    close();
  };

  const changeMonth = (offset) => {
    const date = calendarDate(view.year, view.month + offset);
    setView({ year: date.getFullYear(), month: date.getMonth() });
  };

  const moveFocus = (event, date) => {
    const shifts = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let next;
    if (event.key in shifts) {
      next = calendarDate(date.getFullYear(), date.getMonth(), date.getDate() + shifts[event.key]);
    } else if (event.key === "Home" || event.key === "End") {
      const weekday = (date.getDay() + 6) % 7;
      next = calendarDate(date.getFullYear(), date.getMonth(), date.getDate() + (event.key === "Home" ? -weekday : 6 - weekday));
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      const month = date.getMonth() + (event.key === "PageUp" ? -1 : 1);
      const lastDay = calendarDate(date.getFullYear(), month + 1, 0).getDate();
      next = calendarDate(date.getFullYear(), month, Math.min(date.getDate(), lastDay));
    } else return;
    event.preventDefault();
    if (next.getFullYear() < 1 || next.getFullYear() > 9999) return;
    setView({ year: next.getFullYear(), month: next.getMonth() });
    setFocusedDate(dateValue(next));
  };

  const firstDay = calendarDate(view.year, view.month);
  const offset = (firstDay.getDay() + 6) % 7;
  const days = Array.from({ length: 42 }, (_, index) => calendarDate(view.year, view.month, index - offset + 1));
  const activeDate = days.some((date) => dateValue(date) === focusedDate) ? focusedDate : dateValue(firstDay);
  const currentYear = today ? Number(today.slice(0, 4)) : view.year;
  const firstYear = Math.max(1, Math.min(currentYear - 100, view.year));
  const lastYear = Math.min(9999, Math.max(currentYear + 10, view.year));
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => lastYear - index);
  const navigationStyle = "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-30";

  return (
    <div
      ref={containerRef}
      className="relative min-w-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (open && event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
      }}
    >
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-slate-700">
        Date of purchase {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex items-center rounded-xl border border-slate-200 bg-white transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100">
        <input
          ref={inputRef}
          id={id}
          name="purchaseDate"
          type="text"
          value={text}
          placeholder="DD/MM/YYYY"
          autoComplete="off"
          aria-describedby={`${id}-hint`}
          aria-invalid={showError && Boolean(error)}
          required={required}
          onChange={(event) => editDate(event.target.value)}
          onPaste={(event) => {
            event.preventDefault();
            editDate(event.clipboardData.getData("text").trim());
            setShowError(true);
          }}
          onBlur={() => setShowError(true)}
          onInvalid={() => setShowError(true)}
          className="min-w-0 flex-1 rounded-xl bg-transparent px-4 py-3 text-sm text-slate-900 outline-none"
        />
        <button
          ref={triggerRef}
          type="button"
          aria-label="Choose purchase date"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={`${id}-calendar`}
          onClick={toggle}
          className={`mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-200 ${open ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="3" /><path d="M16 3v4M8 3v4M3 11h18m-12 5h.01m3.99 0h.01" />
          </svg>
        </button>
      </div>
      <p id={`${id}-hint`} role={showError && error ? "alert" : undefined} className={`mt-1.5 text-[11px] ${showError && error ? "text-red-600" : "text-slate-500"}`}>
        {showError && error ? error : "DD/MM/YYYY · Type or paste a date"}
      </p>
      {open && (
        <div id={`${id}-calendar`} role="dialog" aria-label="Choose date of purchase" className="absolute left-0 top-full z-30 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/15">
          <div className="mb-3 flex items-center gap-1">
            <button type="button" aria-label="Previous month" disabled={view.year === 1 && view.month === 0} onClick={() => changeMonth(-1)} className={navigationStyle}>‹</button>
            <div className="flex min-w-0 flex-1 gap-1">
              <select aria-label="Calendar month" value={view.month} onChange={(event) => setView({ ...view, month: Number(event.target.value) })} className="min-w-0 flex-1 rounded-lg bg-slate-50 px-1 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-200">
                {MONTHS.map((month, index) => <option key={month} value={index}>{month}</option>)}
              </select>
              <select aria-label="Calendar year" value={view.year} onChange={(event) => setView({ ...view, year: Number(event.target.value) })} className="w-[4.5rem] rounded-lg bg-slate-50 px-1 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-200">
                {years.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
            <button type="button" aria-label="Next month" disabled={view.year === 9999 && view.month === 11} onClick={() => changeMonth(1)} className={navigationStyle}>›</button>
          </div>
          <span className="sr-only" aria-live="polite">{MONTHS[view.month]} {view.year}</span>
          <div role="grid" aria-label={`${MONTHS[view.month]} ${view.year}`}>
            <div role="row" className="mb-1 grid grid-cols-7">
              {WEEKDAYS.map((day) => <span key={day} role="columnheader" className="py-1 text-center text-[10px] font-semibold text-slate-400">{day}</span>)}
            </div>
            {Array.from({ length: 6 }, (_, week) => (
              <div key={week} role="row" className="grid grid-cols-7 gap-0.5">
                {days.slice(week * 7, week * 7 + 7).map((date) => {
                  const iso = dateValue(date);
                  const selected = iso === value;
                  const isToday = iso === today;
                  return (
                    <div key={iso} role="gridcell" aria-selected={selected}>
                      <button
                        type="button"
                        data-date={iso}
                        tabIndex={iso === activeDate ? 0 : -1}
                        disabled={date.getFullYear() < 1 || date.getFullYear() > 9999}
                        aria-label={date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                        aria-current={isToday ? "date" : undefined}
                        onClick={() => select(iso)}
                        onKeyDown={(event) => moveFocus(event, date)}
                        className={`my-0.5 flex h-8 w-full items-center justify-center rounded-lg text-xs transition focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 disabled:opacity-20 ${selected ? "bg-blue-600 font-bold text-white shadow-sm" : `${date.getMonth() === view.month ? "text-slate-700" : "text-slate-400"} hover:bg-blue-50 hover:text-blue-700 ${isToday ? "bg-blue-50 font-bold ring-1 ring-inset ring-blue-200" : ""}`}`}
                      >{date.getDate()}</button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
            <button type="button" onClick={() => select(today)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200">Today</button>
            <button type="button" disabled={!value} onClick={() => select("")} className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-40">Clear</button>
          </div>
          <p className="sr-only">Use arrow keys to move between days, Page Up or Page Down to change months, Enter to select, and Escape to close.</p>
        </div>
      )}
    </div>
  );
}
