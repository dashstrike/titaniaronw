/* Shared notifications using Darkone's Bootstrap toast component. */
(function () {
  'use strict';

  window.TitaniaToast = function (title, message, kind) {
    return new Promise(resolve => {
      function show() {
        const stack = document.getElementById('toastStack');
        const toast = document.createElement('div');
        const warning = kind === 'warn' || kind === 'warning';
        const error = kind === 'err' || kind === 'error';
        const colour = error ? 'danger' : warning ? 'warning' : 'success';
        toast.className = 'toast';
        toast.setAttribute('role', error ? 'alert' : 'status');
        toast.setAttribute('aria-live', error ? 'assertive' : 'polite');
        toast.setAttribute('aria-atomic', 'true');
        toast.innerHTML = '<div class="toast-header">' +
          '<i class="bx me-2" aria-hidden="true"></i>' +
          '<strong class="me-auto"></strong>' +
          '<button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>' +
          '</div><div class="toast-body"></div>';
        toast.querySelector('i').classList.add('text-' + colour, error ? 'bx-error-circle' : warning ? 'bx-error' : 'bx-check-circle');
        toast.querySelector('strong').textContent = String(title || 'Titania');
        const body = toast.querySelector('.toast-body');
        body.textContent = String(message || '');
        body.hidden = !message;
        stack.appendChild(toast);
        const instance = new bootstrap.Toast(toast, { autohide: true, delay: error || warning ? 5000 : 3000 });
        toast.addEventListener('hidden.bs.toast', () => {
          instance.dispose();
          toast.remove();
          resolve();
        }, { once: true });
        instance.show();
      }

      if (document.readyState === 'loading' && !window.bootstrap) {
        document.addEventListener('DOMContentLoaded', show, { once: true });
      } else {
        show();
      }
    });
  };
})();
