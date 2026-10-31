-- Existing contracts retain the previous 48-hour policy via NULL values.
ALTER TABLE "HopDong" ADD COLUMN IF NOT EXISTS "paymentDueAt" TIMESTAMP(3);
ALTER TABLE "HopDong" ADD COLUMN IF NOT EXISTS "paymentPolicy" VARCHAR(24);
CREATE INDEX IF NOT EXISTS "HopDong_trangThai_paymentDueAt_idx" ON "HopDong"("trangThai", "paymentDueAt");
