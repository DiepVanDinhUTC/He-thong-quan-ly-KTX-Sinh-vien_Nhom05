import api from './api';

export const studentFeedbackApi = {
  create: async (data) => (await api.post('/student-feedback', data)).data,
  list: async () => (await api.get('/student-feedback')).data,
};
