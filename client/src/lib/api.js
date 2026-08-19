import api from './axiosInstance'

export const unwrap = (response) => response.data?.data

export const authApi = {
  login: (payload) => api.post('/login', payload).then(unwrap),
  logout: () => api.put('/logout').then(unwrap),
  me: () => api.get('/self-identification').then(unwrap),
  forgotPassword: (email) => api.put('/forgot-password', { email }).then(unwrap),
  resetPassword: (token, newPassword) => api.put(`/reset-password/${token}`, { newPassword }).then(unwrap),
  changePassword: (payload) => api.put('/change-password', payload).then(unwrap),
  setTheme: (theme) => api.patch('/theme', { theme }).then(unwrap)
}

export const usersApi = {
  list: () => api.get('/users').then(unwrap),
  permissionMatrix: () => api.get('/users/permission-matrix').then(unwrap),
  create: (payload) => api.post('/users', payload).then(unwrap),
  update: (id, payload) => api.put(`/users/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/users/${id}`).then(unwrap)
}

export const rbacApi = {
  matrix: () => api.get('/rbac/matrix').then(unwrap),
  save: (matrix) => api.put('/rbac/matrix', { matrix }).then(unwrap),
  reset: () => api.post('/rbac/matrix/reset').then(unwrap)
}

export const locationsApi = {
  list: () => api.get('/locations').then(unwrap),
  create: (payload) => api.post('/locations', payload).then(unwrap),
  update: (id, payload) => api.put(`/locations/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/locations/${id}`).then(unwrap)
}

export const holidaysApi = {
  list: (locationId) => api.get('/holidays', { params: locationId ? { locationId } : {} }).then(unwrap),
  create: (payload) => api.post('/holidays', payload).then(unwrap),
  remove: (id) => api.delete(`/holidays/${id}`).then(unwrap)
}

export const taskTemplatesApi = {
  list: (params) => api.get('/task-templates', { params }).then(unwrap),
  options: () => api.get('/task-templates/options').then(unwrap),
  create: (payload) => api.post('/task-templates', payload).then(unwrap),
  update: (id, payload) => api.put(`/task-templates/${id}`, payload).then(unwrap),
  setSkipOnHoliday: (id, skipOnHoliday) => api.patch(`/task-templates/${id}/skip-on-holiday`, { skipOnHoliday }).then(unwrap),
  remove: (id) => api.delete(`/task-templates/${id}`).then(unwrap)
}

export const taskInstancesApi = {
  list: (date) => api.get('/task-instances', { params: { date } }).then(unwrap),
  setSkipOnHoliday: (id, skipOnHoliday) => api.patch(`/task-instances/${id}/skip-on-holiday`, { skipOnHoliday }).then(unwrap),
  completeItem: (id, itemId, formData) => api.post(`/task-instances/${id}/items/${itemId}/complete`, formData).then(unwrap),
  placeOnBoard: (id, payload) => api.patch(`/task-instances/${id}/board`, payload).then(unwrap)
}

export const notificationsApi = {
  list: () => api.get('/notifications').then(unwrap),
  unreadCount: () => api.get('/notifications/unread-count').then(unwrap)
}

export const reportsApi = {
  get: (params) => api.get('/reports', { params }).then(unwrap)
}
