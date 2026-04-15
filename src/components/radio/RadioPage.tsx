import AuthProvider from '../shared/AuthProvider';
import Header from '../shared/Header';
import RadioMap from '../radio/RadioMap';

export default function RadioPage() {
  return (
    <AuthProvider>
      <div className="h-screen flex flex-col">
        <Header currentPage="/radio" showAuth={true} />
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <RadioMap />
        </main>
      </div>
    </AuthProvider>
  );
}
