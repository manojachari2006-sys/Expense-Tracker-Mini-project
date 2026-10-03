(function () {
  const AUTH_STORAGE_KEY = 'ledgerly.auth';

  function saveAuth(loginResponse) {
    if (!loginResponse || !loginResponse.token || !loginResponse.user) {
      throw new Error('The server returned an incomplete login response.');
    }

    const auth = {
      token: loginResponse.token,
      tokenType: loginResponse.tokenType || 'Bearer',
      expiresAt: Date.now() + (Number(loginResponse.expiresIn) || 0) * 1000,
      user: {
        id: loginResponse.user.id,
        name: loginResponse.user.name,
        email: loginResponse.user.email
      }
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
    return auth;
  }

  function readAuth() {
    try {
      const auth = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null');
      if (!auth || !auth.token || !auth.user) return null;
      return auth;
    } catch {
      clearAuth();
      return null;
    }
  }

  function getToken() {
    const auth = readAuth();
    if (!auth) return null;
    if (auth.expiresAt && Date.now() >= auth.expiresAt) {
      clearAuth();
      return null;
    }
    return auth.token;
  }

  function getCurrentUser() {
    return readAuth()?.user || null;
  }

  function clearAuth() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  function isAuthenticated() {
    return Boolean(getToken());
  }

  function showNotice(element, message, type = 'error') {
    if (!element) return;
    element.textContent = message;
    element.className = `notice notice-${type}`;
    element.hidden = false;
  }

  function setLoading(form, loading) {
    const button = form.querySelector('.submit-button');
    if (!button) return;
    button.disabled = loading;
    button.classList.toggle('is-loading', loading);
    button.setAttribute('aria-busy', String(loading));
  }

  function setFieldError(element, message) {
    if (element) element.textContent = message || '';
  }

  function bindPasswordToggles() {
    document.querySelectorAll('[data-password-toggle]').forEach(button => {
      button.addEventListener('click', () => {
        const input = document.getElementById(button.dataset.passwordToggle);
        if (!input) return;
        const showing = input.type === 'password';
        input.type = showing ? 'text' : 'password';
        button.textContent = showing ? 'Hide' : 'Show';
        button.setAttribute('aria-label', showing ? 'Hide password' : 'Show password');
        button.setAttribute('aria-pressed', String(showing));
      });
    });
  }

  function showBackendError(notice, fieldError, error) {
    const fieldMessages = error.payload && typeof error.payload === 'object' && !('status' in error.payload)
      ? error.payload
      : {};
    const fieldMessage = Object.values(fieldMessages).find(value => typeof value === 'string');
    setFieldError(fieldError, fieldMessage || '');
    showNotice(notice, error.message || 'Something went wrong. Please try again.');
  }

  function setupLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;

    const notice = document.getElementById('form-notice');
    const fieldError = document.getElementById('login-field-error');
    const query = new URLSearchParams(window.location.search);
    if (query.get('session') === 'expired') {
      showNotice(notice, 'Your session ended. Please sign in again.', 'info');
    } else if (query.get('registered') === '1') {
      showNotice(notice, 'Account created. Sign in to continue.', 'success');
    }

    form.addEventListener('submit', async event => {
      event.preventDefault();
      notice.hidden = true;
      setFieldError(fieldError, '');

      const formData = new FormData(form);
      const email = String(formData.get('email') || '').trim();
      const password = String(formData.get('password') || '');
      const emailInput = form.elements.email;
      if (!email || !emailInput.validity.valid || !password) {
        setFieldError(fieldError, 'Enter a valid email address and password.');
        if (!email || !emailInput.validity.valid) emailInput.focus();
        return;
      }

      setLoading(form, true);
      try {
        const response = await window.ExpenseApi.loginUser({ email, password });
        window.ExpenseAuth.saveAuth(response);
        window.location.assign('dashboard.html');
      } catch (error) {
        showBackendError(notice, fieldError, error);
      } finally {
        setLoading(form, false);
      }
    });
  }

  function setupRegisterForm() {
    const form = document.getElementById('register-form');
    if (!form) return;

    const notice = document.getElementById('form-notice');
    const fieldError = document.getElementById('register-field-error');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      notice.hidden = true;
      setFieldError(fieldError, '');

      const formData = new FormData(form);
      const name = String(formData.get('name') || '').trim();
      const email = String(formData.get('email') || '').trim();
      const password = String(formData.get('password') || '');
      const confirmation = String(formData.get('confirmPassword') || '');
      const emailInput = form.elements.email;

      if (!name || !email || !emailInput.validity.valid || !password || !confirmation) {
        setFieldError(fieldError, 'Complete all fields with a valid email address.');
        return;
      }
      if (password !== confirmation) {
        setFieldError(fieldError, 'Your passwords do not match.');
        form.elements.confirmPassword.focus();
        return;
      }

      setLoading(form, true);
      try {
        await window.ExpenseApi.registerUser({ name, email, password });
        window.location.assign('index.html?registered=1');
      } catch (error) {
        showBackendError(notice, fieldError, error);
      } finally {
        setLoading(form, false);
      }
    });
  }

  function setupAuthPage() {
    bindPasswordToggles();
    setupLoginForm();
    setupRegisterForm();
  }

  window.ExpenseAuth = { saveAuth, getToken, getCurrentUser, clearAuth, isAuthenticated };
  document.addEventListener('DOMContentLoaded', setupAuthPage);
})();
