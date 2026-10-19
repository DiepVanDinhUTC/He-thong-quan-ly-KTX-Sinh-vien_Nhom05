CREATE TABLE IF NOT EXISTS "VNPAY_PAYMENT" (
    "id" VARCHAR(36) NOT NULL,
    "txnRef" VARCHAR(100) NOT NULL,
    "invoiceType" VARCHAR(20) NOT NULL,
    "invoiceId" VARCHAR(36) NOT NULL,
    "maSinhVien" VARCHAR(20) NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    "bankCode" VARCHAR(20),
    "bankTranNo" VARCHAR(255),
    "vnpTransactionNo" VARCHAR(30),
    "responseCode" VARCHAR(2),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VNPAY_PAYMENT_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "VNPAY_PAYMENT_amount_check" CHECK ("amount" >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "VNPAY_PAYMENT_txnRef_key" ON "VNPAY_PAYMENT" ("txnRef");
CREATE INDEX IF NOT EXISTS "VNPAY_PAYMENT_maSinhVien_createdAt_idx" ON "VNPAY_PAYMENT" ("maSinhVien", "createdAt");
CREATE INDEX IF NOT EXISTS "VNPAY_PAYMENT_invoiceType_invoiceId_status_idx" ON "VNPAY_PAYMENT" ("invoiceType", "invoiceId", "status");
