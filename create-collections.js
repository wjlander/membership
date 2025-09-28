#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Configuration
const POCKETBASE_URL = 'https://p.ringing.org.uk';
const ADMIN_EMAIL = process.argv[2];
const ADMIN_PASSWORD = process.argv[3];

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.log('Usage: node create-collections.js <admin-email> <admin-password>');
  process.exit(1);
}

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;
    
    const req = protocol.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        console.log(`Response status: ${res.statusCode}`);
        console.log(`Response body: ${body.substring(0, 200)}...`);
        
        try {
          const result = body ? JSON.parse(body) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(result);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${result.message || body}`));
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}. Response was: ${body.substring(0, 100)}`));
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Parse URL
const url = new URL(POCKETBASE_URL);
const baseOptions = {
  hostname: url.hostname,
  port: url.port,
  protocol: url.protocol,
  headers: {
    'Content-Type': 'application/json'
  }
};

let authToken = '';

async function authenticate() {
  console.log('🔐 Authenticating admin...');
  
  // First, let's test if the API is accessible
  console.log('Testing API accessibility...');
  const testOptions = {
    ...baseOptions,
    path: '/api/health',
    method: 'GET'
  };
  
  try {
    await makeRequest(testOptions);
    console.log('✅ API is accessible');
  } catch (error) {
    console.log('⚠️  Health check failed, trying authentication anyway...');
  }
  
  const options = {
    ...baseOptions,
    path: '/api/admins/auth-with-password',
    method: 'POST'
  };

  const authData = {
    identity: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  };

  try {
    const result = await makeRequest(options, authData);
    authToken = result.token;
    console.log('✅ Authentication successful');
    return result;
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    throw error;
  }
}

async function createCollection(collectionData) {
  console.log(`📦 Creating collection: ${collectionData.name}`);
  
  const options = {
    ...baseOptions,
    path: '/api/collections',
    method: 'POST',
    headers: {
      ...baseOptions.headers,
      'Authorization': `Bearer ${authToken}`
    }
  };

  try {
    const result = await makeRequest(options, collectionData);
    console.log(`✅ Created collection: ${collectionData.name}`);
    return result;
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`⚠️  Collection ${collectionData.name} already exists, skipping`);
      return null;
    }
    console.error(`❌ Failed to create collection ${collectionData.name}:`, error.message);
    throw error;
  }
}

async function updateUsersCollection() {
  console.log('👥 Updating users collection...');
  
  // First, get the users collection
  const getOptions = {
    ...baseOptions,
    path: '/api/collections/users',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  };

  try {
    const usersCollection = await makeRequest(getOptions);
    
    // Add new fields to existing schema
    const newFields = [
      {
        name: "tenant_id",
        type: "relation",
        required: true,
        options: {
          collectionId: "organizations",
          cascadeDelete: false,
          maxSelect: 1
        }
      },
      {
        name: "name",
        type: "text",
        required: true,
        options: {}
      },
      {
        name: "role",
        type: "select",
        required: true,
        options: {
          maxSelect: 1,
          values: ["member", "admin", "super_admin"]
        }
      },
      {
        name: "status",
        type: "select",
        required: true,
        options: {
          maxSelect: 1,
          values: ["pending", "active", "inactive", "suspended"]
        }
      },
      {
        name: "phone",
        type: "text",
        required: false,
        options: {}
      },
      {
        name: "address",
        type: "json",
        required: false,
        options: {}
      },
      {
        name: "preferences",
        type: "json",
        required: false,
        options: {}
      }
    ];

    // Merge with existing schema, avoiding duplicates
    const existingFieldNames = usersCollection.schema.map(f => f.name);
    const fieldsToAdd = newFields.filter(f => !existingFieldNames.includes(f.name));
    
    if (fieldsToAdd.length === 0) {
      console.log('✅ Users collection already has all required fields');
      return;
    }

    const updatedSchema = [...usersCollection.schema, ...fieldsToAdd];

    const updateOptions = {
      ...baseOptions,
      path: '/api/collections/users',
      method: 'PATCH',
      headers: {
        ...baseOptions.headers,
        'Authorization': `Bearer ${authToken}`
      }
    };

    const updateData = {
      schema: updatedSchema
    };

    await makeRequest(updateOptions, updateData);
    console.log('✅ Updated users collection');
  } catch (error) {
    console.error('❌ Failed to update users collection:', error.message);
    throw error;
  }
}

// Collection definitions
const collections = [
  {
    name: "organizations",
    type: "base",
    schema: [
      {
        name: "name",
        type: "text",
        required: true,
        options: {}
      },
      {
        name: "subdomain",
        type: "text",
        required: true,
        unique: true,
        options: {}
      },
      {
        name: "logo",
        type: "url",
        required: false,
        options: {}
      },
      {
        name: "settings",
        type: "json",
        required: false,
        options: {}
      },
      {
        name: "status",
        type: "select",
        required: true,
        options: {
          maxSelect: 1,
          values: ["active", "inactive", "suspended"]
        }
      },
      {
        name: "primary_color",
        type: "text",
        required: false,
        options: {}
      },
      {
        name: "contact_email",
        type: "email",
        required: false,
        options: {}
      }
    ]
  },
  {
    name: "membership_types",
    type: "base",
    schema: [
      {
        name: "tenant_id",
        type: "relation",
        required: true,
        options: {
          collectionId: "organizations",
          cascadeDelete: false,
          maxSelect: 1
        }
      },
      {
        name: "name",
        type: "text",
        required: true,
        options: {}
      },
      {
        name: "description",
        type: "text",
        required: false,
        options: {}
      },
      {
        name: "price",
        type: "number",
        required: true,
        options: {
          min: 0
        }
      },
      {
        name: "duration_months",
        type: "number",
        required: true,
        options: {
          min: 1,
          noDecimal: true
        }
      },
      {
        name: "benefits",
        type: "json",
        required: false,
        options: {}
      },
      {
        name: "active",
        type: "bool",
        required: false,
        options: {}
      }
    ]
  },
  {
    name: "memberships",
    type: "base",
    schema: [
      {
        name: "tenant_id",
        type: "relation",
        required: true,
        options: {
          collectionId: "organizations",
          cascadeDelete: false,
          maxSelect: 1
        }
      },
      {
        name: "user_id",
        type: "relation",
        required: true,
        options: {
          collectionId: "users",
          cascadeDelete: false,
          maxSelect: 1
        }
      },
      {
        name: "membership_type_id",
        type: "relation",
        required: true,
        options: {
          collectionId: "membership_types",
          cascadeDelete: false,
          maxSelect: 1
        }
      },
      {
        name: "status",
        type: "select",
        required: true,
        options: {
          maxSelect: 1,
          values: ["active", "expired", "suspended", "cancelled"]
        }
      },
      {
        name: "start_date",
        type: "date",
        required: true,
        options: {}
      },
      {
        name: "end_date",
        type: "date",
        required: true,
        options: {}
      },
      {
        name: "auto_renew",
        type: "bool",
        required: false,
        options: {}
      },
      {
        name: "payment_reference",
        type: "text",
        required: false,
        options: {}
      }
    ]
  },
  {
    name: "mailing_lists",
    type: "base",
    schema: [
      {
        name: "tenant_id",
        type: "relation",
        required: true,
        options: {
          collectionId: "organizations",
          cascadeDelete: false,
          maxSelect: 1
        }
      },
      {
        name: "name",
        type: "text",
        required: true,
        options: {}
      },
      {
        name: "description",
        type: "text",
        required: false,
        options: {}
      },
      {
        name: "type",
        type: "select",
        required: true,
        options: {
          maxSelect: 1,
          values: ["mandatory", "optional"]
        }
      },
      {
        name: "active",
        type: "bool",
        required: false,
        options: {}
      }
    ]
  },
  {
    name: "list_subscriptions",
    type: "base",
    schema: [
      {
        name: "tenant_id",
        type: "relation",
        required: true,
        options: {
          collectionId: "organizations",
          cascadeDelete: false,
          maxSelect: 1
        }
      },
      {
        name: "user_id",
        type: "relation",
        required: true,
        options: {
          collectionId: "users",
          cascadeDelete: false,
          maxSelect: 1
        }
      },
      {
        name: "list_id",
        type: "relation",
        required: true,
        options: {
          collectionId: "mailing_lists",
          cascadeDelete: false,
          maxSelect: 1
        }
      },
      {
        name: "subscribed",
        type: "bool",
        required: false,
        options: {}
      }
    ]
  }
];

async function main() {
  try {
    console.log('🚀 Starting PocketBase collection setup...\n');
    
    // Authenticate
    await authenticate();
    
    // Create collections in order (organizations first, then others)
    for (const collection of collections) {
      await createCollection(collection);
    }
    
    // Update users collection with additional fields
    await updateUsersCollection();
    
    console.log('\n🎉 All collections created successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Go to https://p.ringing.org.uk:8443/_/');
    console.log('2. Create test organization with subdomain "demo-org"');
    console.log('3. Create test users and membership types');
    
  } catch (error) {
    console.error('\n💥 Setup failed:', error.message);
    process.exit(1);
  }
}

main();