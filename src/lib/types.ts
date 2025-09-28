export interface Organization {
  id: string;
  name: string;
  subdomain: string;
  logo?: string;
  settings?: Record<string, any>;
  status: 'active' | 'inactive' | 'suspended';
  primary_color?: string;
  contact_email?: string;
  created: string;
  updated: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  tenant_id: string;
  role: 'member' | 'admin' | 'super_admin';
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  preferences?: Record<string, any>;
  avatar?: string;
  created: string;
  updated: string;
  expand?: {
    tenant_id?: Organization;
  };
}

export interface MembershipType {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  price: number;
  duration_months: number;
  benefits?: string[];
  active: boolean;
  created: string;
  updated: string;
}

export interface Membership {
  id: string;
  tenant_id: string;
  user_id: string;
  membership_type_id: string;
  status: 'active' | 'expired' | 'suspended' | 'cancelled';
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  payment_reference?: string;
  created: string;
  updated: string;
  expand?: {
    user_id?: User;
    membership_type_id?: MembershipType;
  };
}

export interface MailingList {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  type: 'mandatory' | 'optional';
  active: boolean;
  created: string;
  updated: string;
}

export interface ListSubscription {
  id: string;
  tenant_id: string;
  user_id: string;
  list_id: string;
  subscribed: boolean;
  created: string;
  updated: string;
  expand?: {
    list_id?: MailingList;
  };
}

export interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  pendingMembers: number;
  totalMemberships: number;
  expiringMemberships: number;
}