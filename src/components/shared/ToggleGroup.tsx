interface ToggleOption {
  value: string;
  label: string;
  color?: string;
  activeColor?: string;
}

interface ToggleGroupProps {
  options: ToggleOption[];
  active: Set<string>;
  onChange: (active: Set<string>) => void;
}

export default function ToggleGroup({ options, active, onChange }: ToggleGroupProps) {
  const toggle = (value: string) => {
    const next = new Set(active);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  };

  return (
    <div className="flex gap-1.5">
      {options.map((opt) => {
        const isActive = active.has(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className="flex-1 py-1.5 px-2 rounded-lg border text-xs font-bold tracking-wide
                       transition-all duration-150 cursor-pointer"
            style={isActive ? {
              background: (opt.activeColor || opt.color || 'var(--accent)') + '20',
              borderColor: opt.activeColor || opt.color || 'var(--accent)',
              color: opt.activeColor || opt.color || 'var(--accent)',
            } : {
              background: 'var(--bg-surface2)',
              borderColor: 'var(--border)',
              color: 'var(--text-muted)',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
