# 🚀 Deploy to Render - Simple 3-Step Process

## 📌 OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT FLOW                          │
│                                                             │
│  1. Commit Code  →  2. Push to Git  →  3. Render Auto-Runs │
│                                                             │
│  Your job:          Your job:          Render's job:        │
│  git add .          git push           npm install          │
│  git commit -m                         prisma generate      │
│     "message"                          prisma migrate       │
│                                        deploy               │
│                                        npm start            │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ STEP 1: Prepare Your Code (1 minute)

### What to Commit:
```
✅ prisma/schema.prisma (with BusinessPartnerApplication)
✅ prisma/migrations/ (new migration files)
✅ src/controllers/role-upgrade.controller.js
✅ package.json (already has correct scripts)
```

### Run These Commands:
```bash
# Check what will be committed
git status

# Add all changes
git add .

# Verify
git status
```

---

## ✅ STEP 2: Commit & Push (30 seconds)

```bash
# Commit
git commit -m "Add business partner upgrade system"

# Push to Render
git push origin main
```

**That's it! Your job is done!** 🎉

---

## ✅ STEP 3: Render Does the Rest (2-3 minutes)

### What Happens Automatically:

```
📦 Render detects new commit
   ↓
🔧 Runs: npm install
   ↓
⚡ Runs: npx prisma generate
   ↓
🗄️  Runs: npx prisma migrate deploy  ← This upgrades your database!
   ↓
🚀 Runs: npm start
   ↓
✅ App is LIVE with new features!
```

### Why This Works:

Your `package.json` has this magic line:
```json
{
  "scripts": {
    "postinstall": "npx prisma generate && npx prisma migrate deploy"
  }
}
```

**`postinstall`** runs automatically after every `npm install` on Render!

---

## 🎯 HOW TO CHECK IF IT WORKED

### 1. Check Render Dashboard (10 seconds)
```
Go to: https://dashboard.render.com
       ↓
Click: Your Web Service
       ↓
Look for: ✅ Green "Live" badge
```

### 2. Check Logs (30 seconds)
```
In Render Dashboard:
  ↓
Click: "Logs" tab
  ↓
Look for these lines:
  ✅ "Prisma schema loaded"
  ✅ "1 migration(s) applied"
  ✅ "Server running on port 5000"
```

### 3. Test Your API (30 seconds)
```bash
# Quick test
curl https://your-app.onrender.com/api/role-upgrade/available

# Should return:
{
  "success": true,
  "currentRole": "USER",
  "availableUpgrades": [...]
}
```

---

## 🚨 IF SOMETHING GOES WRONG

### Problem: Build Failed ❌

**What to do:**
1. Click "Logs" tab in Render
2. Scroll to find error message
3. Common fixes:

```bash
# If Prisma schema error:
npx prisma validate  # Run locally
# Fix errors in schema.prisma
git add .
git commit -m "Fix schema"
git push

# If missing dependencies:
# Check package.json has:
#   "@prisma/client": "6.19.3"
#   "prisma": "6.19.3"
```

---

### Problem: Migration Failed ❌

**What to do:**
1. Go to Render Shell tab
2. Run these commands:

```bash
# Check status
npx prisma migrate status

# If it says "already applied":
npx prisma migrate resolve \
  --applied 20260414_add_business_partner_upgrade

# Then restart service
```

---

### Problem: App Crashing ❌

**What to do:**
1. Check logs for error
2. Common causes:

```
❌ Missing DATABASE_URL → Add in Environment tab
❌ Wrong DATABASE_URL → Fix connection string
❌ Database not running → Start your database
❌ Prisma not generated → Run: npx prisma generate
```

---

## ⚡ ALTERNATIVE: Manual Deployment

If automatic deployment doesn't work, do it manually:

### Step 1: Go to Render Shell
```
Render Dashboard → Your Service → "Shell" tab
```

### Step 2: Run These 2 Commands
```bash
# Command 1: Generate Prisma Client
npx prisma generate

# Command 2: Deploy Migration
npx prisma migrate deploy
```

### Step 3: Restart Service
```
Click: "Manual Deploy" → "Clear build cache and deploy"
```

---

## 📊 WHAT CHANGES IN DATABASE

### Before Migration:
```
Tables:
- User
- Business
- Job
- ... (other tables)

Identity Enum:
SUPER_ADMIN, ADMIN, USER, MEMBER, AGENT, ...
```

### After Migration:
```
Tables:
- User
- Business
- Job
- BusinessPartnerApplication  ← NEW! ✨
- ... (other tables)

Identity Enum:
SUPER_ADMIN, ADMIN, USER, MEMBER, AGENT, 
BUSINESS_PARTNER  ← NEW! ✨
```

---

## 🎉 SUCCESS INDICATORS

You'll know it worked when you see:

### In Render Dashboard:
```
✅ Service status: "Live" (green)
✅ Last publish: Just now
✅ Build: Success
```

### In Logs:
```
✅ "Environment variables loaded"
✅ "Prisma schema loaded"
✅ "1 migration(s) applied"
✅ "Server running on port 5000"
```

### In Database:
```sql
-- This query works:
SELECT * FROM "BusinessPartnerApplication";

-- Returns empty table (which is correct!)
```

### In API:
```bash
# This endpoint works:
curl https://your-app.onrender.com/api/role-upgrade/request \
  -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"targetRole": "BUSINESS_PARTNER", ...}'

# Returns: {"success": true, ...}
```

---

## ⏱️ TIME BREAKDOWN

| Step | Time | Who Does It |
|------|------|-------------|
| Commit code | 30 sec | You |
| Push to Git | 30 sec | You |
| Render build | 60 sec | Render |
| Prisma generate | 15 sec | Render |
| Migration deploy | 10 sec | Render |
| App startup | 10 sec | Render |
| **TOTAL** | **~2-3 min** | |

---

## 📝 QUICK REFERENCE CARD

### Your Commands (Do This):
```bash
git add .
git commit -m "Add business partner upgrade"
git push origin main
```

### Render Commands (Automatic):
```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm start
```

### Check Commands (If Needed):
```bash
# On Render Shell
npx prisma migrate status
npx prisma generate
```

---

## 🆘 STILL NEED HELP?

### Read These Files:
1. **`RENDER_QUICK_REFERENCE.md`** - Fast solutions
2. **`DEPLOY_PRISMA_TO_RENDER.md`** - Complete guide
3. **`RENDER_DEPLOYMENT_CHECKLIST.md`** - Step-by-step checklist

### Run This Script:
```bash
# On Render Shell
./render-migrate.sh
# This will guide you through the process
```

---

## ✅ FINAL CHECKLIST

Before pushing, verify:

- [ ] `prisma/schema.prisma` has BusinessPartnerApplication model
- [ ] Migration file exists in `prisma/migrations/`
- [ ] Code works locally (optional)
- [ ] `DATABASE_URL` is set in Render
- [ ] All changes committed to Git

Then push and watch the magic happen! ✨

---

**🚀 Ready? Just run: `git push origin main`**
