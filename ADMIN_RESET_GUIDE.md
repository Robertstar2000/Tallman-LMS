# Admin User Reset Guide

## 🔐 Backdoor Admin Access

The Tallman LMS has a **backdoor admin account** that ensures you can always access the system to bootstrap and manage users.

### Default Admin Credentials

- **Email**: `robertstar@aol.com`
- **Password**: `Rm2214ri#`
- **Roles**: Admin, Instructor, Learner
- **Status**: Active (always)

## 🚨 When to Reset Admin User

Reset the admin user if:
- You can't log in with the default credentials
- The admin user was accidentally deleted
- The admin user's status was changed to 'hold'
- You need to restore full admin access

## 🛠️ How to Reset Admin User

### Option 1: Using Docker (Recommended for Docker Deployments)

```bash
# Reset admin user in Docker container
docker exec tallman-backend npm run reset-admin
```

### Option 2: Using npm (Local Development)

```bash
# Reset admin user locally
npm run reset-admin
```

### Option 3: Manual Script Execution

```bash
# Run the reset script directly
npx tsx reset-admin.ts
```

## ✅ What the Reset Does

The reset script will:

1. ✅ Check if `robertstar@aol.com` exists in the database
2. ✅ If exists: Update the user with:
   - Correct password hash for `Rm2214ri#`
   - Status set to `active`
   - Roles set to `['Admin', 'Instructor', 'Learner']`
   - Points: 2500
   - Level: 12
3. ✅ If doesn't exist: Create a new admin user with all the above settings
4. ✅ Display verification details

## 📋 Expected Output

When you run the reset, you should see:

```
🔧 ADMIN RESET: Restoring backdoor access for robertstar@aol.com...

✓ Found existing user: Robert Star (robertstar@aol.com)
  Current status: hold
  Current roles: ["Learner"]

✅ ADMIN RESET COMPLETE: User updated successfully!

📋 VERIFIED USER DETAILS:
  User ID: u_admin
  Name: Robert Star
  Email: robertstar@aol.com
  Password: Rm2214ri#
  Status: active
  Roles: ["Admin","Instructor","Learner"]
  Points: 2500
  Level: 12

🔐 LOGIN CREDENTIALS:
  Email: robertstar@aol.com
  Password: Rm2214ri#

✨ You can now log in with full admin access!
```

## 🔒 Backdoor Protection in Code

The application has **built-in backdoor protection** in the login endpoint (`server/index.ts`):

```typescript
// Force Robert to be active and Admin regardless of DB state
if (email.toLowerCase() === 'robertstar@aol.com') {
    console.error(`[AUTH] Industrial Master Detected. Applying Memory Override.`);
    user.status = 'active';
    user.roles = JSON.stringify(['Admin', 'Instructor', 'Learner']);
}
```

This means even if the database has the wrong status or roles, the login will override them at runtime.

## 🎯 After Reset - Next Steps

1. **Log in** to the application at http://localhost:3180
2. **Navigate to Workforce Registry** (Admin Console)
3. **Add new users** or approve pending users
4. **Grant roles** to users as needed

## 📝 Adding New Users

Once logged in as admin:

### Method 1: Approve Signups
1. Users sign up with `@tallmanequipment.com` email
2. They are created with status `hold`
3. Admin approves them in Workforce Registry
4. Admin grants appropriate roles

### Method 2: Direct Creation (Future Feature)
- Currently, users must sign up themselves
- Admin can then approve and assign roles

## 🔐 Security Notes

### Password Security
- The default password `Rm2214ri#` should be changed in production
- Update it in `server/seed.ts` and `reset-admin.ts`
- Ensure the password meets your security requirements

### Backdoor Access
- The backdoor is intentional for bootstrap purposes
- In production, consider:
  - Using environment variables for the backdoor email
  - Implementing additional security layers
  - Logging all backdoor access attempts

## 🐳 Docker-Specific Instructions

### Reset Admin in Running Container

```bash
# Method 1: Using npm script
docker exec tallman-backend npm run reset-admin

# Method 2: Direct script execution
docker exec tallman-backend npx tsx /app/reset-admin.ts

# Method 3: Interactive shell
docker exec -it tallman-backend /bin/bash
npm run reset-admin
exit
```

### Reset Admin After Fresh Build

```bash
# Stop containers
docker-compose down

# Rebuild (if needed)
docker-compose build

# Start containers
docker-compose up -d

# Wait for containers to be ready (10-15 seconds)
sleep 15

# Reset admin
docker exec tallman-backend npm run reset-admin
```

## 🔍 Troubleshooting

### Issue: "Cannot find module"
**Solution**: Make sure you're in the correct directory
```bash
cd /path/to/tallman-lms
npm run reset-admin
```

### Issue: "Database is locked"
**Solution**: Stop the backend server first
```bash
# For Docker
docker-compose stop backend
npm run reset-admin
docker-compose start backend

# For local dev
# Stop the dev server (Ctrl+C)
npm run reset-admin
npm run dev:backend
```

### Issue: "User still can't log in"
**Solution**: Check the backend logs
```bash
# For Docker
docker logs tallman-backend --tail 50

# For local dev
# Check the terminal where backend is running
```

Look for lines like:
```
[AUTH] Login Attempt: robertstar@aol.com
[AUTH] Industrial Master Detected. Applying Memory Override.
[AUTH] Success: Technician 'robertstar@aol.com' authenticated.
```

## 📚 Related Files

- `reset-admin.ts` - The reset script
- `server/seed.ts` - Initial seed data (includes admin user)
- `server/index.ts` - Login endpoint with backdoor logic
- `package.json` - Contains `reset-admin` npm script

## 🎓 Understanding the Workflow

1. **Initial Setup**: `npm run seed` creates all initial users including admin
2. **Ongoing Use**: Admin manages users through Workforce Registry
3. **Emergency Access**: `npm run reset-admin` restores admin access if needed
4. **Backdoor Protection**: Login endpoint ensures admin always has access

---

**Last Updated**: 2026-01-26  
**Script Location**: `reset-admin.ts`  
**Admin Email**: robertstar@aol.com  
**Default Password**: Rm2214ri#
