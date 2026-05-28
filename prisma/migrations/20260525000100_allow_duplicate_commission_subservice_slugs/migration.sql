-- Allow the same automatic commission slug to be used under different
-- commission service groups in the same scheme.
ALTER TABLE "CommissionSubService"
DROP CONSTRAINT IF EXISTS "CommissionSubService_slug_schemeId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "CommissionSubService_serviceId_slug_schemeId_key"
ON "CommissionSubService"("serviceId", "slug", "schemeId");
