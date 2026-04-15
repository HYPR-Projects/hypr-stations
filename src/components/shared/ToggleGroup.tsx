interface ToggleOption {
  value: string;
  label: string;
  color?: string;
}

interface ToggleGroupProps {
  label?: string;
  options: ToggleOption[];
  active: Set<string>;
  onChange: (active: Set<string>) => void;
}

export default function ToggleGroup({ label, options, active, onChange }: ToggleGroupProps) {
  const toggle = (value: string) => {
    const next = new Set(active);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  };

  return (
    <div role="group" aria-label={label || 'Toggle options'} className="flex gap-1.5">
      {options.map((opt) => {
        const isActive = active.has(opt.value);
        const color = opt.color || 'var(--accent)';
        return (
          <button
            key={opt.value}
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={() => toggle(opt.value)}
            className="flex-1 py-1 px-2 rounded-lg text-[11px] font-medium
                       transition-all duration-150 cursor-pointer border"
            style={isActive ? {
              background: color + '15',
              borderColor: color + '40',
              color: color,
            } : {
              background: 'transparent',
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
