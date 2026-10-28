-- Back the legacy equipment catalogue and damage-report endpoint with tables.
CREATE TABLE IF NOT EXISTS "THIET_BI" (
    "maThietBi" VARCHAR(20) NOT NULL,
    "maPhong" TEXT,
    "tenThietBi" VARCHAR(100) NOT NULL,
    "moTa" VARCHAR(255),
    "trangThai" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT "THIET_BI_pkey" PRIMARY KEY ("maThietBi")
);

CREATE TABLE IF NOT EXISTS "BAO_HONG" (
    "maBaoHong" TEXT NOT NULL,
    "maSinhVien" VARCHAR(20) NOT NULL,
    "maThietBi" VARCHAR(20) NOT NULL,
    "moTa" VARCHAR(1000) NOT NULL,
    "anhHienTrang" VARCHAR(500),
    "anhHienTrangPublicId" VARCHAR(255),
    "trangThai" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "ngayBaoHong" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ngayCapNhat" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BAO_HONG_pkey" PRIMARY KEY ("maBaoHong")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'THIET_BI_maPhong_fkey'
          AND conrelid = '"THIET_BI"'::regclass
    ) THEN
        ALTER TABLE "THIET_BI"
            ADD CONSTRAINT "THIET_BI_maPhong_fkey"
            FOREIGN KEY ("maPhong") REFERENCES "Phong"("maPhong")
            ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'BAO_HONG_maSinhVien_fkey'
          AND conrelid = '"BAO_HONG"'::regclass
    ) THEN
        ALTER TABLE "BAO_HONG"
            ADD CONSTRAINT "BAO_HONG_maSinhVien_fkey"
            FOREIGN KEY ("maSinhVien") REFERENCES "SINH_VIEN"("maSV")
            ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'BAO_HONG_maThietBi_fkey'
          AND conrelid = '"BAO_HONG"'::regclass
    ) THEN
        ALTER TABLE "BAO_HONG"
            ADD CONSTRAINT "BAO_HONG_maThietBi_fkey"
            FOREIGN KEY ("maThietBi") REFERENCES "THIET_BI"("maThietBi")
            ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END $$;
