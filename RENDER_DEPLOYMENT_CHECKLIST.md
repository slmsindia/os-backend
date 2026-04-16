# 🚀 Render Deployment Checklist

## Pre-Deployment

### ✅ Code Preparation
- [ ] All changes committed to Git
- [ ] `prisma/schema.prisma` includes BusinessPartnerApplication model
- [ ] Migration file exists in `prisma/migrations/`
- [ ] `role-upgrade.controller.js` updated with business partner logic
- [ ] Tested locally (optional but recommended)

### ✅ Render Configuration
- [ ] `DATABASE_URL` set in Render Environment tab
- [ ] `NODE_ENV=production` set
- [ ] `JWT_SECRET` set
- [ ] `PORT=5000` set (or your preferred port)
- [ ] Database server is running and accessible

---

## Deployment Methods

### Method 1: Automatic (Recommended) ⭐

```bash
# 1. Stage all changes
git add .

# 2. Commit
git commit -m "Add business partner upgrade system"

# 3. Push
git push origin main
```

**What Render does automatically:**
- ✅ Detects new commit
- ✅ Runs `npm install`
- ✅ Executes `postinstall`: `npx prisma generate && npx prisma migrate deploy`
- ✅ Starts app with `npm start`

**Expected Time:** 2-3 minutes

---

### Method 2: Manual via Render Shell

1. **Go to:** Render Dashboard → Your Service → **Shell** tab

2. **Run:**
```bash
npx prisma generate
npx prisma migrate deploy
```

3. **Restart service** (if needed)

---

### Method 3: Using Shell Script

1. **Upload** `render-migrate.sh` to your repository
2. **Go to:** Render Shell
3. **Run:**
```bash
chmod +x render-migrate.sh
./render-migrate.sh
```

---

## Post-Deployment Verification

### ✅ Check Render Dashboard
- [ ] Build status: **Green** (success)
- [ ] Service status: **Live**
- [ ] No red error indicators

### ✅ Check Logs
Look for these success messages:
```
✅ Environment variables loaded from .env
📦 Prisma schema loaded from prisma/schema.prisma
🗄️  Datasource "db": PostgreSQL database "your_db"
✅ 1 migration(s) applied
🚀 Server running on port 5000
```

### ✅ Test API Endpoints

**1. Health Check:**
```bash
curl https://your-app.onrender.com/api/health
```
Expected: `{"status": "ok"}` or similar

**2. Test Business Partner Application:**
```bash
curl -X POST https://your-app.onrender.com/api/role-upgrade/request \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "targetRole": "BUSINESS_PARTNER",
    "businessDetails": {
      "companyName": "Test Company",
      "address": "Test Address",
      "city": "Test City",
      "state": "Test State",
      "pincode": "123456"
    }
  }'
```
Expected: `{"success": true, "message": "Upgrade request submitted..."}`

**3. Check Application Status:**
```bash
curl https://your-app.onrender.com/api/role-upgrade/my-status \
  -H "Authorization: Bearer YOUR_TOKEN"
```
Expected: Should include `businessApplication` field

### ✅ Verify Database

Connect to your database and run:

```sql
-- Check if BusinessPartnerApplication table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'BusinessPartnerApplication';

-- Check if BUSINESS_PARTNER is in Identity enum
SELECT enum_range(NULL::"Identity");

-- Count applications (should be 0 initially)
SELECT COUNT(*) FROM "BusinessPartnerApplication";
```

All queries should succeed without errors.

---

## 🚨 Troubleshooting

### Build Failed

**Symptoms:**
- Red X on Render dashboard
- Build logs show errors

**Common Causes & Fixes:**

1. **Prisma Schema Error:**
   ```bash
   # Fix locally
   npx prisma validate
   # Fix errors in schema.prisma
   git add prisma/schema.prisma
   git commit -m "Fix schema errors"
   git push
   ```

2. **Missing Dependencies:**
   ```bash
   # Check package.json has prisma in devDependencies
   # Ensure @prisma/client is in dependencies
   ```

3. **TypeScript/Compilation Errors:**
   ```bash
   # Check logs for specific error
   # Fix code locally
   # Commit and push again
   ```

---

### Migration Failed

**Symptoms:**
- Logs show "Migration failed"
- App crashes on startup

**Solutions:**

1. **Check Migration Status:**
   ```bash
   # On Render Shell
   npx prisma migrate status
   ```

2. **Resolve Conflicts:**
   ```bash
   # If migration already applied
   npx prisma migrate resolve --applied 20260414_add_business_partner_upgrade
   ```

3. **Reset (WARNING: Deletes Data):**
   ```bash
   # Only if you can afford data loss
   npx prisma migrate reset --force
   ```

---

### App Crashing

**Symptoms:**
- Service keeps restarting
- Logs show runtime errors

**Common Causes:**

1. **Missing Environment Variables:**
   - Check Render Environment tab
   - Ensure all required vars are set

2. **Database Connection Failed:**
   - Verify `DATABASE_URL` is correct
   - Check database server is running
   - Test connection string locally

3. **Prisma Client Not Generated:**
   ```bash
   # On Render Shell
   npx prisma generate
   # Restart service
   ```

---

## Rollback Plan

If something goes wrong:

### Option 1: Revert Code
```bash
git revert HEAD
git push origin main
```

### Option 2: Rollback Migration
```bash
# On Render Shell
npx prisma migrate resolve --rolled-back 20260414_add_business_partner_upgrade
```

### Option 3: Manual Database Fix
- Connect to database via psql/pgAdmin
- Manually drop or fix problematic tables
- Redeploy

---

## Success Criteria ✅

Your deployment is successful when:

- [x] Render shows **green "Live"** status
- [x] Build logs show **"1 migration(s) applied"**
- [x] App starts without crashes
- [x] Health check endpoint responds
- [x] Business partner API works
- [x] Database has `BusinessPartnerApplication` table
- [x] No error logs

---

## Performance Monitoring

After deployment, monitor:

1. **Response Times:**
   - Check Render metrics dashboard
   - Look for slow API responses

2. **Error Rates:**
   - Monitor error logs
   - Check for 500 errors

3. **Database Connections:**
   - Ensure connection pool isn't exhausted
   - Check database metrics

---

## Next Steps After Deployment

1. **Set Pricing (Optional):**
   ```bash
   PUT /api/admin/pricing/BUSINESS_PARTNER_UPGRADE
   {"amount": 5000, "isActive": true}
   ```

2. **Test Complete Flow:**
   - Create test user
   - Submit business partner application
   - Approve as admin
   - Verify business profile creation

3. **Update Frontend:**
   - Add business partner application form
   - Show application status
   - Admin dashboard for approvals

---

## Quick Reference Commands

```bash
# Local
npx prisma migrate dev --name add_business_partner_upgrade
npx prisma generate
npm run dev

# Deploy
git add . && git commit -m "Update" && git push

# Render Shell
npx prisma generate
npx prisma migrate deploy
npx prisma migrate status
```

---

## Documentation Files

- 📖 **Complete Guide:** `DEPLOY_PRISMA_TO_RENDER.md`
- 📋 **Quick Reference:** `RENDER_QUICK_REFERENCE.md`
- 🚀 **This Checklist:** `RENDER_DEPLOYMENT_CHECKLIST.md`
- 🔧 **Migration Script:** `render-migrate.sh`

---

## Need Help?

1. Check Render logs first
2. Review error messages
3. Check documentation files
4. Test locally to reproduce
5. Fix and redeploy

---

**🎯 Ready to deploy? Start with Method 1 (Automatic) - it's the easiest!**
