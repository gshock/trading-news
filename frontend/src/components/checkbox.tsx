import type { CheckboxProps } from "../types/tabs";

export function Checkbox({ label, checked, onChange }: CheckboxProps) {
  return (
    <label
      className={`flex items-center gap-2.5 flex-1 px-4 py-3 rounded border cursor-pointer transition-colors ${
        checked
          ? "border-blue-500/50 bg-blue-600/10"
          : "border-white/8 bg-[#080d14] hover:border-white/15"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span
        className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 transition-colors ${
          checked ? "bg-blue-600 border-blue-600" : "border-white/20"
        }`}
      >
        {checked && (
          <svg
            className="w-2.5 h-2.5 text-white"
            viewBox="0 0 10 10"
            fill="none"
          >
            <path
              d="M1.5 5L4 7.5L8.5 2.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span
        className={`text-xs font-semibold tracking-wide ${checked ? "text-white" : "text-slate-500"}`}
      >
        {label}
      </span>
    </label>
  );
}
