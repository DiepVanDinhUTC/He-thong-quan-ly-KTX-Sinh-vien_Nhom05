import api from './api';

export const ticketApi = {
  list: async () => (await api.get('/tickets')).data,
  detail: async (id) => (await api.get(`/tickets/${encodeURIComponent(id)}`)).data,
  create: async (data) => (await api.post('/tickets', data)).data,
  mine: async () => (await api.get('/tickets/mine')).data,
  mineDetail: async (id) => (await api.get(`/tickets/mine/${encodeURIComponent(id)}`)).data,
  studentAccept: async (id, rating, ratingNote, inspected) => (await api.patch(`/tickets/mine/${encodeURIComponent(id)}/acceptance`, { rating, ratingNote, inspected })).data,
  studentRequestRework: async (id, reason, inspected) => (await api.patch(`/tickets/mine/${encodeURIComponent(id)}/request-rework`, { reason, inspected })).data,
  approve: async (id, priority) => (await api.patch(`/tickets/${encodeURIComponent(id)}/approve`, { priority })).data,
  reject: async (id, reason) => (await api.patch(`/tickets/${encodeURIComponent(id)}/reject`, { reason })).data,
  schedule: async (id, appointmentAt, note) => (await api.patch(`/tickets/${encodeURIComponent(id)}/schedule`, { appointmentAt, note })).data,
  progress: async (id, note) => (await api.patch(`/tickets/${encodeURIComponent(id)}/progress`, { note })).data,
  submitCompletion: async (id, note, photos) => (await api.patch(`/tickets/${encodeURIComponent(id)}/completion`, { note, photos })).data,
  assessCompensation: async (id, amount, reason, studentAtFault) => (await api.patch(`/tickets/${encodeURIComponent(id)}/compensation`, { amount, reason, studentAtFault })).data,
  acceptCompletion: async (id) => (await api.patch(`/tickets/${encodeURIComponent(id)}/accept-completion`)).data,
};
