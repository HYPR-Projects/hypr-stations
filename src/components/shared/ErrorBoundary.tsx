import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
  showDetails: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, componentStack: null, showDetails: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[HYPR Station] Component error:', error, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? null });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    const { error, componentStack, showDetails } = this.state;

    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-lg w-full">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-red-400)] bg-opacity-10 flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-red-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="font-heading text-[15px] font-semibold text-[var(--text-primary)] mb-2">
            Algo deu errado
          </h2>
          <p className="text-[13px] text-[var(--text-muted)] mb-4 leading-relaxed">
            Não foi possível carregar este módulo. Tente recarregar a página.
          </p>
          <div className="flex gap-2 justify-center mb-4">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-[10px] bg-[var(--accent)] text-[var(--on-accent)]
                         font-heading font-semibold text-[12px] cursor-pointer hover:opacity-90 transition-opacity
                         border-0 outline-none"
            >
              Recarregar
            </button>
            <button
              onClick={() => this.setState(s => ({ showDetails: !s.showDetails }))}
              className="px-5 py-2.5 rounded-[10px] bg-transparent text-[var(--text-muted)]
                         font-heading font-semibold text-[12px] cursor-pointer
                         border-[0.5px] border-[var(--border)] hover:text-[var(--text-primary)]
                         hover:border-[var(--border-hover)] transition-colors outline-none"
            >
              {showDetails ? 'Ocultar detalhes' : 'Ver detalhes'}
            </button>
          </div>
          {showDetails && (
            <div className="text-left bg-[var(--bg-surface2)] border-[0.5px] border-[var(--border)]
                            rounded-[10px] p-4 overflow-auto max-h-80 text-[11px]"
                 style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace' }}>
              <div className="font-semibold text-[var(--color-red-400)] mb-2">
                {error?.name}: {error?.message}
              </div>
              {error?.stack && (
                <pre className="whitespace-pre-wrap break-all text-[var(--text-secondary)] mb-3">
                  {error.stack}
                </pre>
              )}
              {componentStack && (
                <>
                  <div className="font-semibold text-[var(--text-muted)] mt-2 mb-1">
                    Component stack:
                  </div>
                  <pre className="whitespace-pre-wrap break-all text-[var(--text-muted)]">
                    {componentStack}
                  </pre>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}
