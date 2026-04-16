# 🚀 Render Prisma Migration - Quick Reference

## ⚡ FASTEST WAY (30 seconds)

### Just Push Your Code:
```bash
git add .
git commit -m "Add business partner upgrade"
git push origin main
```

**Render automatically runs migrations via `postinstall` script!**

---

## 🔧 MANUAL WAY (If Auto-Deploy Fails)

### Via Render Dashboard:

1. **Go to:** Render Dashboard → Your Web Service → **Shell** tab

2. **Run these commands:**
```bash
npx prisma generate
npx prisma migrate deploy
```

3. **Restart your service** (if needed)

---

## 📋 COMPLETE COMMAND REFERENCE

### Local Development:
```bash
# Create new migration
npx prisma migrate dev --name add_business_partner_upgrade

# Generate Prisma Client
npx prisma generate

# Test locally
npm run dev
```

### Production (Render):
```bash
# Deploy migrations (SAFE for production)
npx prisma migrate deploy

# Check migration status
npx prisma migrate status

# Generate Prisma Client
npx prisma generate

# Validate schema
npx prisma validate
```

### ⚠️ NEVER Use in Production:
```bash
# ❌ DON'T use this on Render!
npx prisma migrate dev      # Development only!
npx prisma migrate reset    # Deletes all data!
```

---

## 🎯 RENDER ENVIRONMENT VARIABLES

Make sure these are set in Render **Environment** tab:

```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname?schema=public
NODE_ENV=production
JWT_SECRET=your_secret_key
PORT=5000
```

---

## 📊 CHECK IF IT WORKED

### 1. Check Render Logs:
Look for:
```
✅ 1 migration(s) applied
🚀 Server running on port 5000
```

### 2. Test API:
```bash
curl https://your-app.onrender.com/api/health
```

### 3. Check Database:
Connect to your database and verify:
- `BusinessPartnerApplication` table exists
- `BUSINESS_PARTNER` is in Identity enum

---

## 🚨 COMMON ERRORS & FIXES

### Error: "Can't reach database server"
**Fix:** Check `DATABASE_URL` in Render Environment tab

### Error: "Migration already applied"
**Fix:** 
```bash
npx prisma migrate resolve --applied 20260414_add_business_partner_upgrade
```

### Error: "Prisma Client not generated"
**Fix:**
```bash
npx prisma generate
```

### Error: "Schema validation failed"
**Fix:**
```bash
npx prisma validate
# Fix errors in prisma/schema.prisma
```

---

## 🔄 DEPLOYMENT FLOW

```
Push to Git
    ↓
Render detects changes
    ↓
npm install
    ↓
postinstall script runs:
  ├─ npx prisma generate ✅
  └─ npx prisma migrate deploy ✅
    ↓
npm start
    ↓
App running with new schema 🎉
```

---

## 📁 FILES DEPLOYED

Make sure these are committed to Git:
```
✅ prisma/schema.prisma
✅ prisma/migrations/*
✅ src/controllers/role-upgrade.controller.js
✅ package.json
```

---

## 🛠️ USEFUL RENDER SHELL COMMANDS

```bash
# Check current directory
pwd

# List files
ls -la

# Check Node version
node --version

# Check Prisma version
npx prisma --version

# View environment variables
echo $DATABASE_URL

# Check if table exists
# (Connect to your database using psql)
```

---

## ⏱️ EXPECTED TIMELINE

- Prisma Generate: **~10-20 seconds**
- Migrate Deploy: **~5-15 seconds**
- App Startup: **~5-10 seconds**
- **Total: ~30-45 seconds**

---

## ✅ SUCCESS CHECKLIST

After deployment, verify:

- [ ] Render build succeeded (green checkmark)
- [ ] Logs show "migration(s) applied"
- [ ] App is running (no crash loops)
- [ ] API responds to requests
- [ ] No error logs

---

## 📞 QUICK TROUBLESHOOTING

### Build Failed?
1. Click "Logs" tab
2. Scroll to error message
3. Fix the issue locally
4. Commit and push again

### Migration Failed?
1. Run: `npx prisma migrate status`
2. Check error message
3. Fix schema or resolve conflicts
4. Redeploy

### App Crashing?
1. Check logs for startup errors
2. Verify all env variables are set
3. Check DATABASE_URL is correct
4. Restart the service

---

## 🎉 YOU'RE DONE WHEN:

✅ Render shows green "Live" status  
✅ Logs show successful migration  
✅ API endpoints work  
✅ No error messages in logs  

---

**Questions? Check:** `DEPLOY_PRISMA_TO_RENDER.md` for complete guide
