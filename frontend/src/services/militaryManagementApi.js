import api from './api';

export const militaryManagementApi = {
  overview: () => api.get('/military-management/overview'),
  students: () => api.get('/military-management/students'),
  syncStudents: () => api.post('/military-management/sis-sync'),
  rooms: () => api.get('/military-management/rooms'),
  autoAssignRooms: () => api.post('/military-management/room-assignments/auto'),
  assignRoom: (payload) => api.post('/military-management/room-assignments', payload),
  endRoomAssignment: (id) => api.post(`/military-management/room-assignments/${id}/end`),
  equipment: () => api.get('/military-management/equipment'),
  createEquipment: (payload) => api.post('/military-management/equipment', payload),
  updateEquipment: (id, payload) => api.put(`/military-management/equipment/${id}`, payload),
  issueEquipment: (id, payload) => api.post(`/military-management/equipment/${id}/issues`, payload),
  returnEquipment: (id, payload) => api.post(`/military-management/equipment/issues/${id}/return`, payload),
  meetingRooms: () => api.get('/military-management/meeting-rooms'),
  createMeetingRoom: (payload) => api.post('/military-management/meeting-rooms', payload),
  updateMeetingRoom: (id, payload) => api.put(`/military-management/meeting-rooms/${id}`, payload),
  createMeetingBooking: (payload) => api.post('/military-management/meeting-bookings', payload),
  cancelMeetingBooking: (id) => api.post(`/military-management/meeting-bookings/${id}/cancel`),
};
