"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef } from "react";

export type FilterOption = { value: string; label: string };

export function FilterMenu({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  className?: string;
}) {
  const selected = options.find((option) => option.value === value) ?? options[0];
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!detailsRef.current?.contains(event.target as Node)) detailsRef.current?.removeAttribute("open");
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  return (
    <details
      ref={detailsRef}
      className={`filter-menu ${className}`.trim()}
      onToggle={(event) => {
        if (!event.currentTarget.open) return;
        document.querySelectorAll<HTMLDetailsElement>("details.filter-menu[open]").forEach((menu) => {
          if (menu !== event.currentTarget) menu.removeAttribute("open");
        });
      }}
    >
      <summary aria-label={label}>
        <span>{selected.label}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </summary>
      <div role="listbox" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={option.value === value}
            onClick={(event) => {
              onChange(option.value);
              event.currentTarget.closest("details")?.removeAttribute("open");
            }}
          >
            <span>{option.label}</span>
            {option.value === value && <Check size={14} aria-hidden="true" />}
          </button>
        ))}
      </div>
    </details>
  );
}
