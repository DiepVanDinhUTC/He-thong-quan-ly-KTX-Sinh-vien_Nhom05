import api from './api';

const root = '/security-medical';

export const securityMedicalApi = {
  residents: async (scope) => (await api.get(`${root}/residents`, { params: scope ? { scope } : {} })).data.data,
  accessLogs: async () => (await api.get(`${root}/access-logs`)).data.data,
  createAccessLog: async (data) => (await api.post(`${root}/access-logs`, data)).data,
  checkoutAccessLog: async (id) => (await api.patch(`${root}/access-logs/${encodeURIComponent(id)}/checkout`)).data,
  violations: async () => (await api.get(`${root}/violations`)).data.data,
  violationSummary: async () => (await api.get(`${root}/violation-summary`)).data,
  createViolation: async (data) => (await api.post(`${root}/violations`, data)).data,
  healthRecords: async () => (await api.get(`${root}/health-records`)).data.data,
  saveHealthRecord: async (maSV, data) => (await api.put(`${root}/health-records/${encodeURIComponent(maSV)}`, data)).data,
  medicalIncidents: async () => (await api.get(`${root}/medical-incidents`)).data.data,
  createMedicalIncident: async (data) => (await api.post(`${root}/medical-incidents`, data)).data,
};
