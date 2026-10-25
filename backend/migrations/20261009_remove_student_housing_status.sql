-- Remove the duplicated housing status; runtime API derives it from applications/contracts.
-- Also reconcile legacy contract states and room occupancy.
SET XACT_ABORT ON;
BEGIN TRANSACTION;

-- Legacy payment records imply that these contracts were activated.
UPDATE hd
SET trangThai = 'ACTIVE'
FROM [HopDong] AS hd
WHERE hd.trangThai = 'PAID'
   OR (hd.trangThai = 'PENDING_PAYMENT'
       AND EXISTS (SELECT 1 FROM [HoaDon] AS bill WHERE bill.maHopDong = hd.maHopDong));

-- Room capacity reserves both effective and awaiting-payment contracts.
UPDATE p
SET soSinhVienHienTai = (
    SELECT COUNT(*) FROM [HopDong] AS hd
    WHERE hd.maPhong = p.maPhong AND hd.trangThai IN ('ACTIVE', 'PENDING_PAYMENT')
)
FROM [Phong] AS p;

-- Remove any default constraint first, then remove the redundant column.
DECLARE @defaultConstraint sysname;
SELECT @defaultConstraint = dc.name
FROM sys.default_constraints AS dc
JOIN sys.columns AS c ON c.default_object_id = dc.object_id
WHERE c.object_id = OBJECT_ID(N'SINH_VIEN') AND c.name = N'trangThaiNoiTru';

IF @defaultConstraint IS NOT NULL
BEGIN
    DECLARE @dropConstraintSql nvarchar(500);
    SET @dropConstraintSql = N'ALTER TABLE [SINH_VIEN] DROP CONSTRAINT ' + QUOTENAME(@defaultConstraint);
    EXEC sp_executesql @dropConstraintSql;
END;

IF COL_LENGTH(N'SINH_VIEN', N'trangThaiNoiTru') IS NOT NULL
    ALTER TABLE [SINH_VIEN] DROP COLUMN [trangThaiNoiTru];

COMMIT TRANSACTION;
