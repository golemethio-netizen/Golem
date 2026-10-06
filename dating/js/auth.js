import { supabase } from './supabaseClient.js';

/**
 * Checks the current user session. Redirects to login if unauthenticated.
 * @returns {Promise<object|null>} The authenticated user object or null.
 */
export async function checkAuth() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) throw error;
    
    if (!session) {
      console.warn('No active session found. Redirecting to login...');
      return null;
    }

    return session.user;
  } catch (err) {
    console.error('Authentication check failed:', err.message);
    return null;
  }
}

/**
 * Signs in user with Email and Password
 * @param {string} email 
 * @param {string} password 
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error('Login Error:', error.message);
    return { user: null, error };
  }

  return { user: data.user, error: null };
}

/**
 * Signs up a new user and creates an initial profile record
 * @param {string} email 
 * @param {string} password 
 * @param {object} metadata - e.g., { full_name: 'Alex', gender: 'female' }
 */
export async function signUp(email, password, metadata = {}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: `${window.location.origin}/dating/index.html`
    }
  });

  if (error) {
    console.error('Sign up Error:', error.message);
    return { user: null, error };
  }

  return { user: data.user, error: null };
}

/**
 * Signs out the current user and clears session
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error.message);
  } else {
    window.location.href = '/dating/index.html';
  }
}

/**
 * Fetches the complete profile details from the database for the current user
 * @param {string} userId 
 */
export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error.message);
    return null;
  }

  return data;
}

/**
 * Renders user avatar and basic info in the app header/sidebar
 * @param {object} user 
 */
export async function renderUserProfile(user) {
  const profile = await getUserProfile(user.id);
  const nameElement = document.getElementById('current-user-name');
  const avatarElement = document.getElementById('current-user-avatar');

  if (nameElement && profile) {
    nameElement.textContent = profile.display_name || user.email;
  }

  if (avatarElement && profile?.avatar_path) {
    // If using private buckets, fetch signed URL
    const { data } = await supabase.storage
      .from('dating-profile-photos')
      .createSignedUrl(profile.avatar_path, 3600);

    if (data?.signedUrl) {
      avatarElement.src = data.signedUrl;
    }
  }
}

/**
 * Listens for auth state updates (e.g. token refresh, logout in another tab)
 */
export function initAuthListener() {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      window.location.href = '/dating/index.html';
    } else if (event === 'SIGNED_IN') {
      console.log('User signed in:', session?.user?.id);
    }
  });
}
