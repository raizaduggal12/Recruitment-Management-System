# 🎓 Campus Placement Management System

A centralized placement management system built for colleges to handle 
student profiles, company listings, eligibility filtering, job applications, 
and placement outcomes.

## 🌐 Live Demo
[Add your Netlify URL here]

## 📸 Screenshots
[Add screenshots here]

## ✨ Features

### 👨‍🎓 Student Side
- Register with full profile (name, email, roll number, phone, branch, CGPA, graduation year, resume link)
- Secure login with email and password (Supabase Auth)
- Dashboard showing personal profile details
- View all available company listings
- Rule-based eligibility filtering:
  - CGPA check (student CGPA >= company minimum CGPA)
  - Branch check (student branch in company allowed branches)
  - Graduation year match
- Apply to eligible companies with one click
- View real-time application status (Applied, Shortlisted, Selected, Rejected)
- Color-coded status badges

### 🔧 Admin Side
- Separate admin login
- Add, edit, delete company listings
- Set eligibility criteria per company (min CGPA, allowed branches, graduation year, deadline)
- View all registered students
- View all applications with student details
- Update application status via dropdown
- Dashboard stats (total students, total applications, selected students, companies listed)

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Supabase (PostgreSQL + Auth + REST API) |
| Database | PostgreSQL (via Supabase) |
| Authentication | Supabase Auth (email/password) |
| Hosting | Netlify (frontend), Supabase (backend) |

## 📁 Project Structure
```
placement-portal/
├── index.html              # Entry point, redirects based on auth
├── login.html              # Student/Admin login page
├── register.html           # Student registration page
├── dashboard.html          # Student dashboard
├── admin.html              # Admin panel
├── favicon.svg             # Site favicon
├── static/
│   ├── css/
│   │   └── style.css       # All custom CSS styles
│   └── js/
│       ├── config.js       # Supabase URL and anon key
│       ├── auth.js         # Login, register, logout logic
│       ├── dashboard.js    # Student dashboard logic
│       └── admin.js        # Admin panel logic
├── database/
│   └── schema.sql          # Full database schema and policies
├── .env.example            # Environment variables template
├── .gitignore              # Files to ignore in git
└── README.md               # Project documentation
```

## 🗄️ Database Schema

### profiles table
| Column | Type | Description |
|---|---|---|
| id | uuid | Foreign key to auth.users |
| full_name | text | Student full name |
| roll_number | text | Unique roll number |
| phone | text | Phone number |
| branch | text | CSE, ECE, ME, CE, etc |
| cgpa | float | Current CGPA |
| graduation_year | int | Expected graduation year |
| resume_link | text | Google Drive or URL link |
| is_admin | boolean | Admin flag (default false) |

### companies table
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| name | text | Company name |
| role | text | Job role/position |
| description | text | Job description |
| min_cgpa | float | Minimum CGPA required |
| allowed_branches | text | Comma-separated branches |
| graduation_year | int | Required graduation year |
| deadline | date | Application deadline |
| created_at | timestamp | Auto-generated timestamp |

### applications table
| Column | Type | Description |
|---|---|---|
| id | uuid | Primary key |
| student_id | uuid | Foreign key to profiles |
| company_id | uuid | Foreign key to companies |
| status | text | Applied/Shortlisted/Selected/Rejected |
| applied_on | timestamp | Auto-generated timestamp |

## 🚀 Getting Started

### Prerequisites
- A Supabase account (free) at supabase.com
- A code editor (VS Code or Cursor)
- Live Server extension or npx serve

### Step 1 — Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/placement-portal.git
cd placement-portal
```

### Step 2 — Set up Supabase
1. Go to supabase.com and create a new project
2. Go to SQL Editor and run the contents of database/schema.sql
3. Go to Authentication → Sign In/Providers → disable "Confirm email"

### Step 3 — Configure your keys
1. Open static/js/config.js
2. Replace with your Supabase project URL and anon key:
```javascript
const SUPABASE_URL = 'https://your-project.supabase.co'
const SUPABASE_ANON_KEY = 'your-anon-key'
```

### Step 4 — Run locally
```bash
npx serve .
```
Then open http://localhost:3000

### Step 5 — Set up admin account
1. Register a new account on the website
2. Go to Supabase SQL Editor and run:
```sql
UPDATE profiles SET is_admin = true 
WHERE roll_number = 'your_roll_number';
```

## 🔐 Security
- Supabase Row Level Security (RLS) enabled on all tables
- Students can only read/write their own profile and applications
- Admin access controlled via is_admin flag in profiles table
- Anon key is safe for frontend use (read-only with RLS)
- Never expose service_role key in frontend code

## 🎨 UI Features
- Clean modern design with custom CSS only
- CSS variables for consistent color theming
- Fully responsive layout using Flexbox and Grid
- Color-coded application status badges
- Smooth hover effects on cards and buttons

## 👩‍💻 Author
**Raiza Duggal**
- GitHub: [@raizaduggal12](https://github.com/raizaduggal12)

## 📄 License
This project is open source and available under the MIT License.
