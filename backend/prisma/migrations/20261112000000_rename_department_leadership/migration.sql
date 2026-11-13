-- Rename existing employee job titles while retaining their authorization codes.
UPDATE "NHAN_VIEN"
SET "chucVu" = CASE
    WHEN lower(trim("chucVu")) = 'trưởng ban' THEN 'Trưởng phòng'
    WHEN lower(trim("chucVu")) = 'phó trưởng ban' THEN 'Phó phòng'
END
WHERE lower(trim("chucVu")) IN ('trưởng ban', 'phó trưởng ban');
