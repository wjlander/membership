'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRole?: 'member' | 'admin' | 'super_admin';
  allowedRoles?: ('member' | 'admin' | 'super_admin')[];
}

export function AuthGuard({ 
  children, 
  requireAuth = true, 
  requiredRole,
  allowedRoles = ['member', 'admin', 'super_admin'] 
}: AuthGuardProps) {
  const { user, isLoading, isInitialized, initialize } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // Show loading while initializing
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600">
            Please sign in to access this page.
          </p>
        </div>
      </div>
    );
  }

  // Check role permissions - use requiredRole if provided, otherwise use allowedRoles
  if (user) {
    const rolesCheck = requiredRole 
      ? user.role === requiredRole || (requiredRole === 'admin' && user.role === 'super_admin')
      : allowedRoles.includes(user.role);
      
    if (!rolesCheck) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600">
              You don't have permission to access this page.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}