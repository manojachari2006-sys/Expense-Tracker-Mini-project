(function () {
  const API_BASE_URL = 'http://localhost:8080';
  const AUTH_STORAGE_KEY = 'ledgerly.auth';

  class ApiError extends Error {
    constructor(message, status, payload) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.payload = payload;
      this.fieldErrors = payload && typeof payload === 'object' && !Array.isArray(payload)
        ? payload
        : {};
    }
  }

  function readStoredAuth() {
    try {
      const value = localStorage.getItem(AUTH_STORAGE_KEY);
      return value ? JSON.parse(value) : null;
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  }

  function clearStoredAuth() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  function redirectToLogin() {
    clearStoredAuth();
    const currentPage = window.location.pathname.split('/').pop();
    if (currentPage !== 'index.html' && currentPage !== '') {
      window.location.replace('index.html?session=expired');
    }
  }

  async function parseResponse(response) {
    if (response.status === 204) return null;

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('json')) {
      try {
        return await response.json();
      } catch {
        return null;
      }
    }

    const text = await response.text();
    return text || null;
  }

  function messageFromPayload(payload, fallback) {
    if (typeof payload === 'string' && payload.trim()) return payload;
    if (payload && typeof payload.message === 'string') return payload.message;
    if (payload && typeof payload.error === 'string') return payload.error;
    if (payload && typeof payload === 'object') {
      const firstFieldMessage = Object.values(payload).find(value => typeof value === 'string');
      if (firstFieldMessage) return firstFieldMessage;
    }
    return fallback;
  }

  async function request(path, options = {}) {
    const { method = 'GET', body, authenticated = false } = options;
    const headers = new Headers(options.headers || {});
    if (body !== undefined) headers.set('Content-Type', 'application/json');

    if (authenticated) {
      const auth = readStoredAuth();
      const token = auth && auth.token;
      if (!token) {
        redirectToLogin();
        throw new ApiError('Please sign in to continue.', 401, null);
      }
      headers.set('Authorization', `Bearer ${token}`);
    }

    let response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch {
      throw new ApiError('Could not reach the backend. Make sure it is running on port 8080.', 0, null);
    }

    const payload = await parseResponse(response);
    if (!response.ok) {
      const error = new ApiError(messageFromPayload(payload, `Request failed (${response.status}).`), response.status, payload);
      if (authenticated && response.status === 401) redirectToLogin();
      throw error;
    }
    return payload;
  }

  async function loginUser(credentials) {
    return request('/user/login', { method: 'POST', body: credentials });
  }

  async function registerUser(details) {
    return request('/user/register', { method: 'POST', body: details });
  }

  async function getExpenses() {
    return request('/expenses', { authenticated: true });
  }

  async function getExpensesPage(page, size) {
    const query = new URLSearchParams({ page: String(page), size: String(size) });
    return request(`/expenses/page?${query}`, { authenticated: true });
  }

  async function getExpensesByCategory(category) {
    const query = new URLSearchParams({ category });
    return request(`/expenses/filter?${query}`, { authenticated: true });
  }

  async function getExpensesByDateRange(startDate, endDate) {
    const query = new URLSearchParams({ startDate, endDate });
    return request(`/expenses/filter/date?${query}`, { authenticated: true });
  }

  async function getExpensesSortedBy(by, direction) {
    const query = new URLSearchParams({ by, direction });
    return request(`/expenses/sort?${query}`, { authenticated: true });
  }

  async function getExpenseById(id) {
    return request(`/expense/${encodeURIComponent(id)}`, { authenticated: true });
  }

  async function createExpense(expense) {
    return request('/expense', { method: 'POST', body: expense, authenticated: true });
  }

  async function updateExpense(id, expense) {
    return request(`/expense/${encodeURIComponent(id)}`, { method: 'PUT', body: expense, authenticated: true });
  }

  async function deleteExpense(id) {
    return request(`/expense/${encodeURIComponent(id)}`, { method: 'DELETE', authenticated: true });
  }

  window.ExpenseApi = {
    ApiError,
    loginUser,
    registerUser,
    getExpenses,
    getExpensesPage,
    getExpensesByCategory,
    getExpensesByDateRange,
    getExpensesSortedBy,
    getExpenseById,
    createExpense,
    updateExpense,
    deleteExpense
  };
})();
