const API = '/api';

function getHeaders() {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function fetchAPI(path, options = {}) {
  const res = await fetch(API + path, { ...options, headers: { ...getHeaders(), ...options.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const auth = {
  login: (email, password) => fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (body) => fetchAPI('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  me: () => fetchAPI('/auth/me'),
};

export const mechanics = {
  nearby: (lat, lng) => fetchAPI(`/mechanics/nearby?lat=${lat}&lng=${lng}`),
  get: (id) => fetchAPI(`/mechanics/${id}`),
  updateProfile: (body) => fetchAPI('/mechanics/profile', { method: 'PUT', body: JSON.stringify(body) }),
  createProfile: (body) => fetchAPI('/mechanics/profile', { method: 'POST', body: JSON.stringify(body) }),
};

export const services = {
  categories: (type) => fetchAPI(type ? `/services/categories?type=${type}` : '/services/categories'),
};

export const bookings = {
  create: (body) => fetchAPI('/bookings', { method: 'POST', body: JSON.stringify(body) }),
  my: () => fetchAPI('/bookings/my'),
  available: () => fetchAPI('/bookings/available'),
  updateStatus: (id, status) => fetchAPI(`/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  assign: (id, mechanicId) => fetchAPI(`/bookings/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ mechanicId }) }),
  claim: (id) => fetchAPI(`/bookings/${id}/claim`, { method: 'POST' }),
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

export const admin = {
  users: () => fetchAPI('/admin/users'),
  createUser: (body) => fetchAPI('/admin/users', { method: 'POST', body: JSON.stringify(body) }),
  mechanics: () => fetchAPI('/admin/mechanics'),
  createMechanic: (body) => fetchAPI('/admin/mechanics', { method: 'POST', body: JSON.stringify(body) }),
  bookings: () => fetchAPI('/admin/bookings'),
  stats: () => fetchAPI('/admin/stats'),
};
