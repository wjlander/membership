import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { pb, User, Organization, AuthService, TenantService } from '@/lib/pocketbase';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  isLoading: boolean;
  isInitialized: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    passwordConfirm: string;
    name: string;
  }) => Promise<void>;
  logout: () => void;
  initialize: () => Promise<void>;
  setOrganization: (org: Organization) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      organization: null,
      isLoading: false,
      isInitialized: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const { organization } = get();
          if (!organization) {
            throw new Error('Organization not found');
          }

          const authData = await AuthService.login(email, password, organization.id);
          set({ 
            user: authData.record as User,
            isLoading: false 
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (userData) => {
        set({ isLoading: true });
        try {
          const { organization } = get();
          if (!organization) {
            throw new Error('Organization not found');
          }

          const record = await AuthService.register({
            ...userData,
            tenant_id: organization.id,
          });
          
          set({ isLoading: false });
          return record;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        AuthService.logout();
        set({ user: null });
      },

      initialize: async () => {
        set({ isLoading: true });
        try {
          // Get current organization from subdomain/URL
          const organization = await TenantService.getCurrentTenant();
          
          if (organization) {
            // Only set tenant context if not using development fallback
            if (organization.id !== 'dev-org') {
              TenantService.setTenantContext(organization.id);
            }
            set({ organization });
          }

          // Check if user is already authenticated
          if (pb.authStore.isValid) {
            const user = pb.authStore.model as User;
            // Verify user belongs to current organization
            if (organization && (user.tenant_id === organization.id || organization.id === 'dev-org')) {
              set({ user });
            } else {
              // Clear invalid auth
              pb.authStore.clear();
            }
          }

          set({ isInitialized: true, isLoading: false });
        } catch (error) {
          console.error('Auth initialization error:', error);
          // Set fallback organization even on error
          const fallbackOrg = {
            id: 'dev-org',
            name: 'Development Organization',
            subdomain: 'dev-org',
            status: 'active' as const,
            created: new Date().toISOString(),
            updated: new Date().toISOString()
          };
          set({ 
            organization: fallbackOrg,
            isInitialized: true, 
            isLoading: false 
          });
        }
      },

      setOrganization: (org: Organization) => {
        set({ organization: org });
        TenantService.setTenantContext(org.id);
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        organization: state.organization,
      }),
    }
  )
);