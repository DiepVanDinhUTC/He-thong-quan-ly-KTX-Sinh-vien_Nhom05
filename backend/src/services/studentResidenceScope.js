const { currentMilitaryStayWhere } = require('./militaryStay');

const buildingRoomFilter = (buildingScope) => buildingScope === null
    ? {} : { phong: { is: { maToaNha: { in: buildingScope } } } };

const housingContractFilter = (buildingScope) => ({
    trangThai: { in: ['ACTIVE', 'PENDING_PAYMENT'] },
    ...buildingRoomFilter(buildingScope)
});

const residentInBuildings = (buildingScope, now = new Date()) => ({ OR: [
    { hopDongs: { some: housingContractFilter(buildingScope) } },
    { militaryRoomAssignments: { some: { ...currentMilitaryStayWhere(now), ...buildingRoomFilter(buildingScope) } } }
] });

module.exports = { buildingRoomFilter, housingContractFilter, residentInBuildings };
