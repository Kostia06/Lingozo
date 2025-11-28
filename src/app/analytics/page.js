import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import AnalyticsContent from '@/components/AnalyticsContent';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Analytics - Lingozo',
  description: 'Track your language learning progress',
};

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
          <Navbar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-300">Loading analytics...</p>
            </div>
          </div>
        </div>
      }
    >
      <AnalyticsContent />
    </Suspense>
  );
}
