import { Header } from '@/components/layout/Header';
import { AuthProvider } from '@/components/providers/AuthProvider';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <Header />
        {children}
      </div>
    </AuthProvider>
  );
}
