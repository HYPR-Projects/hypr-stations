interface Props {
  mode: string;
  onChange: (mode: string) => void;
}

const MODES = [
  { value: 'pins', label: 'ERBs', icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="10" r="3"/><path d="M12 2a8 8 0 0 0-8 8c0 5.4 8 12 8 12s8-6.6 8-12a8 8 0 0 0-8-8z"/>
    </svg>
  )},
  { value: 'heatmap', label: 'Heatmap', icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6" opacity="0.6"/><circle cx="12" cy="12" r="2" opacity="0.3"/>
    </svg>
  )},
  { value: 'dominance', label: 'Dominância', icon: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 21H3V3"/><path d="M7 17l4-6 4 3 4-7"/>
    </svg>
  )},
];

export default function ViewModeSelector({ mode, onChange }: Props) {
  return (
    <div
      className="absolute top-3.5 left-1/2 -translate-x-1/2 z-10 flex p-1 rounded-full"
      role="radiogroup"
      aria-label="Modo de visualização"
      style={{
        background: 'var(--overlay-panel)',
        border: '0.5px solid var(--border)',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.06)',
      }}
    >
      {MODES.map((m) => {
        const on = mode === m.value;
        return (
          <button
            key={m.value}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(m.value)}
            className={`flex items-center gap-2 px-5 py-[7px] rounded-full text-[13px] font-medium
                        transition-all duration-200 cursor-pointer border-0 outline-none
                        focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-0
                        ${on
                          ? 'text-[var(--on-accent)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
            style={on
              ? {
                  background: 'var(--accent)',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.10), 0 2px 8px rgba(0, 0, 0, 0.08)',
                }
              : { background: 'transparent' }
            }
          >
            {m.icon}
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
