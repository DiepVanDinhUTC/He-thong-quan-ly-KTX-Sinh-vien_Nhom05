-- Align an existing KTX database without dropping tables, columns, or records.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- Backfill only when adding a column, so rerunning this script preserves later edits.
DO $migration$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'SINH_VIEN'
            AND column_name = 'trangThaiNoiTru'
    ) THEN
        ALTER TABLE public."SINH_VIEN"
            ADD COLUMN "trangThaiNoiTru" VARCHAR(50) NOT NULL DEFAULT 'Chưa đăng ký';

        UPDATE public."SINH_VIEN" AS student
        SET "trangThaiNoiTru" = 'Đang lưu trú'
        WHERE EXISTS (
            SELECT 1 FROM public."HopDong" AS contract
            WHERE contract."maSinhVien" = student."maSV"
                AND contract."trangThai" = 'ACTIVE'
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'SINH_VIEN' AND column_name = 'role'
    ) THEN
        ALTER TABLE public."SINH_VIEN"
            ADD COLUMN "role" VARCHAR(20) NOT NULL DEFAULT 'STUDENT';

        IF to_regclass('public."USER_ACCOUNT"') IS NOT NULL THEN
            UPDATE public."SINH_VIEN" AS student
            SET "role" = account."role"::text
            FROM public."USER_ACCOUNT" AS account
            WHERE student."userId" = account."id" AND account."role" IS NOT NULL;
        END IF;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'NHAN_VIEN' AND column_name = 'role'
    ) THEN
        ALTER TABLE public."NHAN_VIEN"
            ADD COLUMN "role" VARCHAR(20) NOT NULL DEFAULT 'MANAGER';

        IF to_regclass('public."USER_ACCOUNT"') IS NOT NULL THEN
            UPDATE public."NHAN_VIEN" AS staff
            SET "role" = account."role"::text
            FROM public."USER_ACCOUNT" AS account
            WHERE staff."userId" = account."id" AND account."role" IS NOT NULL;
        END IF;
    END IF;
END;
$migration$;

CREATE TABLE IF NOT EXISTS public."HO_SO_SUC_KHOE" (
    "maHoSo" TEXT NOT NULL,
    "maSinhVien" VARCHAR(20) NOT NULL,
    "nhomMau" VARCHAR(10),
    "diUng" VARCHAR(500),
    "benhNen" VARCHAR(500),
    "ghiChu" VARCHAR(1000),
    "ngayCapNhat" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HO_SO_SUC_KHOE_pkey" PRIMARY KEY ("maHoSo"),
    CONSTRAINT "HO_SO_SUC_KHOE_maSinhVien_fkey" FOREIGN KEY ("maSinhVien")
        REFERENCES public."SINH_VIEN"("maSV") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS public."LICH_SU_KHAM" (
    "maLanKham" TEXT NOT NULL,
    "maSinhVien" VARCHAR(20) NOT NULL,
    "ngayKham" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trieuChung" VARCHAR(1000) NOT NULL,
    "ketLuan" VARCHAR(1000),
    "huongXuLy" VARCHAR(1000),
    "ghiChu" VARCHAR(1000),

    CONSTRAINT "LICH_SU_KHAM_pkey" PRIMARY KEY ("maLanKham"),
    CONSTRAINT "LICH_SU_KHAM_maSinhVien_fkey" FOREIGN KEY ("maSinhVien")
        REFERENCES public."SINH_VIEN"("maSV") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "HO_SO_SUC_KHOE_maSinhVien_key"
    ON public."HO_SO_SUC_KHOE"("maSinhVien");
CREATE INDEX IF NOT EXISTS "LICH_SU_KHAM_maSinhVien_ngayKham_idx"
    ON public."LICH_SU_KHAM"("maSinhVien", "ngayKham");

-- Backend queries use the database role; do not expose medical data via the public API.
ALTER TABLE public."HO_SO_SUC_KHOE" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LICH_SU_KHAM" ENABLE ROW LEVEL SECURITY;

COMMIT;
