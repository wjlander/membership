'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Shield, Mail, CreditCard, Loader as Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, organization, isInitialized, initialize } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Setup Required
          </h2>
          <p className="text-gray-600 mb-4">
            PocketBase is not running or no organization data exists.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <h3 className="font-semibold text-blue-900 mb-2">Quick Setup:</h3>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Download and run PocketBase</li>
              <li>2. Import schema from pocketbase/pb_schema.json</li>
              <li>3. Create test organization with subdomain "demo-org"</li>
              <li>4. Refresh this page</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: Users,
      title: 'Member Management',
      description: 'Complete profile management and membership tracking',
    },
    {
      icon: Shield,
      title: 'Secure Access',
      description: 'Role-based access control and data protection',
    },
    {
      icon: Mail,
      title: 'Communication Hub',
      description: 'Manage subscriptions and stay connected',
    },
    {
      icon: CreditCard,
      title: 'Digital Membership Cards',
      description: 'Download cards for Google Wallet and Apple Wallet',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              {organization.logo ? (
                <img
                  className="h-8 w-8"
                  src={organization.logo}
                  alt={organization.name}
                />
              ) : (
                <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {organization.name.charAt(0)}
                  </span>
                </div>
              )}
              <h1 className="ml-3 text-lg font-semibold text-gray-900">
                {organization.name}
              </h1>
            </div>
            <Button onClick={() => router.push('/auth')}>
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            Welcome to{' '}
            <span className="text-blue-600">{organization.name}</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-xl text-gray-600">
            Your comprehensive membership management platform. Join our community and access exclusive benefits, communications, and digital services.
          </p>
          <div className="mt-8 flex justify-center space-x-4">
            <Button
              size="lg"
              onClick={() => router.push('/auth')}
              className="px-8 py-3"
            >
              Join Now
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push('/auth')}
              className="px-8 py-3"
            >
              Sign In
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="text-center">
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <Card className="bg-blue-600 text-white">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-white">
              Ready to Get Started?
            </CardTitle>
            <CardDescription className="text-blue-100">
              Join {organization.name} today and become part of our community.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => router.push('/auth')}
              className="px-8 py-3"
            >
              Create Your Account
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}