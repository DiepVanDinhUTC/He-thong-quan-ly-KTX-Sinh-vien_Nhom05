-- Only add short-term GDQP allocations; preserve student profiles and KTX contracts.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS public."PHAN_PHONG_GDQP" (
    "maDot" VARCHAR(50) NOT NULL,
    "maSinhVien" VARCHAR(20) NOT NULL,
    "maPhong" VARCHAR(10) NOT NULL,
    "ngayPhan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PHAN_PHONG_GDQP_pkey" PRIMARY KEY ("maDot", "maSinhVien"),
    CONSTRAINT "PHAN_PHONG_GDQP_maSinhVien_fkey" FOREIGN KEY ("maSinhVien")
        REFERENCES public."SINH_VIEN"("maSV") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PHAN_PHONG_GDQP_maDot_maPhong_idx"
    ON public."PHAN_PHONG_GDQP"("maDot", "maPhong");
ALTER TABLE public."PHAN_PHONG_GDQP" ENABLE ROW LEVEL SECURITY;

COMMIT;
