'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { Header } from '@/components/layout/header';
import { MemberDashboard } from '@/components/dashboard/member-dashboard';

export default function DashboardPage() {
  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main>
          <MemberDashboard />
        </main>
      </div>
    </AuthGuard>
  );
}