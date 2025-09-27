'use client';

import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { LogOut, User, Settings } from 'lucide-react';

export function Header() {
  const { user, organization, logout } = useAuthStore();

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Organization Name */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {organization?.logo ? (
                <img
                  className="h-8 w-8"
                  src={organization.logo}
                  alt={organization.name}
                />
              ) : (
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {organization?.name?.charAt(0) || 'M'}
                  </span>
                </div>
              )}
            </div>
            <div className="ml-3">
              <h1 className="text-lg font-semibold text-gray-900">
                {organization?.name || 'Membership Portal'}
              </h1>
            </div>
          </div>

          {/* User Menu */}
          {user && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">{user.name}</span>
                {user.role === 'admin' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Admin
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {user.role === 'admin' && (
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export { Header }