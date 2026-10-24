import api from './api';

export const dashboardApi = {
  overview: async ({ months, maToaNha, signal }) => (await api.get('/dashboard', {
    params: { months, ...(maToaNha ? { maToaNha } : {}) }, signal,
  })).data.data,
};
