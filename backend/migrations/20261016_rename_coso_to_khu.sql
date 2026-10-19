SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.CO_SO', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.KHU', N'U') IS NULL
    EXEC sp_rename N'dbo.CO_SO', N'KHU';

IF COL_LENGTH(N'dbo.KHU', N'maCoSo') IS NOT NULL
   AND COL_LENGTH(N'dbo.KHU', N'maKhu') IS NULL
    EXEC sp_rename N'dbo.KHU.maCoSo', N'maKhu', N'COLUMN';

IF COL_LENGTH(N'dbo.KHU', N'tenCoSo') IS NOT NULL
   AND COL_LENGTH(N'dbo.KHU', N'tenKhu') IS NULL
    EXEC sp_rename N'dbo.KHU.tenCoSo', N'tenKhu', N'COLUMN';

IF COL_LENGTH(N'dbo.TOA_NHA', N'maCoSo') IS NOT NULL
   AND COL_LENGTH(N'dbo.TOA_NHA', N'maKhu') IS NULL
    EXEC sp_rename N'dbo.TOA_NHA.maCoSo', N'maKhu', N'COLUMN';

COMMIT TRANSACTION;
