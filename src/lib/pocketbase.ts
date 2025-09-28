import PocketBase from 'pocketbase';
import type { Organization, User, MembershipType, Membership, MailingList, ListSubscription } from './types';

// PocketBase client singleton
class PocketBaseClient {
  private static instance: PocketBase;

  public static getInstance(): PocketBase {
    if (!PocketBaseClient.instance) {
      const url = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';
      PocketBaseClient.instance = new PocketBase(url);
    }
    return PocketBaseClient.instance;
  }
}

export const pb = PocketBaseClient.getInstance();

// Helper functions for multi-tenant operations
export class TenantService {
  static async getOrganizationBySubdomain(subdomain: string): Promise<Organization | null> {
    try {
      const record = await pb.collection('organizations').getFirstListItem(
        `subdomain = "${subdomain}" && status = "active"`
      );
      return record as Organization;
    } catch (error) {
      console.warn(`Organization '${subdomain}' not found or PocketBase not accessible:`, error);
      return null;
    }
  }

  static async getCurrentTenant(): Promise<Organization | null> {
    if (typeof window === 'undefined') return null;
    
    const hostname = window.location.hostname;
    const subdomain = hostname.split('.')[0];
    
    // For development, check if subdomain is in the URL path or query
    if (hostname === 'localhost' || hostname.includes('127.0.0.1')) {
      const urlParams = new URLSearchParams(window.location.search);
      const tenantParam = urlParams.get('tenant');
      if (tenantParam) {
        return this.getOrganizationBySubdomain(tenantParam);
      }
      
      // Try to get default organization for development
      // Try to get default organization for development
      try {
        const records = await pb.collection('organizations').getList(1, 1, {
          filter: 'status = "active"'
        });
        if (records.items.length > 0) {
          return records.items[0] as Organization;
        }
        
        // If no organizations exist, return a development fallback
        console.warn('No organizations found in database. Using development fallback.');
        return {
          id: 'dev-org',
          name: 'Development Organization',
          subdomain: 'dev-org',
          status: 'active',
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        } as Organization;
      } catch (error) {
        console.warn('PocketBase not accessible. Using development fallback organization.');
        return {
          id: 'dev-org',
          name: 'Development Organization',
          subdomain: 'dev-org',
          status: 'active',
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        } as Organization;
      }
    }
    
    return this.getOrganizationBySubdomain(subdomain);
  }

  static setTenantContext(tenantId: string) {
    // Set tenant context for subsequent requests
    pb.beforeSend = function (url, options) {
      options.headers = {
        ...options.headers,
        'X-Tenant-ID': tenantId,
      };
      return { url, options };
    };
  }
}

// Authentication helpers
export class AuthService {
  static async login(email: string, password: string, tenantId: string) {
    try {
      TenantService.setTenantContext(tenantId);
      const authData = await pb.collection('users').authWithPassword(email, password);
      
      // Verify user belongs to the correct tenant
      if (authData.record.tenant_id !== tenantId) {
        await pb.authStore.clear();
        throw new Error('Invalid credentials for this organization');
      }
      
      return authData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  static async register(userData: {
    email: string;
    password: string;
    passwordConfirm: string;
    name: string;
    tenant_id: string;
  }) {
    try {
      TenantService.setTenantContext(userData.tenant_id);
      
      const record = await pb.collection('users').create({
        ...userData,
        role: 'member',
        status: 'pending',
      });
      
      return record;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  static logout() {
    pb.authStore.clear();
  }

  static getCurrentUser(): User | null {
    return pb.authStore.model as User | null;
  }

  static isAuthenticated(): boolean {
    return pb.authStore.isValid;
  }
}

const getCurrentTenantId = (): string | null => {
  return pb.authStore.model?.tenant_id || null;
};

// Organization methods
export const getOrganization = async (id: string): Promise<Organization | null> => {
  try {
    return await pb.collection('organizations').getOne(id);
  } catch (error) {
    console.error('Error fetching organization:', error);
    return null;
  }
};

export const getOrganizationBySubdomain = async (subdomain: string): Promise<Organization | null> => {
  try {
    const records = await pb.collection('organizations').getList(1, 1, {
      filter: `subdomain = "${subdomain}"`
    });
    return records.items[0] || null;
  } catch (error) {
    console.error('Error fetching organization by subdomain:', error);
    return null;
  }
};

// User methods
export const getUsers = async (page = 1, perPage = 50, filter = '') => {
  return await pb.collection('users').getList(page, perPage, {
    filter: filter ? `name ~ "${filter}" || email ~ "${filter}"` : '',
    sort: '-created',
    expand: 'tenant_id'
  });
};

export const updateUserStatus = async (userId: string, status: string) => {
  return await pb.collection('users').update(userId, { status });
};

// Membership Type methods
export const getMembershipTypes = async () => {
  return await pb.collection('membership_types').getFullList({
    filter: 'active = true',
    sort: 'price'
  });
};

export const createMembershipType = async (data: Partial<MembershipType>) => {
  return await pb.collection('membership_types').create({
    ...data,
    tenant_id: getCurrentTenantId()
  });
};

export const updateMembershipType = async (id: string, data: Partial<MembershipType>) => {
  return await pb.collection('membership_types').update(id, data);
};

// Membership methods
export const getMemberships = async (page = 1, perPage = 50, filter = '') => {
  return await pb.collection('memberships').getList(page, perPage, {
    filter,
    sort: '-created',
    expand: 'user_id,membership_type_id'
  });
};

export const createMembership = async (data: Partial<Membership>) => {
  return await pb.collection('memberships').create({
    ...data,
    tenant_id: getCurrentTenantId()
  });
};

export const updateMembership = async (id: string, data: Partial<Membership>) => {
  return await pb.collection('memberships').update(id, data);
};

// Mailing List methods
export const getMailingLists = async () => {
  return await pb.collection('mailing_lists').getFullList({
    filter: 'active = true',
    sort: 'name'
  });
};

export const createMailingList = async (data: Partial<MailingList>) => {
  return await pb.collection('mailing_lists').create({
    ...data,
    tenant_id: getCurrentTenantId()
  });
};

// List Subscription methods
export const getUserSubscriptions = async (userId: string) => {
  return await pb.collection('list_subscriptions').getFullList({
    filter: `user_id = "${userId}"`,
    expand: 'list_id'
  });
};

export const updateSubscription = async (userId: string, listId: string, subscribed: boolean) => {
  try {
    // Try to find existing subscription
    const existing = await pb.collection('list_subscriptions').getFirstListItem(`user_id = "${userId}" && list_id = "${listId}"`);
    return await pb.collection('list_subscriptions').update(existing.id, { subscribed });
  } catch (error) {
    // Create new subscription if it doesn't exist
    return await pb.collection('list_subscriptions').create({
      tenant_id: getCurrentTenantId(),
      user_id: userId,
      list_id: listId,
      subscribed
    });
  }
};

// Dashboard stats
export const getDashboardStats = async () => {
  const tenantId = getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant context');

  const [users, memberships] = await Promise.all([
    pb.collection('users').getList(1, 1, { filter: `tenant_id = "${tenantId}"` }),
    pb.collection('memberships').getList(1, 1, { filter: `tenant_id = "${tenantId}"` })
  ]);

  const activeUsers = await pb.collection('users').getList(1, 1, {
    filter: `tenant_id = "${tenantId}" && status = "active"`
  });

  const pendingUsers = await pb.collection('users').getList(1, 1, {
    filter: `tenant_id = "${tenantId}" && status = "pending"`
  });

  const activeMemberships = await pb.collection('memberships').getList(1, 1, {
    filter: `tenant_id = "${tenantId}" && status = "active"`
  });

  // Calculate expiring memberships (next 30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const expiringMemberships = await pb.collection('memberships').getList(1, 1, {
    filter: `tenant_id = "${tenantId}" && status = "active" && end_date <= "${thirtyDaysFromNow.toISOString().split('T')[0]}"`
  });

  return {
    totalMembers: users.totalItems,
    activeMembers: activeUsers.totalItems,
    pendingMembers: pendingUsers.totalItems,
    totalMemberships: activeMemberships.totalItems,
    expiringMemberships: expiringMemberships.totalItems
  };
};

export default pb;