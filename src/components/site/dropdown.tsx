"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export type DropdownOption = { value: string; label: string };

/**
 * Styled replacement for <select> (the native option list can't be themed). Submits through a hidden
 * input, so it works inside a normal form; onChange fires after the input has the new value.
 */
export function Dropdown({
  name,
  options,
  defaultValue = "",
  placeholder,
  label,
  onChange,
}: {
  name: string;
  options: DropdownOption[];
  defaultValue?: string;
  placeholder: string;
  label: string;
  onChange?: (value: string) => void;
}) {
  const id = useId();
  const all: DropdownOption[] = [{ value: "", label: placeholder }, ...options];
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const current = all.find((o) => o.value === value) ?? all[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const openList = () => {
    setActive(Math.max(0, all.findIndex((o) => o.value === value)));
    setOpen(true);
  };

  const choose = (v: string) => {
    setValue(v);
    setOpen(false);
    if (inputRef.current) inputRef.current.value = v;
    if (v !== value) onChange?.(v);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && ["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      openList();
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") setActive((i) => Math.min(all.length - 1, i + 1));
    else if (e.key === "ArrowUp") setActive((i) => Math.max(0, i - 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(all.length - 1);
    else if (e.key === "Enter" || e.key === " ") choose(all[active].value);
    else if (e.key === "Escape" || e.key === "Tab") {
      setOpen(false);
      return;
    } else return;
    e.preventDefault();
  };

  return (
    <div ref={wrapRef} className="relative min-w-0">
      <span id={`${id}-label`} className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-navy-500">
        {label}
      </span>
      <input ref={inputRef} type="hidden" name={name} defaultValue={value} />
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-labelledby={`${id}-label`}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={`field flex items-center justify-between gap-2 text-left ${value ? "border-sun-400 text-navy-950" : "text-navy-700"} ${open ? "border-sun-400 ring-[3px] ring-sun-400/20" : ""}`}
      >
        <span className="truncate">{current.label.trim()}</span>
        <ChevronDown className={`size-4 shrink-0 text-navy-400 transition duration-200 ${open ? "rotate-180 text-sun-600" : ""}`} />
      </button>

      <ul
        ref={listRef}
        id={`${id}-list`}
        role="listbox"
        aria-labelledby={`${id}-label`}
        className={`absolute left-0 right-0 z-50 mt-2 max-h-72 origin-top overflow-y-auto overscroll-contain rounded-2xl bg-white/95 p-1.5 shadow-xl shadow-navy-900/15 ring-1 ring-navy-100 backdrop-blur-xl transition duration-150 ${
          open ? "visible scale-100 opacity-100" : "invisible scale-95 opacity-0"
        }`}
      >
        {all.map((o, i) => {
          const selected = o.value === value;
          const indent = o.label.startsWith("  ");
          return (
            <li
              key={o.value || "__any"}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={selected}
              onPointerEnter={() => setActive(i)}
              onClick={() => choose(o.value)}
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition ${indent ? "pl-6" : ""} ${
                i === active ? "bg-navy-50" : ""
              } ${selected ? "font-semibold text-sun-700" : "text-navy-800"} ${i === 0 ? "text-navy-500" : ""}`}
            >
              <span className="truncate">{o.label.replace(/^\s*–\s*/, "").trim()}</span>
              {selected && <Check className="size-4 shrink-0 text-sun-600" />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
