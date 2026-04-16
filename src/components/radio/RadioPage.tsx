import AuthProvider from '../shared/AuthProvider';
import ErrorBoundary from '../shared/ErrorBoundary';
import Header from '../shared/Header';
import RadioMap from '../radio/RadioMap';

export default function RadioPage() {
  return (
    <AuthProvider>
      <div className="h-screen flex flex-col">
        <Header currentPage="/radio" showAuth={true} />
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <h1 className="sr-only">Radio Map — Estações FM e AM do Brasil</h1>
          <ErrorBoundary>
            <RadioMap />
          </ErrorBoundary>
        </main>
      </div>
    </AuthProvider>
  );
}
