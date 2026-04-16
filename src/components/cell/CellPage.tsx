import AuthProvider from '../shared/AuthProvider';
import Header from '../shared/Header';
import CellMap from './CellMap';

export default function CellPage() {
  return (
    <AuthProvider>
      <div className="h-screen flex flex-col">
        <Header currentPage="/cell" showAuth={true} />
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <CellMap />
        </main>
      </div>
    </AuthProvider>
  );
}
