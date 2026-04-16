import { useAuth } from './AuthProvider';

export default function LoginButton() {
  const { user, login, logout } = useAuth();

  return (
    <button
      onClick={user ? logout : login}
      aria-label={user ? `Logado como ${user.name}. Clique para sair.` : 'Fazer login com Google (restrito a HYPR)'}
      className={`flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12px] font-medium tracking-[0.01em]
                  cursor-pointer whitespace-nowrap transition-all duration-200 bg-transparent
                  ${user
                    ? 'border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-muted)]'
                    : 'border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]'
                  }`}
    >
      {user ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 9.9-1" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      )}
      <span className="hidden md:inline">
        {user ? user.name.split(' ')[0] : 'HYPR'}
      </span>
    </button>
  );
}
