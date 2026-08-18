"use client";

import { Check, ChevronDown } from "lucide-react";

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

  return (
    <details className={`filter-menu ${className}`.trim()}>
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
