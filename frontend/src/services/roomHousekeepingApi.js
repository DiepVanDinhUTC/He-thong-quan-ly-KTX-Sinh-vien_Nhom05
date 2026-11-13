import api from './api';

export const roomHousekeepingApi = {
  list: async () => (await api.get('/room-housekeeping')).data,
  create: async (data) => (await api.post('/room-housekeeping', data)).data,
  update: async (id, data) => (await api.patch(`/room-housekeeping/${encodeURIComponent(id)}`, data)).data,
};
