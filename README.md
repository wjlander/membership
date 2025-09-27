# Multi-Tenant Membership Management Platform

A comprehensive membership management system built with Next.js and PocketBase, designed for multiple organizations with complete data isolation.

## Phase 1 - Foundation ✅

This phase includes:
- Multi-tenant architecture with PocketBase backend
- Secure authentication system with role-based access
- Member registration and login functionality
- Basic dashboard for members
- Organization-specific branding and isolation

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set up PocketBase

Download PocketBase from https://pocketbase.io/docs/ and run:

```bash
# Download PocketBase (replace with your OS)
wget https://github.com/pocketbase/pocketbase/releases/download/v0.20.0/pocketbase_0.20.0_linux_amd64.zip
unzip pocketbase_0.20.0_linux_amd64.zip

# Run PocketBase
./pocketbase serve
```

### 3. Import Database Schema

1. Open PocketBase Admin UI at http://127.0.0.1:8090/_/
2. Create an admin account
3. Go to Settings > Import collections
4. Import the schema from `pocketbase/pb_schema.json`

### 4. Create Test Data

In PocketBase Admin UI:

1. **Create an Organization:**
   - Go to Collections > organizations
   - Add new record:
     - name: "Demo Organization"
     - subdomain: "demo-org"
     - status: "active"

2. **Create an Admin User:**
   - Go to Collections > users
   - Add new record:
     - email: "admin@demo-org.com"
     - password: "password123"
     - name: "Admin User"
     - tenant_id: [select the organization you created]
     - role: "admin"
     - status: "active"

### 5. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000?tenant=demo-org to test the application.

## Multi-Tenancy

The system supports multi-tenancy through:

- **Subdomain-based routing**: Each organization has its own subdomain
- **Row-level security**: All data is isolated by tenant_id
- **Organization-specific branding**: Logo and settings per organization

### Development Testing

For local development, you can test different tenants using the `tenant` query parameter:
- http://localhost:3000?tenant=demo-org
- http://localhost:3000?tenant=another-org

## Architecture

### Database Schema

- **organizations**: Tenant definitions with branding and settings
- **users**: Members and admins with tenant isolation
- **membership_types**: Organization-specific membership plans

### Security

- Row-level security ensures data isolation between tenants
- Role-based access control (member, admin, super_admin)
- JWT-based authentication with tenant validation

## Next Steps (Phase 2)

- Membership type management
- Email integration with Resend
- Advanced member profile management
- Admin dashboard for member management
- Communication preferences system

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: PocketBase (Go-based)
- **Database**: SQLite (embedded with PocketBase)
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod validation
- **UI Components**: Custom components with Radix UI primitives