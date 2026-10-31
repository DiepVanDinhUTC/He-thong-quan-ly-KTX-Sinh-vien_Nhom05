const ROLES = Object.freeze({
    BOARD_CHAIR: 'BOARD_CHAIR',
    BOARD_DEPUTY: 'BOARD_DEPUTY',
    ARCHIVIST: 'ARCHIVIST',
    ACCOUNTANT: 'ACCOUNTANT',
    TREASURER: 'TREASURER',
    FACILITIES_MANAGER: 'FACILITIES_MANAGER',
    BUILDING_MANAGER: 'BUILDING_MANAGER',
    SECURITY: 'SECURITY',
    MILITARY_OFFICER: 'MILITARY_OFFICER',
    MEDICAL_OFFICER: 'MEDICAL_OFFICER',
    SERVICE_PROVIDER: 'SERVICE_PROVIDER',
    STUDENT: 'STUDENT',
    MILITARY_STUDENT: 'MILITARY_STUDENT',
    ADMIN: 'ADMIN'
});

const ROLE_LABELS = Object.freeze({
    [ROLES.BOARD_CHAIR]: 'Trưởng ban',
    [ROLES.BOARD_DEPUTY]: 'Phó trưởng ban',
    [ROLES.ARCHIVIST]: 'Hồ sơ lưu trữ',
    [ROLES.ACCOUNTANT]: 'Kế toán',
    [ROLES.TREASURER]: 'Thủ quỹ',
    [ROLES.FACILITIES_MANAGER]: 'Cơ sở vật chất',
    [ROLES.BUILDING_MANAGER]: 'Quản lý tòa nhà',
    [ROLES.SECURITY]: 'Trật tự - trị an',
    [ROLES.MILITARY_OFFICER]: 'Cán bộ Quản lý quân sự',
    [ROLES.MEDICAL_OFFICER]: 'Cán bộ y tế',
    [ROLES.SERVICE_PROVIDER]: 'Nhà cung cấp dịch vụ',
    [ROLES.STUDENT]: 'Sinh viên',
    [ROLES.MILITARY_STUDENT]: 'Học viên quân sự',
    [ROLES.ADMIN]: 'Quản trị viên kiểm thử'
});

const KNOWN_ROLES = new Set(Object.values(ROLES));

// Oversight and finance roles cover all buildings within their permitted functions.
// Other operational roles must have an explicit building assignment.
const GLOBAL_BUILDING_ROLES = new Set([
    ROLES.BOARD_CHAIR,
    ROLES.BOARD_DEPUTY,
    ROLES.ACCOUNTANT,
    ROLES.TREASURER,
    ROLES.ADMIN
]);

const STUDENT_RECORD_PERMISSIONS = Object.freeze({
    read: Object.freeze([ROLES.BOARD_CHAIR, ROLES.BOARD_DEPUTY, ROLES.ARCHIVIST, ROLES.BUILDING_MANAGER, ROLES.MEDICAL_OFFICER, ROLES.ADMIN]),
    create: Object.freeze([ROLES.ARCHIVIST, ROLES.ADMIN]),
    update: Object.freeze([ROLES.ARCHIVIST, ROLES.ADMIN]),
    delete: Object.freeze([ROLES.ARCHIVIST, ROLES.ADMIN]),
    sync: Object.freeze([ROLES.ARCHIVIST, ROLES.ADMIN])
});

const ROOM_PERMISSIONS = Object.freeze({
    read: Object.freeze([ROLES.BOARD_CHAIR, ROLES.BOARD_DEPUTY, ROLES.FACILITIES_MANAGER, ROLES.BUILDING_MANAGER, ROLES.ADMIN]),
    write: Object.freeze([ROLES.FACILITIES_MANAGER, ROLES.BUILDING_MANAGER, ROLES.ADMIN])
});

const APPLICATION_DECISION_ROLES = Object.freeze([
    ROLES.BOARD_CHAIR, ROLES.BOARD_DEPUTY, ROLES.ARCHIVIST, ROLES.BUILDING_MANAGER, ROLES.ADMIN
]);
const CONTRACT_READ_ROLES = Object.freeze([
    ROLES.BOARD_CHAIR, ROLES.BOARD_DEPUTY, ROLES.ARCHIVIST, ROLES.BUILDING_MANAGER, ROLES.ADMIN
]);
const CONTRACT_EDIT_ROLES = Object.freeze([ROLES.ARCHIVIST, ROLES.BUILDING_MANAGER, ROLES.ADMIN]);
const HOUSING_REQUEST_READ_ROLES = Object.freeze([
    ROLES.BOARD_CHAIR, ROLES.BOARD_DEPUTY, ROLES.ARCHIVIST, ROLES.BUILDING_MANAGER, ROLES.ADMIN
]);
const HOUSING_REQUEST_DECISION_ROLES = Object.freeze({
    TRANSFER: Object.freeze([ROLES.ARCHIVIST, ROLES.ADMIN]),
    RETURN: Object.freeze([ROLES.BUILDING_MANAGER, ROLES.ADMIN])
});

// Named permissions checked by JWT-authenticated API middleware.
const ROLE_PERMISSIONS = Object.freeze({
    [ROLES.BOARD_CHAIR]: Object.freeze(['students:read', 'rooms:read', 'contracts:read', 'tickets:read', 'dashboard:read', 'billing:read', 'staff-accounts:manage']),
    [ROLES.BOARD_DEPUTY]: Object.freeze(['students:read', 'rooms:read', 'contracts:read', 'tickets:read', 'dashboard:read', 'billing:read', 'staff-accounts:manage']),
    [ROLES.ARCHIVIST]: Object.freeze([
        'dashboard:read',
        'students:read', 'students:create', 'students:update', 'students:delete', 'students:sync',
        'contracts:read', 'contracts:update', 'applications:decide',
        'archive-rooms:read', 'archive-rooms:assign', 'archive-rooms:move',
        'residents:read', 'security:violation:read'
    ]),
    [ROLES.ACCOUNTANT]: Object.freeze(['dashboard:read', 'billing:read', 'billing:manage']),
    [ROLES.TREASURER]: Object.freeze(['dashboard:read', 'billing:read', 'billing:manage']),
    [ROLES.FACILITIES_MANAGER]: Object.freeze(['dashboard:read', 'rooms:read', 'rooms:write', 'utilities:read', 'utilities:write', 'tickets:read', 'tickets:approve', 'tickets:schedule', 'tickets:assign', 'tickets:update', 'tickets:complete', 'tickets:assess-compensation']),
    [ROLES.BUILDING_MANAGER]: Object.freeze(['dashboard:read', 'students:read', 'rooms:read', 'rooms:write', 'utilities:read', 'utilities:write', 'services:read', 'services:update', 'contracts:read', 'contracts:update', 'applications:decide', 'tickets:read', 'tickets:approve', 'tickets:schedule', 'tickets:assign', 'tickets:assess-compensation']),
    [ROLES.SECURITY]: Object.freeze([
        'dashboard:read',
        'residents:read', 'security:access-log:read', 'security:access-log:create', 'security:access-log:checkout',
        'security:violation:read', 'security:violation:create'
    ]),
    [ROLES.MILITARY_OFFICER]: Object.freeze([
        'dashboard:read',
        'military-students:read', 'military-students:sync',
        'military-rooms:read', 'military-rooms:assign',
        'military-equipment:read', 'military-equipment:write',
        'meeting-rooms:read', 'meeting-rooms:write'
    ]),
    [ROLES.MEDICAL_OFFICER]: Object.freeze([
        'dashboard:read',
        'students:read', 'residents:read', 'medical:records:read', 'medical:records:write', 'medical:incidents:read', 'medical:incidents:create'
    ]),
    [ROLES.SERVICE_PROVIDER]: Object.freeze(['tickets:read', 'tickets:update', 'tickets:complete', 'services:read', 'services:update']),
    [ROLES.STUDENT]: Object.freeze(['student-portal:read', 'tickets:create', 'tickets:accept-own']),
    [ROLES.MILITARY_STUDENT]: Object.freeze(['student-portal:read', 'tickets:create', 'tickets:accept-own']),
    [ROLES.ADMIN]: Object.freeze(['*'])
});

const hasPermission = (role, permission) =>
    ROLE_PERMISSIONS[role]?.includes('*') === true || ROLE_PERMISSIONS[role]?.includes(permission) === true;

module.exports = Object.assign({}, ROLES, {
    ROLE_LABELS,
    KNOWN_ROLES,
    GLOBAL_BUILDING_ROLES,
    STUDENT_RECORD_PERMISSIONS,
    ROOM_PERMISSIONS,
    APPLICATION_DECISION_ROLES,
    CONTRACT_READ_ROLES,
    CONTRACT_EDIT_ROLES,
    HOUSING_REQUEST_READ_ROLES,
    HOUSING_REQUEST_DECISION_ROLES,
    ROLE_PERMISSIONS,
    hasPermission
});
