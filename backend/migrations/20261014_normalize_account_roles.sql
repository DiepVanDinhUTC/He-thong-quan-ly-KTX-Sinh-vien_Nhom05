-- Normalize roles from the previous authorization design into the current role set.
-- Legacy directors become board chairs; this does not grant the test-only ADMIN role.
UPDATE [USER_ACCOUNT] SET [role] = 'BUILDING_MANAGER' WHERE [role] = 'MANAGER';
UPDATE [USER_ACCOUNT] SET [role] = 'FACILITIES_MANAGER' WHERE [role] = 'TECHNICIAN';
UPDATE [USER_ACCOUNT] SET [role] = 'BOARD_CHAIR' WHERE [role] = 'DIRECTOR';
