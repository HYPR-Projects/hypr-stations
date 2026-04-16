import { useId, type ReactNode } from 'react';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function MobileDrawer({ open, onClose, title, children }: MobileDrawerProps) {
  const titleId = useId();

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[1500] bg-[var(--overlay)]" style={{ backdropFilter: 'blur(2px)' }} onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby={titleId}
        className="fixed bottom-0 left-0 right-0 z-[1600] bg-[var(--bg-surface)] rounded-t-[16px] border-t border-[var(--border)] max-h-[85vh] flex flex-col animate-[slideUp_0.3s_cubic-bezier(0.32,0.72,0,1)]">
        <div className="w-9 h-1 bg-[var(--border-hover)] rounded-full mx-auto mt-3" />
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)]">
          <span id={titleId} className="text-[13px] font-semibold text-[var(--text-primary)]">{title}</span>
          <button onClick={onClose} aria-label="Fechar"
            className="w-7 h-7 rounded-lg bg-[var(--bg-surface2)] text-[var(--text-muted)] hover:bg-[var(--bg-surface3)] flex items-center justify-center cursor-pointer text-[13px] transition-colors">×</button>
        </div>
        <div className="overflow-y-auto flex-1">
          {children}
          <div className="p-5">
            <button onClick={onClose}
              className="w-full py-3 rounded-[10px] bg-[var(--accent)] text-[var(--on-accent)] font-heading font-semibold text-[13px] cursor-pointer hover:opacity-90 transition-opacity">
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
