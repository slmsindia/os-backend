# Deploy Prisma Migration to Render - Complete Guide

## 🚀 Quick Deploy (Choose One Method)

---

## Method 1: Automatic Deployment via Git Push (Recommended)

Your `package.json` already has the right scripts! Just push your code:

### Steps:

```bash
# 1. Commit your changes
git add .
git commit -m "Add business partner upgrade system"

# 2. Push to your repository
git push origin main

# 3. Render will automatically:
#    - Run npm install
#    - Execute postinstall script: "npx prisma generate && npx prisma migrate deploy"
#    - Deploy your app with new schema
```

✅ **That's it!** Render will handle the migration automatically.

---

## Method 2: Manual Deployment via Render Dashboard

### Step 1: Update Prisma on Render

1. Go to **Render Dashboard** → Your Web Service
2. Click **Environment** tab
3. Ensure `DATABASE_URL` is set correctly
4. Go to **Shell** tab (or use Render CLI)
5. Run these commands:

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy
```

---

## Method 3: Using Render CLI

```bash
# Login to Render
render login

# Deploy with migration
render exec "npx prisma migrate deploy" --service your-service-name
```

---

## ⚠️ Important: Prisma Migration Strategy for Production

### ❌ DON'T use in production:
```bash
npx prisma migrate dev  # This is for development only!
```

### ✅ DO use in production:
```bash
npx prisma migrate deploy  # This is for production!
```

---

## 🔧 Update package.json Scripts (Already Done!)

Your `package.json` already has the correct setup:

```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "prisma:migrate": "prisma migrate dev",
    "prisma:generate": "prisma generate",
    "prisma:deploy": "prisma migrate deploy",
    "postinstall": "npx prisma generate && npx prisma migrate deploy"
  }
}
```

**The `postinstall` script ensures migrations run automatically on every deploy!**

---

## 📋 Pre-Deployment Checklist

Before deploying to Render, verify:

- [ ] Database schema changes are in `prisma/schema.prisma`
- [ ] Migration file exists in `prisma/migrations/`
- [ ] `DATABASE_URL` is set in Render environment variables
- [ ] Database server is accessible from Render
- [ ] No syntax errors in Prisma schema

---

## 🚨 Troubleshooting

### Issue 1: "Can't reach database server"

**Solution:**
1. Check Render Environment Variables
2. Verify `DATABASE_URL` is correct
3. Ensure database allows connections from Render's IP
4. Test connection locally first

### Issue 2: "Migration already applied"

**Solution:**
```bash
# Reset migrations (WARNING: deletes data)
npx prisma migrate reset

# OR mark migration as applied
npx prisma migrate resolve --applied 20260414_add_business_partner_upgrade
```

### Issue 3: "Prisma Client not generated"

**Solution:**
```bash
# Manually generate
npx prisma generate

# Then redeploy
```

### Issue 4: Schema validation errors

**Solution:**
```bash
# Validate schema locally first
npx prisma validate

# Fix any errors before deploying
```

---

## 📊 Monitor Migration on Render

### View Logs:
1. Go to Render Dashboard → Your Service
2. Click **Logs** tab
3. Look for:
   ```
   Prisma schema loaded from prisma/schema.prisma
   Datasource "db": PostgreSQL database
   X migration(s) applied
   ```

### Common Log Messages:

✅ **Success:**
```
✅ Environment variables loaded from .env
📦 Prisma schema loaded from prisma/schema.prisma
🗄️  Datasource "db": PostgreSQL database "osdb1"
✅ 1 migration(s) applied
🚀 Server running on port 5000
```

❌ **Error:**
```
❌ Error: P1001: Can't reach database server
❌ Error: P1002: Database server was not found
❌ Error: Migration `20260414_add_business_partner_upgrade` failed
```

---

## 🔐 Environment Variables on Render

Ensure these are set in Render **Environment** tab:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname?schema=public
NODE_ENV=production
JWT_SECRET=your_production_jwt_secret
PORT=5000
```

**Never commit `.env` to Git!**

---

## 🎯 Step-by-Step Deployment Flow

### 1. Test Locally First (Optional but Recommended)

```bash
# Generate migration locally
npx prisma migrate dev --name add_business_partner_upgrade

# Test locally
npm run dev

# Verify everything works
```

### 2. Commit and Push

```bash
git add prisma/schema.prisma
git add prisma/migrations/
git add src/controllers/role-upgrade.controller.js
git commit -m "Add business partner upgrade system"
git push origin main
```

### 3. Render Auto-Deploys

Render will automatically:
1. Detect new commit
2. Run `npm install`
3. Execute `postinstall` script:
   - `npx prisma generate`
   - `npx prisma migrate deploy`
4. Start your app with `npm start`

### 4. Verify Deployment

```bash
# Check Render logs
# Look for successful migration

# Test the API
curl https://your-app.onrender.com/api/health
```

---

## 🛠️ Advanced: Manual Migration Commands

If you need to run migrations manually on Render:

### Via Render Shell:
```bash
# Access Render web service shell
# Run these commands:

# 1. Check migration status
npx prisma migrate status

# 2. Deploy pending migrations
npx prisma migrate deploy

# 3. Verify
npx prisma migrate status
```

### Via Render CLI:
```bash
# Install Render CLI
npm install -g @render/cli

# Login
render login

# Execute migration
render exec "npx prisma migrate deploy" --service your-service-id
```

---

## 📦 What Gets Deployed

### Files That Matter:
```
prisma/
├── schema.prisma                    ✅ Required
└── migrations/
    └── 20260414_add_business_partner_upgrade/
        └── migration.sql            ✅ Required

src/
└── controllers/
    └── role-upgrade.controller.js   ✅ Required

package.json                         ✅ Required
```

---

## ⏱️ Expected Deployment Time

- **Prisma Generate:** ~10-20 seconds
- **Prisma Migrate Deploy:** ~5-15 seconds
- **App Startup:** ~5-10 seconds
- **Total:** ~30-45 seconds

---

## 🔄 Rollback Plan

If migration fails:

### Option 1: Revert Code
```bash
git revert HEAD
git push origin main
```

### Option 2: Rollback Migration
```bash
# On Render shell
npx prisma migrate resolve --rolled-back 20260414_add_business_partner_upgrade
```

### Option 3: Manual Database Fix
```sql
-- Connect to your database
-- Manually remove/fix the problematic migration
```

---

## ✅ Post-Deployment Verification

After successful deployment, test:

```bash
# 1. Check API is running
curl https://your-app.onrender.com/api/health

# 2. Test business partner application
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

# 3. Check database
# Connect to your database and verify:
# - BusinessPartnerApplication table exists
# - Identity enum includes BUSINESS_PARTNER
```

---

## 🎉 Success Indicators

You'll know it worked when:

✅ Render logs show: "1 migration(s) applied"  
✅ App starts without errors  
✅ API responds to requests  
✅ Database has new `BusinessPartnerApplication` table  
✅ `BUSINESS_PARTNER` is in Identity enum  

---

## 📞 Support Resources

- **Prisma Docs:** https://www.prisma.io/docs/concepts/components/prisma-migrate
- **Render Docs:** https://render.com/docs/deploy-prisma
- **Migration Guide:** https://www.prisma.io/docs/guides/migrate/developing-with-prisma-migrate/deploying-database-changes

---

## 🚀 Quick Command Summary

```bash
# Local testing
npx prisma migrate dev --name add_business_partner_upgrade
npx prisma generate
npm run dev

# Deploy to Render
git add .
git commit -m "Add business partner upgrade"
git push origin main

# Manual Render commands (if needed)
npx prisma generate
npx prisma migrate deploy
npx prisma migrate status
```

---

**Ready to deploy? Just push your code to Git and Render will handle the rest! 🎊**
