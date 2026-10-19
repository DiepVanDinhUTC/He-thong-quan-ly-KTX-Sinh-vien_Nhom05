ALTER TABLE "SINH_VIEN"
ADD COLUMN "laHocVienQuanSu" BOOLEAN NOT NULL DEFAULT false;

UPDATE "SINH_VIEN" AS student
SET "laHocVienQuanSu" = true
FROM "USER_ACCOUNT" AS account
WHERE student."userId" = account."id"
  AND account."role" = 'MILITARY_STUDENT';

CREATE INDEX "SINH_VIEN_laHocVienQuanSu_idx"
ON "SINH_VIEN"("laHocVienQuanSu");
