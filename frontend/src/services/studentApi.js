import api from './api';

export const studentApi = {
  list: async () => (await api.get('/students')).data,
  get: async (id) => (await api.get(`/students/${encodeURIComponent(id)}`)).data,
  create: async (student) => (await api.post('/students', student)).data,
  update: async (id, student) => (await api.put(`/students/${encodeURIComponent(id)}`, student)).data,
  remove: async (id) => (await api.delete(`/students/${encodeURIComponent(id)}`)).data,
  sync: async () => (await api.post('/students/sync')).data,
};
