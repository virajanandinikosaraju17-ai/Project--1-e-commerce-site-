'use strict';

(() => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const form = loginForm || registerForm;
  if (!form) return;

  const alertBox = document.getElementById('alert');
  const submitButton = document.getElementById('submit');
  const endpoint = loginForm ? '/api/auth/login' : '/api/auth/register';
  const idleLabel = submitButton.textContent;

  function nextUrl() {
    const next = new URLSearchParams(window.location.search).get('next');
    return next && next.startsWith('/') ? next : '/';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    NovaCart.setAlert(alertBox, '');

    const body = Object.fromEntries(new FormData(form).entries());
    if (registerForm && body.password.length < 6) {
      NovaCart.setAlert(alertBox, 'Password must be at least 6 characters.');
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Please wait…';
    try {
      await NovaCart.api(endpoint, { method: 'POST', body });
      window.location.href = nextUrl();
    } catch (error) {
      NovaCart.setAlert(alertBox, error.message);
      submitButton.disabled = false;
      submitButton.textContent = idleLabel;
    }
  });
})();
