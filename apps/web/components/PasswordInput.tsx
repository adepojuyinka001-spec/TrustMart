"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "./icons";

export function PasswordInput({
  value,
  onChange,
  minLength,
  required,
  autoComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  minLength?: number;
  required?: boolean;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="tm-input pr-10"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-tm-dark/40 transition hover:text-tm-navy"
      >
        {visible ? <EyeOffIcon className="h-[18px] w-[18px]" /> : <EyeIcon className="h-[18px] w-[18px]" />}
      </button>
    </div>
  );
}
