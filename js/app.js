import { supabase } from './supabaseClient.js';
import { checkAuth, renderUserProfile } from './auth.js';
import { loadNextProfile, setupSwipeListeners } from './matching.js';
import { initChatListener } from './messaging.js';
import { getSignedUrl } from './uploads.js';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Authenticate user session
  const user = await checkAuth();
  if (!user) {
    window.location.href = '/login.html';
    return;
  }

  // 2. Initialize UI components
  await renderUserProfile(user);
  await loadNextProfile();
  setupSwipeListeners();

  // 3. Start real-time chat listener
  initChatListener(user.id);
});
