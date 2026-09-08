(() => {
  'use strict';

  const form = document.getElementById('vtu-form');
  const input = document.getElementById('vtu-input');
  const submitBtn = document.getElementById('submit-btn');
  const messageArea = document.getElementById('message-area');

  let messageTimeout = null;

  /**
   * Show a status message with animation
   */
  function showMessage(text, type) {
    // Clear any pending hide
    if (messageTimeout) {
      clearTimeout(messageTimeout);
      messageTimeout = null;
    }

    messageArea.textContent = text;
    messageArea.className = 'message-area';

    // Force reflow for re-animation
    void messageArea.offsetWidth;

    messageArea.classList.add(type, 'visible');

    // Auto-hide after 4 seconds
    messageTimeout = setTimeout(() => {
      messageArea.classList.remove('visible');
      setTimeout(() => {
        messageArea.className = 'message-area';
        messageArea.textContent = '';
      }, 400);
    }, 4000);
  }

  /**
   * Toggle loading state
   */
  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.classList.toggle('loading', isLoading);
    input.disabled = isLoading;
  }

  /**
   * Handle form submission
   */
  async function handleSubmit(e) {
    e.preventDefault();

    const vtuNumber = input.value.trim();
    if (!vtuNumber) {
      showMessage('Please enter your VTU number.', 'error');
      input.focus();
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/vtu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vtuNumber }),
      });

      const data = await response.json();

      if (data.success) {
        showMessage('✓ ' + data.message, 'success');
        input.value = '';
      } else {
        showMessage(data.message || 'Something went wrong.', 'error');
      }
    } catch (err) {
      console.error('Network error:', err);
      showMessage('Network error. Please check your connection.', 'error');
    } finally {
      setLoading(false);
      input.focus();
    }
  }

  // --- Event Listeners ---
  form.addEventListener('submit', handleSubmit);

  // Auto-uppercase as user types
  input.addEventListener('input', () => {
    const pos = input.selectionStart;
    input.value = input.value.toUpperCase();
    input.setSelectionRange(pos, pos);
  });

  // Focus input on load
  input.focus();
})();
