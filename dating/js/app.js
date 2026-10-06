import { checkAuth, renderUserProfile, initAuthListener } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Listen for global auth state changes
  initAuthListener();

  // Protect page route
  const user = await checkAuth();
  if (user) {
    await renderUserProfile(user);
  }
});
