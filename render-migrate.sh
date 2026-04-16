#!/bin/bash

# Render Prisma Migration Script
# Run this in Render's web service shell

echo "🚀 Starting Prisma migration on Render..."
echo "=========================================="

# Step 1: Check environment
echo ""
echo "📋 Step 1: Checking environment..."
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set!"
  echo "Please set it in Render Environment tab."
  exit 1
else
  echo "✅ DATABASE_URL is set"
fi

# Step 2: Validate Prisma schema
echo ""
echo "📋 Step 2: Validating Prisma schema..."
npx prisma validate
if [ $? -ne 0 ]; then
  echo "❌ ERROR: Prisma schema validation failed!"
  echo "Please fix schema errors before deploying."
  exit 1
else
  echo "✅ Prisma schema is valid"
fi

# Step 3: Generate Prisma Client
echo ""
echo "📋 Step 3: Generating Prisma Client..."
npx prisma generate
if [ $? -ne 0 ]; then
  echo "❌ ERROR: Prisma Client generation failed!"
  exit 1
else
  echo "✅ Prisma Client generated successfully"
fi

# Step 4: Check migration status
echo ""
echo "📋 Step 4: Checking migration status..."
npx prisma migrate status
if [ $? -ne 0 ]; then
  echo "⚠️  Warning: Could not check migration status"
  echo "Continuing with deployment..."
fi

# Step 5: Deploy migrations
echo ""
echo "📋 Step 5: Deploying database migrations..."
npx prisma migrate deploy
if [ $? -ne 0 ]; then
  echo "❌ ERROR: Migration deployment failed!"
  echo ""
  echo "Troubleshooting:"
  echo "1. Check if DATABASE_URL is correct"
  echo "2. Verify database server is running"
  echo "3. Check Render logs for detailed error"
  echo "4. Try: npx prisma migrate status"
  exit 1
else
  echo "✅ Migrations deployed successfully"
fi

# Step 6: Verify migration
echo ""
echo "📋 Step 6: Verifying migration..."
npx prisma migrate status
if [ $? -eq 0 ]; then
  echo "✅ Migration verified"
fi

# Success!
echo ""
echo "=========================================="
echo "🎉 Prisma migration completed successfully!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Check Render logs for any errors"
echo "2. Test your API endpoints"
echo "3. Verify BusinessPartnerApplication table exists"
echo ""
