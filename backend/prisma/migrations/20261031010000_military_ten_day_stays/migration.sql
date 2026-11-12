-- Preserve previously assigned 14-day periods while allowing new 10-day periods.
ALTER TABLE "MILITARY_ROOM_ASSIGNMENT"
    DROP CONSTRAINT IF EXISTS "MILITARY_ROOM_ASSIGNMENT_two_week_period_check";

ALTER TABLE "MILITARY_ROOM_ASSIGNMENT"
    ALTER COLUMN "endsAt" SET DEFAULT (CURRENT_TIMESTAMP + INTERVAL '10 days');

ALTER TABLE "MILITARY_ROOM_ASSIGNMENT"
    ADD CONSTRAINT "MILITARY_ROOM_ASSIGNMENT_stay_period_check"
    CHECK ("endsAt" = "startsAt" + INTERVAL '10 days' OR "endsAt" = "startsAt" + INTERVAL '14 days');
