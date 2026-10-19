ALTER TABLE "MAINTENANCE_TICKET"
    ADD COLUMN IF NOT EXISTS "slaHours" INTEGER NOT NULL DEFAULT 48,
    ADD COLUMN IF NOT EXISTS "slaDeadlineAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "slaBreachedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);

UPDATE "MAINTENANCE_TICKET"
SET
    "slaHours" = CASE "priority"
        WHEN 'LOW' THEN 24
        WHEN 'HIGH' THEN 72
        ELSE 48
    END,
    "slaDeadlineAt" = "createdAt" + (
        CASE "priority"
            WHEN 'LOW' THEN 24
            WHEN 'HIGH' THEN 72
            ELSE 48
        END * INTERVAL '1 hour'
    )
WHERE "slaDeadlineAt" IS NULL;

UPDATE "MAINTENANCE_TICKET"
SET "resolvedAt" = COALESCE("completedAt", "updatedAt")
WHERE "resolvedAt" IS NULL
  AND "status" IN ('WAITING_ACCEPTANCE', 'COMPLETED');

ALTER TABLE "MAINTENANCE_TICKET"
    ALTER COLUMN "slaDeadlineAt" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "MAINTENANCE_TICKET_status_slaDeadlineAt_idx"
    ON "MAINTENANCE_TICKET" ("status", "slaDeadlineAt");
