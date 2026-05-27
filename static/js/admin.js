// admin.js — Admin Panel logic
// Manages companies (add/edit/delete), views students, updates application statuses,
// and shows dashboard statistics.
// Depends on: config.js, auth.js (loaded via admin.html)

// Initialize Supabase client
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
 * init — Entry point. Checks auth session and admin privileges first,
 * then loads all admin data.
 */
async function init() {
  // Always verify auth session before loading any data
  const session = await requireAuth();
  if (!session) return;

  // Verify the logged-in user is actually an admin
  const { data: profile, error } = await _supabase
    .from('profiles')
    .select('is_admin, full_name')
    .eq('id', session.user.id)
    .single();

  if (error || !profile || !profile.is_admin) {
    // Non-admin users are redirected to student dashboard
    window.location.href = 'dashboard.html';
    return;
  }

  // Wire up logout
  document.getElementById('logoutBtn').addEventListener('click', logoutUser);

  // Set up tab switching
  setupTabs();

  // Load all data sections
  await Promise.all([
    loadStats(),
    loadCompaniesTable(),
    loadStudentsTable(),
    loadApplicationsTable(),
  ]);

  // Wire up the add/edit company form
  document.getElementById('companyForm').addEventListener('submit', handleCompanyFormSubmit);
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

/**
 * setupTabs — Wires up the tab navigation buttons so clicking a tab
 * shows the corresponding panel and hides the others.
 */
function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });
}

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * loadStats — Fetches counts for the stats cards at the top of the admin panel.
 */
async function loadStats() {
  try {
    const [studentsRes, applicationsRes, selectedRes, companiesRes] = await Promise.all([
      _supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_admin', false),
      _supabase.from('applications').select('id', { count: 'exact', head: true }),
      _supabase.from('applications').select('id', { count: 'exact', head: true }).eq('status', 'Selected'),
      _supabase.from('companies').select('id', { count: 'exact', head: true }),
    ]);

    document.getElementById('statStudents').textContent = studentsRes.count ?? '—';
    document.getElementById('statApplications').textContent = applicationsRes.count ?? '—';
    document.getElementById('statSelected').textContent = selectedRes.count ?? '—';
    document.getElementById('statCompanies').textContent = companiesRes.count ?? '—';
  } catch (err) {
    console.error('Stats load failed:', err.message);
  }
}

// ─── Companies Table ──────────────────────────────────────────────────────────

/**
 * loadCompaniesTable — Fetches all companies and renders them in a table
 * with Edit and Delete action buttons.
 */
async function loadCompaniesTable() {
  const container = document.getElementById('companiesTableContainer');
  container.innerHTML = '<p class="loading-text">Loading...</p>';

  const { data: companies, error } = await _supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = `<p class="loading-text">Error: ${error.message}</p>`;
    return;
  }

  if (!companies || companies.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No companies yet. Use the "Add Company" tab to add one.</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Company</th>
            <th>Role</th>
            <th>Min CGPA</th>
            <th>Branches</th>
            <th>Batch</th>
            <th>Deadline</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${companies.map(c => `
            <tr>
              <td><strong>${escapeHtml(c.name)}</strong></td>
              <td>${escapeHtml(c.role)}</td>
              <td>${c.min_cgpa}</td>
              <td>${escapeHtml(c.allowed_branches || '')}</td>
              <td>${c.graduation_year}</td>
              <td>${c.deadline ? new Date(c.deadline).toLocaleDateString('en-IN') : '—'}</td>
              <td style="display:flex;gap:0.5rem;">
                <button class="btn btn-outline btn-sm" onclick="editCompany('${c.id}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteCompany('${c.id}', '${escapeHtml(c.name)}')">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ─── Students Table ───────────────────────────────────────────────────────────

/**
 * loadStudentsTable — Fetches all non-admin profiles and renders them in a table.
 */
async function loadStudentsTable() {
  const container = document.getElementById('studentsTableContainer');
  container.innerHTML = '<p class="loading-text">Loading...</p>';

  const { data: students, error } = await _supabase
    .from('profiles')
    .select('*')
    .eq('is_admin', false)
    .order('full_name', { ascending: true });

  if (error) {
    container.innerHTML = `<p class="loading-text">Error: ${error.message}</p>`;
    return;
  }

  if (!students || students.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No students registered yet.</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Roll No.</th>
            <th>Branch</th>
            <th>CGPA</th>
            <th>Batch</th>
            <th>Phone</th>
            <th>Resume</th>
          </tr>
        </thead>
        <tbody>
          ${students.map(s => `
            <tr>
              <td><strong>${escapeHtml(s.full_name || '—')}</strong></td>
              <td>${escapeHtml(s.roll_number || '—')}</td>
              <td>${escapeHtml(s.branch || '—')}</td>
              <td>${s.cgpa ?? '—'}</td>
              <td>${s.graduation_year || '—'}</td>
              <td>${escapeHtml(s.phone || '—')}</td>
              <td>${s.resume_link ? `<a href="${escapeHtml(s.resume_link)}" target="_blank" style="color:var(--primary);">View</a>` : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ─── Applications Table ───────────────────────────────────────────────────────

/**
 * loadApplicationsTable — Fetches all applications joined with student and company info,
 * and renders a table with a status dropdown for each row.
 */
async function loadApplicationsTable() {
  const container = document.getElementById('applicationsTableContainer');
  container.innerHTML = '<p class="loading-text">Loading...</p>';

  // Join applications with student profiles and company names
  const { data: apps, error } = await _supabase
    .from('applications')
    .select(`
      id,
      status,
      applied_on,
      profiles ( full_name, roll_number, branch ),
      companies ( name, role )
    `)
    .order('applied_on', { ascending: false });

  if (error) {
    container.innerHTML = `<p class="loading-text">Error: ${error.message}</p>`;
    return;
  }

  if (!apps || apps.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No applications submitted yet.</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Student</th>
            <th>Roll No.</th>
            <th>Branch</th>
            <th>Company</th>
            <th>Role</th>
            <th>Applied On</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${apps.map(a => `
            <tr>
              <td><strong>${escapeHtml(a.profiles?.full_name || '—')}</strong></td>
              <td>${escapeHtml(a.profiles?.roll_number || '—')}</td>
              <td>${escapeHtml(a.profiles?.branch || '—')}</td>
              <td>${escapeHtml(a.companies?.name || '—')}</td>
              <td>${escapeHtml(a.companies?.role || '—')}</td>
              <td>${a.applied_on ? new Date(a.applied_on).toLocaleDateString('en-IN') : '—'}</td>
              <td>
                <select class="status-select" onchange="updateApplicationStatus('${a.id}', this.value)">
                  ${['Applied', 'Shortlisted', 'Selected', 'Rejected'].map(s =>
                    `<option value="${s}" ${a.status === s ? 'selected' : ''}>${s}</option>`
                  ).join('')}
                </select>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * updateApplicationStatus — Updates the status field for a single application row.
 *
 * @param {string} applicationId
 * @param {string} newStatus - one of: Applied, Shortlisted, Selected, Rejected
 */
async function updateApplicationStatus(applicationId, newStatus) {
  try {
    const { error } = await _supabase
      .from('applications')
      .update({ status: newStatus })
      .eq('id', applicationId);

    if (error) throw new Error(error.message);

    showMsg(`Status updated to "${newStatus}"`, 'success');
    // Refresh stats to reflect any Selected changes
    loadStats();
  } catch (err) {
    showMsg('Failed to update status: ' + err.message, 'error');
  }
}

// ─── Company Form ─────────────────────────────────────────────────────────────

/**
 * handleCompanyFormSubmit — Handles both "Add Company" and "Edit Company" submissions.
 * Determines mode by checking whether a hidden edit ID field is set.
 */
async function handleCompanyFormSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('companyFormBtn');
  btn.disabled = true;
  btn.textContent = 'Saving...';
  showFormMsg('', '');

  const editId = document.getElementById('editCompanyId').value;

  const payload = {
    name: document.getElementById('cName').value.trim(),
    role: document.getElementById('cRole').value.trim(),
    description: document.getElementById('cDesc').value.trim(),
    min_cgpa: parseFloat(document.getElementById('cMinCgpa').value),
    graduation_year: parseInt(document.getElementById('cGradYear').value),
    allowed_branches: document.getElementById('cBranches').value.trim(),
    deadline: document.getElementById('cDeadline').value,
  };

  try {
    let error;
    if (editId) {
      // Update existing company
      ({ error } = await _supabase.from('companies').update(payload).eq('id', editId));
    } else {
      // Insert new company
      ({ error } = await _supabase.from('companies').insert(payload));
    }

    if (error) throw new Error(error.message);

    showFormMsg(editId ? 'Company updated successfully!' : 'Company added successfully!', 'success');
    document.getElementById('companyForm').reset();
    cancelEdit();

    // Refresh companies table and stats
    await Promise.all([loadCompaniesTable(), loadStats()]);
  } catch (err) {
    showFormMsg('Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = editId ? 'Update Company' : 'Add Company';
  }
}

/**
 * editCompany — Fetches a company by ID and pre-fills the form for editing.
 * Switches to the "Add Company" tab automatically.
 *
 * @param {string} companyId
 */
async function editCompany(companyId) {
  const { data, error } = await _supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();

  if (error || !data) {
    showMsg('Could not load company for editing.', 'error');
    return;
  }

  // Switch to the Add Company tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector('[data-tab="add-company"]').classList.add('active');
  document.getElementById('tab-add-company').classList.add('active');

  // Fill in the form fields
  document.getElementById('editCompanyId').value = data.id;
  document.getElementById('cName').value = data.name;
  document.getElementById('cRole').value = data.role;
  document.getElementById('cDesc').value = data.description || '';
  document.getElementById('cMinCgpa').value = data.min_cgpa;
  document.getElementById('cGradYear').value = data.graduation_year;
  document.getElementById('cBranches').value = data.allowed_branches || '';
  document.getElementById('cDeadline').value = data.deadline || '';

  document.getElementById('companyFormTitle').textContent = 'Edit Company';
  document.getElementById('companyFormBtn').textContent = 'Update Company';
  document.getElementById('cancelEditBtn').style.display = 'inline-flex';
}

/**
 * cancelEdit — Resets the company form back to "Add" mode.
 */
function cancelEdit() {
  document.getElementById('editCompanyId').value = '';
  document.getElementById('companyFormTitle').textContent = 'Add New Company';
  document.getElementById('companyFormBtn').textContent = 'Add Company';
  document.getElementById('cancelEditBtn').style.display = 'none';
  document.getElementById('companyForm').reset();
  showFormMsg('', '');
}

/**
 * deleteCompany — Deletes a company after confirmation.
 *
 * @param {string} companyId
 * @param {string} companyName - used in the confirmation dialog
 */
async function deleteCompany(companyId, companyName) {
  if (!confirm(`Delete "${companyName}"? This will also remove all related applications.`)) return;

  try {
    // Delete related applications first (foreign key constraint)
    await _supabase.from('applications').delete().eq('company_id', companyId);

    const { error } = await _supabase.from('companies').delete().eq('id', companyId);
    if (error) throw new Error(error.message);

    showMsg(`"${companyName}" deleted successfully.`, 'success');
    await Promise.all([loadCompaniesTable(), loadStats()]);
  } catch (err) {
    showMsg('Delete failed: ' + err.message, 'error');
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * showMsg — Displays a top-level alert on the admin page.
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

  if (type === 'success') {
    setTimeout(() => { el.className = 'alert'; }, 4000);
  }
}

/**
 * showFormMsg — Displays an alert inside the company form panel.
 *
 * @param {string} text
 * @param {'success'|'error'} type
 */
function showFormMsg(text, type) {
  const el = document.getElementById('companyFormMsg');
  el.textContent = text;
  el.className = 'alert';
  if (type === 'success') el.classList.add('alert-success', 'show');
  else if (type === 'error') el.classList.add('alert-error', 'show');
}

/**
 * escapeHtml — Prevents XSS when rendering dynamic data into innerHTML.
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
