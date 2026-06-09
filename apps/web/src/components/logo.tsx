// Aegis mark: a shield (aegis = shield) with a health-pulse line — protection +
// monitoring. Inline SVG so it scales crisply and needs no extra request. The
// standalone /public/logo.svg is the same art, for the WorkOS logo upload etc.

export function LogoMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path d="M16 3 L26 7 V14.5 C26 21.5 21.5 26.5 16 29 C10.5 26.5 6 21.5 6 14.5 V7 Z" fill="#2DD4BF" />
      <path
        d="M9 16 H12.5 L14.5 11.5 L17.5 21 L19.5 16 H23"
        stroke="#020617"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Logo({ wordmarkClass = 'text-white' }: { wordmarkClass?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark />
      <span className={`text-lg font-semibold ${wordmarkClass}`}>Aegis</span>
    </span>
  );
}
