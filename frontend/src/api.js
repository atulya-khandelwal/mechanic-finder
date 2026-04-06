import { API } from './apiConfig.js';

export { resolvePublicUrl, getApiBase } from './apiConfig.js';

function getHeaders() {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function fetchAPI(path, options = {}) {
  const res = await fetch(API + path, { ...options, headers: { ...getHeaders(), ...options.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.status = res.status;
    if (data.retryAfterSeconds != null) err.retryAfterSeconds = data.retryAfterSeconds;
    if (data.detail != null) err.detail = data.detail;
    throw err;
  }
  return data;
}

export const auth = {
  login: (login, password) =>
    fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify({ login, password }) }),
  registerStart: (body) =>
    fetchAPI('/auth/register/start', { method: 'POST', body: JSON.stringify(body) }),
  registerVerify: (body) =>
    fetchAPI('/auth/register/verify', { method: 'POST', body: JSON.stringify(body) }),
  registerResend: (email) =>
    fetchAPI('/auth/register/resend', { method: 'POST', body: JSON.stringify({ email }) }),
  me: () => fetchAPI('/auth/me'),
  updateProfile: (body) => fetchAPI('/auth/profile', { method: 'PATCH', body: JSON.stringify(body) }),
  changePassword: (body) => fetchAPI('/auth/password', { method: 'PATCH', body: JSON.stringify(body) }),
  forgotPassword: (email) =>
    fetchAPI('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (body) =>
    fetchAPI('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
};

export const mechanics = {
  nearby: (lat, lng) => fetchAPI(`/mechanics/nearby?lat=${lat}&lng=${lng}`),
  get: (id) => fetchAPI(`/mechanics/${id}`),
  analytics: () => fetchAPI('/mechanics/analytics'),
  updateProfile: (body) => fetchAPI('/mechanics/profile', { method: 'PUT', body: JSON.stringify(body) }),
  createProfile: (body) => fetchAPI('/mechanics/profile', { method: 'POST', body: JSON.stringify(body) }),
};

export const services = {
  categories: (type) => fetchAPI(type ? `/services/categories?type=${type}` : '/services/categories'),
};

export const ai = {
  capabilities: () => fetchAPI('/ai/capabilities'),
  suggestTriage: (body) =>
    fetchAPI('/ai/triage', { method: 'POST', body: JSON.stringify(body) }),
};

export const payments = {
  config: () => fetchAPI('/payments/config'),
  createRazorpayOrder: (bookingId) =>
    fetchAPI('/payments/razorpay/create-order', {
      method: 'POST',
      body: JSON.stringify({ bookingId }),
    }),
  verifyRazorpay: (body) =>
    fetchAPI('/payments/razorpay/verify', { method: 'POST', body: JSON.stringify(body) }),
};

export const bookings = {
  create: (body) => fetchAPI('/bookings', { method: 'POST', body: JSON.stringify(body) }),
  my: () => fetchAPI('/bookings/my'),
  getOne: (id) => fetchAPI(`/bookings/${id}`),
  confirmCashPayment: (id) =>
    fetchAPI(`/bookings/${id}/confirm-cash-payment`, { method: 'POST' }),
  available: () => fetchAPI('/bookings/available'),
  updateStatus: (id, status) => fetchAPI(`/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  assign: (id, mechanicId) => fetchAPI(`/bookings/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ mechanicId }) }),
  claim: (id) => fetchAPI(`/bookings/${id}/claim`, { method: 'POST' }),
  reject: (id) => fetchAPI(`/bookings/${id}/reject`, { method: 'POST' }),
  messages: (bookingId) => fetchAPI(`/bookings/${bookingId}/messages`),
  sendMessage: (bookingId, message) => fetchAPI(`/bookings/${bookingId}/messages`, { method: 'POST', body: JSON.stringify({ message }) }),
};

export const upload = {
  vehicleImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const token = localStorage.getItem('token');
    const res = await fetch(API + '/upload/vehicle-image', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data.url;
  },
  profilePhoto: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const token = localStorage.getItem('token');
    const res = await fetch(API + '/upload/profile-photo', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data.url;
  },
};

export const users = {
  saveLocation: (body) => fetchAPI('/users/location', { method: 'POST', body: JSON.stringify(body) }),
  locations: () => fetchAPI('/users/location'),
};

export const reviews = {
  submit: (bookingId, rating, comment) => fetchAPI('/reviews', { method: 'POST', body: JSON.stringify({ bookingId, rating, comment }) }),
  byMechanic: (mechanicId) => fetchAPI(`/reviews/mechanic/${mechanicId}`),
  byBooking: (bookingId) => fetchAPI(`/reviews/booking/${bookingId}`),
};

export const push = {
  getVapidPublicKey: () => fetchAPI('/push/vapid-public-key'),
  subscribe: (subscription) => fetchAPI('/push/subscribe', { method: 'POST', body: JSON.stringify(subscription) }),
  unsubscribe: (endpoint) => fetchAPI('/push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint }) }),
};

export const admin = {
  users: () => fetchAPI('/admin/users'),
  createUser: (body) => fetchAPI('/admin/users', { method: 'POST', body: JSON.stringify(body) }),
  mechanics: () => fetchAPI('/admin/mechanics'),
  createMechanic: (body) => fetchAPI('/admin/mechanics', { method: 'POST', body: JSON.stringify(body) }),
  bookings: () => fetchAPI('/admin/bookings'),
  stats: () => fetchAPI('/admin/stats'),
};
