// auth.js — Handles Supabase authentication: login, register, logout
// Depends on config.js being loaded before this file

// Initialize a shared Supabase client used across all auth operations
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * registerUser — Signs up a new student using Supabase Auth,
 * then inserts their profile details into the `profiles` table.
 *
 * @param {Object} formData - student registration fields
 * @returns {Object} { error: string|null }
 */
async function registerUser(formData) {
  try {
    // Step 1: Create auth user with email and password
    const { data: authData, error: authError } = await _supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error('User creation failed. Please try again.');

    // Step 2: Insert the extra profile fields into the profiles table
    const { error: profileError } = await _supabase.from('profiles').insert({
      id: authData.user.id,
      full_name: formData.fullName,
      roll_number: formData.rollNumber,
      phone: formData.phone,
      branch: formData.branch,
      cgpa: formData.cgpa,
      graduation_year: formData.gradYear,
      resume_link: formData.resumeLink || null,
      is_admin: false,
    });

    if (profileError) throw new Error(profileError.message);

    return { error: null };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * loginUser — Signs in an existing user with email and password.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Object} { error: string|null }
 */
async function loginUser(email, password) {
  try {
    const { error } = await _supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return { error: null };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * logoutUser — Signs the current user out of Supabase Auth
 * and redirects to the login page.
 */
async function logoutUser() {
  await _supabase.auth.signOut();
  window.location.href = 'login.html';
}

/**
 * requireAuth — Checks if there is an active session.
 * Redirects to login.html if not authenticated.
 * Returns the session object if valid.
 *
 * @returns {Object|null} session or null (after redirect)
 */
async function requireAuth() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}
