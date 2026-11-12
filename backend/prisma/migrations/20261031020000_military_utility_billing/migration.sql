CREATE TABLE "MILITARY_UTILITY_PERIOD" (
    "id" VARCHAR(36) PRIMARY KEY,
    "maPhong" TEXT NOT NULL REFERENCES "Phong"("maPhong"),
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "electricityStart" INTEGER NOT NULL,
    "electricityEnd" INTEGER NOT NULL,
    "waterStart" INTEGER NOT NULL,
    "waterEnd" INTEGER NOT NULL,
    "recordedById" TEXT NOT NULL REFERENCES "USER_ACCOUNT"("id"),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MILITARY_UTILITY_PERIOD_values_check" CHECK ("endsAt" > "startsAt" AND "electricityStart" >= 0 AND "electricityEnd" >= "electricityStart" AND "waterStart" >= 0 AND "waterEnd" >= "waterStart"),
    CONSTRAINT "MILITARY_UTILITY_PERIOD_room_dates_key" UNIQUE ("maPhong", "startsAt", "endsAt")
);
ALTER TABLE "MILITARY_UTILITY_PERIOD" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MONTHLY_INVOICE" ALTER COLUMN "maHopDong" DROP NOT NULL;
ALTER TABLE "MONTHLY_INVOICE" ADD COLUMN "militaryUtilityPeriodId" VARCHAR(36) REFERENCES "MILITARY_UTILITY_PERIOD"("id");
ALTER TABLE "MONTHLY_INVOICE" ADD CONSTRAINT "MONTHLY_INVOICE_source_check" CHECK (("maHopDong" IS NOT NULL) <> ("militaryUtilityPeriodId" IS NOT NULL));
CREATE UNIQUE INDEX "MONTHLY_INVOICE_military_period_student_key" ON "MONTHLY_INVOICE"("militaryUtilityPeriodId", "maSinhVien");
