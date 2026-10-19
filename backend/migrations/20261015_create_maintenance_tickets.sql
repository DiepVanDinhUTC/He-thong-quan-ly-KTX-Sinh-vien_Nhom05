/*
 * dbo.Phong.maPhong is a legacy SQL Server column whose native string type
 * varies from the current Prisma default. Copy its exact SQL type so SQL Server
 * can enforce the room foreign key without changing the existing table.
 */
IF OBJECT_ID(N'dbo.MAINTENANCE_TICKET', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[MAINTENANCE_TICKET] (
        [id] VARCHAR(36) NOT NULL CONSTRAINT [DF_MAINTENANCE_TICKET_id] DEFAULT CONVERT(VARCHAR(36), NEWID()),
        [maSinhVien] VARCHAR(20) NOT NULL,
        [category] NVARCHAR(50) NOT NULL,
        [title] NVARCHAR(160) NOT NULL,
        [description] NVARCHAR(2000) NOT NULL,
        [status] VARCHAR(24) NOT NULL CONSTRAINT [DF_MAINTENANCE_TICKET_status] DEFAULT 'PENDING',
        [priority] VARCHAR(12) NOT NULL CONSTRAINT [DF_MAINTENANCE_TICKET_priority] DEFAULT 'MEDIUM',
        [assignedProviderId] VARCHAR(36) NULL,
        [approvedById] VARCHAR(36) NULL,
        [appointmentAt] DATETIME2 NULL,
        [appointmentNote] NVARCHAR(500) NULL,
        [progressNote] NVARCHAR(2000) NULL,
        [rejectionReason] NVARCHAR(500) NULL,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_MAINTENANCE_TICKET_createdAt] DEFAULT SYSUTCDATETIME(),
        [updatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_MAINTENANCE_TICKET_updatedAt] DEFAULT SYSUTCDATETIME(),
        [completedAt] DATETIME2 NULL,
        CONSTRAINT [PK_MAINTENANCE_TICKET] PRIMARY KEY ([id]),
        CONSTRAINT [FK_MAINTENANCE_TICKET_SINH_VIEN] FOREIGN KEY ([maSinhVien]) REFERENCES [dbo].[SINH_VIEN]([maSV])
    );
END;

IF COL_LENGTH(N'dbo.MAINTENANCE_TICKET', N'maPhong') IS NULL
BEGIN
    DECLARE @roomType SYSNAME;
    DECLARE @roomLength SMALLINT;
    DECLARE @roomPrecision TINYINT;
    DECLARE @roomScale TINYINT;
    DECLARE @roomCollation SYSNAME;
    DECLARE @roomColumnType NVARCHAR(300);
    DECLARE @addRoomColumnSql NVARCHAR(MAX);

    SELECT
        @roomType = t.name,
        @roomLength = c.max_length,
        @roomPrecision = c.precision,
        @roomScale = c.scale,
        @roomCollation = c.collation_name
    FROM sys.columns AS c
    INNER JOIN sys.types AS t ON c.user_type_id = t.user_type_id
    WHERE c.object_id = OBJECT_ID(N'dbo.Phong') AND c.name = N'maPhong';

    IF @roomType IS NULL
        THROW 51001, 'Cannot find dbo.Phong.maPhong to determine the room-code column type.', 1;

    SET @roomColumnType = CASE
        WHEN @roomType IN (N'varchar', N'char', N'varbinary', N'binary') THEN
            @roomType + N'(' + CASE WHEN @roomLength = -1 THEN N'MAX' ELSE CONVERT(NVARCHAR(10), @roomLength) END + N')'
        WHEN @roomType IN (N'nvarchar', N'nchar') THEN
            @roomType + N'(' + CASE WHEN @roomLength = -1 THEN N'MAX' ELSE CONVERT(NVARCHAR(10), @roomLength / 2) END + N')'
        WHEN @roomType IN (N'decimal', N'numeric') THEN
            @roomType + N'(' + CONVERT(NVARCHAR(10), @roomPrecision) + N',' + CONVERT(NVARCHAR(10), @roomScale) + N')'
        WHEN @roomType IN (N'datetime2', N'datetimeoffset', N'time') THEN
            @roomType + N'(' + CONVERT(NVARCHAR(10), @roomScale) + N')'
        ELSE @roomType
    END;
    IF @roomCollation IS NOT NULL
        SET @roomColumnType += N' COLLATE ' + @roomCollation;

    SET @addRoomColumnSql = N'ALTER TABLE [dbo].[MAINTENANCE_TICKET] ADD [maPhong] ' + @roomColumnType + N' NOT NULL;';
    EXEC sys.sp_executesql @addRoomColumnSql;
END;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_MAINTENANCE_TICKET_PHONG')
    ALTER TABLE [dbo].[MAINTENANCE_TICKET] ADD CONSTRAINT [FK_MAINTENANCE_TICKET_PHONG]
        FOREIGN KEY ([maPhong]) REFERENCES [dbo].[Phong]([maPhong]);

IF OBJECT_ID(N'dbo.MAINTENANCE_TICKET_PHOTO', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[MAINTENANCE_TICKET_PHOTO] (
        [id] VARCHAR(36) NOT NULL CONSTRAINT [DF_MAINTENANCE_TICKET_PHOTO_id] DEFAULT CONVERT(VARCHAR(36), NEWID()),
        [ticketId] VARCHAR(36) NOT NULL,
        [kind] VARCHAR(16) NOT NULL,
        [fileName] NVARCHAR(255) NOT NULL,
        [mimeType] VARCHAR(30) NOT NULL,
        [data] VARCHAR(MAX) NOT NULL,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_MAINTENANCE_TICKET_PHOTO_createdAt] DEFAULT SYSUTCDATETIME(),
        CONSTRAINT [PK_MAINTENANCE_TICKET_PHOTO] PRIMARY KEY ([id]),
        CONSTRAINT [FK_MAINTENANCE_TICKET_PHOTO_TICKET] FOREIGN KEY ([ticketId]) REFERENCES [dbo].[MAINTENANCE_TICKET]([id])
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_MAINTENANCE_TICKET_status_createdAt' AND object_id = OBJECT_ID(N'dbo.MAINTENANCE_TICKET'))
    CREATE INDEX [IX_MAINTENANCE_TICKET_status_createdAt] ON [dbo].[MAINTENANCE_TICKET]([status], [createdAt]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_MAINTENANCE_TICKET_maPhong_status' AND object_id = OBJECT_ID(N'dbo.MAINTENANCE_TICKET'))
    CREATE INDEX [IX_MAINTENANCE_TICKET_maPhong_status] ON [dbo].[MAINTENANCE_TICKET]([maPhong], [status]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_MAINTENANCE_TICKET_assignedProviderId_status' AND object_id = OBJECT_ID(N'dbo.MAINTENANCE_TICKET'))
    CREATE INDEX [IX_MAINTENANCE_TICKET_assignedProviderId_status] ON [dbo].[MAINTENANCE_TICKET]([assignedProviderId], [status]);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_MAINTENANCE_TICKET_PHOTO_ticketId_kind' AND object_id = OBJECT_ID(N'dbo.MAINTENANCE_TICKET_PHOTO'))
    CREATE INDEX [IX_MAINTENANCE_TICKET_PHOTO_ticketId_kind] ON [dbo].[MAINTENANCE_TICKET_PHOTO]([ticketId], [kind]);
