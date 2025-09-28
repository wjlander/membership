import { AuthGuard } from '@/components/auth/auth-guard';
import AdminDashboard from '@/components/admin/admin-dashboard';

export default function AdminPage() {
  return (
    <AuthGuard requireAuth={true} requiredRole="admin">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage members, memberships, and organization settings
          </p>
        </div>
        <AdminDashboard />
      </div>
    </AuthGuard>
  );
}