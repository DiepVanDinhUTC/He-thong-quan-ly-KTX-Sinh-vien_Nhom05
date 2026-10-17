SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF COL_LENGTH('dbo.SINH_VIEN', 'nienKhoa') IS NULL
    ALTER TABLE [dbo].[SINH_VIEN] ADD [nienKhoa] NVARCHAR(3) NULL;

UPDATE [dbo].[SINH_VIEN]
SET [nienKhoa] = CASE
    WHEN PATINDEX('%K6[2-7]%', UPPER(ISNULL([lop], ''))) > 0
        THEN SUBSTRING(UPPER([lop]), PATINDEX('%K6[2-7]%', UPPER(ISNULL([lop], ''))), 3)
    WHEN TRY_CONVERT(INT, LEFT([maSV], 2)) BETWEEN 21 AND 26
        THEN CONCAT('K', TRY_CONVERT(INT, LEFT([maSV], 2)) + 41)
    WHEN [maSV] LIKE 'SIS2[1-6]%'
        THEN CONCAT('K', TRY_CONVERT(INT, SUBSTRING([maSV], 4, 2)) + 41)
    ELSE CONCAT('K', 62 + ABS(CHECKSUM([maSV]) % 6))
END
WHERE [nienKhoa] IS NULL OR [nienKhoa] NOT IN ('K62', 'K63', 'K64', 'K65', 'K66', 'K67');

ALTER TABLE [dbo].[SINH_VIEN] ALTER COLUMN [nienKhoa] NVARCHAR(3) NOT NULL;

IF NOT EXISTS (
    SELECT 1
    FROM sys.default_constraints AS dc
    INNER JOIN sys.columns AS c
        ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
    WHERE dc.parent_object_id = OBJECT_ID('dbo.SINH_VIEN') AND c.name = 'nienKhoa'
)
    ALTER TABLE [dbo].[SINH_VIEN] ADD CONSTRAINT [DF_SINH_VIEN_nienKhoa] DEFAULT ('K64') FOR [nienKhoa];

COMMIT TRANSACTION;
