"use client";

import { Printer } from "lucide-react";
import { adminButton } from "../../../components/buttons";

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={adminButton("primary", "sm")}>
      <Printer aria-hidden="true" strokeWidth={1.75} />
      {label}
    </button>
  );
}
