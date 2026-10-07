import api from './api';

export const housingApi = {
  roomMap: async () => (await api.get('/rooms')).data,
  createFacility: async (maPhong, data) => (await api.post(`/rooms/${encodeURIComponent(maPhong)}/facilities`, data)).data,
  updateFacility: async (maPhong, id, data) => (await api.patch(`/rooms/${encodeURIComponent(maPhong)}/facilities/${encodeURIComponent(id)}`, data)).data,
  deleteFacility: async (maPhong, id) => (await api.delete(`/rooms/${encodeURIComponent(maPhong)}/facilities/${encodeURIComponent(id)}`)).data,
  myApplications: async () => (await api.get('/applications/mine')).data,
  availableRooms: async (loaiPhong) => (await api.get('/applications/rooms', { params: { loaiPhong } })).data,
  apply: async (loaiPhongYeuCau, maPhongYeuCau) => (await api.post('/applications', { loaiPhongYeuCau, maPhongYeuCau })).data,
  applications: async () => (await api.get('/applications')).data,
  rejectApplication: async (id) => (await api.patch(`/applications/${encodeURIComponent(id)}/reject`)).data,
  contracts: async () => (await api.get('/contracts')).data,
  rooms: async (loaiPhong) => (await api.get('/contracts/rooms', { params: loaiPhong ? { loaiPhong } : {} })).data,
  approveApplication: async (data) => (await api.post('/contracts', data)).data,
  updateContract: async (id, data) => (await api.patch(`/contracts/${encodeURIComponent(id)}`, data)).data,
};
