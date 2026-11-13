import api from './api';

export const staffAccountApi = {
  listBuildings: async () => (await api.get('/staff-accounts/buildings')).data,
  updateBuildingAccess: async (maNhanVien, buildingIds) => (await api.put(`/staff-accounts/${encodeURIComponent(maNhanVien)}/building-access`, { buildingIds })).data,
  list: async () => (await api.get('/staff-accounts')).data,
  update: async (maNhanVien, profile) => (await api.patch(`/staff-accounts/${encodeURIComponent(maNhanVien)}`, profile)).data,
  changePassword: async (maNhanVien, newPassword) => (
    await api.patch(`/staff-accounts/${encodeURIComponent(maNhanVien)}/password`, { newPassword })
  ).data,
};
