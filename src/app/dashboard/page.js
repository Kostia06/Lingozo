import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import DashboardContent from '@/components/DashboardContent';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard - Lingozo',
  description: 'Your language learning conversations',
};

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-900 to-black">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
            <p className="text-white">Loading dashboard...</p>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
