"use client";

import { useEffect, useRef, useState } from "react";

export function DropdownMenu({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-white/70 hover:text-white text-sm flex items-center gap-1"
      >
        {label}
        <svg width="10" height="10" viewBox="0 0 10 10" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="absolute right-0 mt-2 w-48 card py-1.5 shadow-lg z-20"
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  href,
  onClick,
  children,
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const className =
    "block w-full text-left px-3.5 py-2 text-sm text-[var(--ink-soft)] hover:bg-[var(--paper)] hover:text-[var(--ink)]";
  if (href) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  );
}
