# 🚀 Tallman LMS - Quick Start Guide

## ✅ Current Status

Your Tallman LMS is **RUNNING** in Docker Desktop with all fixes applied!

## 🔗 Access URLs

- **Application**: http://localhost:3180
- **Backend API**: http://localhost:3185

## 🔐 Admin Login Credentials

```
Email:    robertstar@aol.com
Password: Rm2214ri#
```

## 🎯 Quick Commands

### Docker Management
```bash
# View status
docker-compose ps

# View logs
docker-compose logs -f

# Stop application
docker-compose down

# Start application
docker-compose up -d

# Restart application
docker-compose restart
```

### Admin User Management
```bash
# Reset admin user (if locked out)
docker exec tallman-backend npm run reset-admin

# Or locally
npm run reset-admin
```

## 📋 First Steps After Login

1. **Log in** at http://localhost:3180
   - Use: `robertstar@aol.com` / `Rm2214ri#`

2. **Navigate to Workforce Registry**
   - Click "Workforce Registry" in the admin menu

3. **Manage Users**
   - Approve pending users (status: hold)
   - Grant roles (Admin, Instructor, Manager, Learner, Mentor)
   - Assign courses to users

4. **Test the Delete Function**
   - Create a test user or use an existing one
   - Click the trash icon to delete
   - Check backend logs to verify only that user was deleted

## 🧪 Testing the Delete Fix

```bash
# Watch backend logs in real-time
docker logs tallman-backend -f

# In another terminal, delete a user via the UI
# You should see:
# [DELETE] Initiating deletion for user: [Name]
# [DELETE] Total users before deletion: X
# [DELETE] Successfully deleted user [Name]. All other users unaffected.
```

## 🛠️ Troubleshooting

### Can't Log In?
```bash
# Reset admin user
docker exec tallman-backend npm run reset-admin
```

### Containers Not Running?
```bash
# Check status
docker-compose ps

# Restart
docker-compose up -d
```

### Need Fresh Start?
```bash
# Complete reset
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d

# Wait 15 seconds, then reset admin
sleep 15
docker exec tallman-backend npm run reset-admin
```

## 📚 Documentation

- `ADMIN_RESET_GUIDE.md` - Admin user reset instructions
- `WORKFORCE_REGISTRY_DELETE_FIX.md` - Delete function fix details
- `DOCKER_DEPLOYMENT.md` - Complete Docker guide
- `README.md` - Full application documentation

## 🎓 User Workflow

### Adding New Users

1. **User Signs Up**
   - User goes to http://localhost:3180
   - Clicks "Sign Up"
   - Enters details with `@tallmanequipment.com` email
   - Account created with status: `hold`

2. **Admin Approves**
   - Admin logs in
   - Goes to Workforce Registry
   - Clicks "Approve Access" for the user
   - Status changes to `active`

3. **Admin Grants Roles**
   - Use "Grant Role" dropdown
   - Select: Admin, Instructor, Manager, Learner, or Mentor
   - User can now access appropriate features

4. **Admin Assigns Courses**
   - Click "Assign Track" button
   - Select course(s) from the list
   - User can now see and take the course

### Deleting Users

1. **Click trash icon** next to user in Workforce Registry
2. **Confirm deletion** in the popup
3. **Verify in logs** that only 1 user was deleted
4. **Check other users** are still present and unaffected

## 🔒 Security Notes

- Default password should be changed in production
- Backdoor access (`robertstar@aol.com`) is intentional for bootstrap
- All user deletions are logged with verification
- Only users with `@tallmanequipment.com` can sign up (except robertstar@aol.com)

## ✨ Recent Fixes Applied

✅ Workforce Registry delete function fixed  
✅ CASCADE constraints added to database  
✅ Safety verification prevents accidental mass deletion  
✅ Admin user reset script created  
✅ Backdoor access preserved and documented  

---

**Need Help?** Check the documentation files or view logs:
```bash
docker logs tallman-backend --tail 100
docker logs tallman-frontend --tail 100
```
