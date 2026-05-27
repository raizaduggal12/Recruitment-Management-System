// dashboard.js — Student Dashboard logic
// Loads student profile, fetches companies, applies eligibility filtering,
// shows application status, and handles apply button actions.
// Depends on: config.js, auth.js (loaded via dashboard.html)

// Initialize Supabase client
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Module-level state
let currentStudent = null;    // Logged-in student's profile row
let applications = [];        // Student's existing applications

// ─── Auth Helpers ─────────────────────────────────────────────────────────────

/**
 * requireAuth — Checks for an active Supabase session.
 * Redirects to login.html if no session is found.
 *
 * @returns {Object|null} session object, or null after redirect
 */
async function requireAuth() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  return session;
}

/**
 * logoutUser — Signs the current user out and redirects to login.
 */
async function logoutUser() {
  await _supabase.auth.signOut();
  window.location.href = 'login.html';
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

/**
 * init — Entry point. Verifies auth, loads profile, then loads companies.
 */
async function init() {
  // Always check auth session first; redirects to login if not authenticated
  const session = await requireAuth();
  if (!session) return;

  // Wire up logout button
  document.getElementById('logoutBtn').addEventListener('click', logoutUser);

  try {
    await loadProfile(session.user.id);
    await loadApplications(session.user.id);
    await loadCompanies();
  } catch (err) {
    showMsg('Failed to load dashboard: ' + err.message, 'error');
  }
}

// ─── Profile ─────────────────────────────────────────────────────────────────

/**
 * loadProfile — Fetches the student's profile from the profiles table
 * and renders their info in the profile card.
 *
 * @param {string} userId - auth user UUID
 */
async function loadProfile(userId) {
  const { data, error } = await _supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw new Error(error.message);

  currentStudent = data;

  // If the user is an admin, redirect them to the admin panel
  if (data.is_admin) {
    window.location.href = 'admin.html';
    return;
  }

  // Render profile card
  const initials = data.full_name
    ? data.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';
  document.getElementById('profileAvatar').textContent = initials;
  document.getElementById('profileName').textContent = data.full_name || 'Student';
  document.getElementById('navUserName').textContent = data.full_name || 'Student';

  document.getElementById('profileMeta').innerHTML = `
    <span>Roll: ${data.roll_number || '—'}</span>
    <span>Branch: ${data.branch || '—'}</span>
    <span>CGPA: ${data.cgpa ?? '—'}</span>
    <span>Batch: ${data.graduation_year || '—'}</span>
    ${data.resume_link ? `<a href="${data.resume_link}" target="_blank" style="color:var(--primary);font-size:0.82rem;padding:0.2rem 0.6rem;background:#ede9fe;border-radius:20px;text-decoration:none;">Resume</a>` : ''}
  `;
}

// ─── Applications ─────────────────────────────────────────────────────────────

/**
 * loadApplications — Fetches all applications by the current student
 * so the dashboard can show status badges instead of the apply button.
 *
 * @param {string} userId
 */
async function loadApplications(userId) {
  const { data, error } = await _supabase
    .from('applications')
    .select('*')
    .eq('student_id', userId);

  if (error) throw new Error(error.message);
  applications = data || [];
}

/**
 * getApplicationForCompany — Checks if the student already applied to a company.
 *
 * @param {string} companyId
 * @returns {Object|null} application row or null
 */
function getApplicationForCompany(companyId) {
  return applications.find(a => a.company_id === companyId) || null;
}

// ─── Companies ────────────────────────────────────────────────────────────────

/**
 * loadCompanies — Fetches all companies from Supabase and renders cards.
 */
async function loadCompanies() {
  const container = document.getElementById('companiesContainer');
  container.innerHTML = '<p class="loading-text">Loading companies...</p>';

  const { data: companies, error } = await _supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = `<p class="loading-text">Error loading companies: ${error.message}</p>`;
    return;
  }

  if (!companies || companies.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No companies listed yet. Check back later!</p></div>`;
    return;
  }

  // Build the grid of cards
  container.innerHTML = '<div class="companies-grid" id="companiesGrid"></div>';
  const grid = document.getElementById('companiesGrid');

  companies.forEach(company => {
    grid.appendChild(buildCompanyCard(company));
  });
}

/**
 * isEligible — Applies all three eligibility rules:
 *   1. Student CGPA >= company minimum CGPA
 *   2. Student branch is in the company's allowed branches list
 *   3. Student graduation year matches the company's target year
 *
 * @param {Object} company - company row from Supabase
 * @returns {boolean}
 */
function isEligible(company) {
  if (!currentStudent) return false;

  const cgpaOk = currentStudent.cgpa >= company.min_cgpa;

  const allowedBranches = (company.allowed_branches || '')
    .split(',')
    .map(b => b.trim().toUpperCase());
  const branchOk = allowedBranches.includes((currentStudent.branch || '').toUpperCase());

  const yearOk = currentStudent.graduation_year === company.graduation_year;

  return cgpaOk && branchOk && yearOk;
}

/**
 * buildCompanyCard — Creates and returns a DOM element for a single company card.
 *
 * @param {Object} company
 * @returns {HTMLElement}
 */
function buildCompanyCard(company) {
  const eligible = isEligible(company);
  const existingApp = getApplicationForCompany(company.id);

  const deadline = company.deadline
    ? new Date(company.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'N/A';

  const card = document.createElement('div');
  card.className = 'company-card';

  // Footer action: badge or button
  let footerAction = '';
  if (existingApp) {
    footerAction = `<span class="badge badge-${existingApp.status.toLowerCase()}">${existingApp.status}</span>`;
  } else if (eligible) {
    footerAction = `<button class="btn btn-primary btn-sm" onclick="applyToCompany('${company.id}', this)">Apply</button>`;
  } else {
    footerAction = `<span class="badge badge-not-eligible">Not Eligible</span>`;
  }

  card.innerHTML = `
    <div class="company-card-header">
      <span class="company-name">${escapeHtml(company.name)}</span>
      <span class="company-role">${escapeHtml(company.role)}</span>
    </div>
    ${company.description ? `<p class="company-desc">${escapeHtml(company.description)}</p>` : ''}
    <div class="company-details">
      <span class="detail-tag">Min CGPA: ${company.min_cgpa}</span>
      <span class="detail-tag">Batch: ${company.graduation_year}</span>
      <span class="detail-tag">Branches: ${escapeHtml(company.allowed_branches || '')}</span>
    </div>
    <div class="company-footer">
      <span class="deadline-info">Deadline: ${deadline}</span>
      ${footerAction}
    </div>
  `;

  return card;
}

// ─── Apply ────────────────────────────────────────────────────────────────────

/**
 * applyToCompany — Inserts a new application row into the applications table.
 * Disables the button during the request to prevent double submissions.
 *
 * @param {string} companyId
 * @param {HTMLButtonElement} btn - the clicked Apply button
 */
async function applyToCompany(companyId, btn) {
  btn.disabled = true;
  btn.textContent = 'Applying...';

  try {
    const { error } = await _supabase.from('applications').insert({
      student_id: currentStudent.id,
      company_id: companyId,
      status: 'Applied',
    });

    if (error) throw new Error(error.message);

    // Update local cache so status badge shows immediately
    applications.push({ company_id: companyId, status: 'Applied' });

    // Replace the button with a status badge
    btn.outerHTML = `<span class="badge badge-applied">Applied</span>`;
    showMsg('Application submitted successfully!', 'success');
  } catch (err) {
    showMsg('Failed to apply: ' + err.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Apply';
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * showMsg — Displays a styled alert message on the dashboard.
 *
 * @param {string} text
 * @param {'success'|'error'|'info'} type
 */
function showMsg(text, type) {
  const el = document.getElementById('msg');
  el.textContent = text;
  el.className = 'alert';
  if (type === 'success') el.classList.add('alert-success', 'show');
  else if (type === 'error') el.classList.add('alert-error', 'show');
  else el.classList.add('alert-info', 'show');

  // Auto-hide success messages after 4 seconds
  if (type === 'success') {
    setTimeout(() => { el.className = 'alert'; }, 4000);
  }
}

/**
 * escapeHtml — Prevents XSS when rendering dynamic text into innerHTML.
 *
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Start ────────────────────────────────────────────────────────────────────
init();
