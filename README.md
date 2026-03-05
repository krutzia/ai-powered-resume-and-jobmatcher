## ResuMatch – AI-Powered Resume & Job Matcher

ResuMatch helps job seekers **analyze their resume against any job description**, get an **ATS-style match score**, and discover **curated job opportunities** that match their skills.  

Upload a PDF/DOCX resume, paste a job description, and ResuMatch will:

- **Score your match** before and after optimization  
- **Highlight missing skills & keywords**  
- **Generate an optimized resume version**  
- **Provide AI insights** on what changed and why  
- **Recommend matched jobs** from multiple sources with per-job match scores  

---

## Features

- **AI Resume Analysis**
  - Upload resume (PDF/DOCX) with validation (type & size)
  - Secure storage in Supabase Storage
  - AI-powered comparison of resume vs. job description
  - Match score before/after optimization (ATS-style)
  - Detailed improvement suggestions
  - Side-by-side original vs. optimized resume view
  - Download optimized resume

- **Job Recommendations**
  - Fetches jobs via Supabase Edge Function (`fetch-jobs`)
  - Per-job **match score** and **matched/missing skills**
  - Smart filters: match %, location, work type, experience level, provider
  - Supports multiple sources (e.g. LinkedIn, Instahyre, Naukri, Wellfound)
  - Quick-apply links + local “saved job” state

- **User Accounts & Dashboard**
  - Email/password authentication with Supabase Auth
  - Protected routes for Dashboard & Jobs
  - Stores analyses in Supabase (resumes, analyses tables)

- **Modern UI/UX**
  - React + Vite + TypeScript
  - shadcn-ui + Radix primitives
  - Tailwind CSS + animations + Framer Motion

---

## Tech Stack

- **Frontend**
  - React 18, TypeScript
  - Vite
  - React Router
  - Tailwind CSS, shadcn-ui, Radix UI, Framer Motion
  - TanStack Query for data fetching

- **Backend / Infra**
  - **Supabase**
    - Auth (email/password)
    - Postgres (resumes, analyses, jobs, etc.)
    - Storage (resume files)
    - Edge Functions:
      - `analyze-resume` – calls AI provider to score/optimize resumes
      - `fetch-jobs` – fetches and scores jobs against resume skills
  - AI provider via HTTPS (configured with `AI_API_KEY` in Supabase function env)

---

## Getting Started

### Prerequisites

- **Node.js** (LTS recommended) and **npm**
- A **Supabase project** with:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
- In Supabase Edge Functions, configure:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `AI_API_KEY` (for the AI model used in `analyze-resume`)

### 1. Clone & Install

```bash
git clone <YOUR_GIT_URL>
cd ai-powered-resume-and-jobmatcher
npm install
```

### 2. Configure Environment (Frontend)

Create a `.env` file in the project root (not committed to Git) and set at least:

```bash
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

Make sure these match the Supabase project where your database, storage, and edge functions live.

### 3. Configure Supabase Edge Functions

In your Supabase project:

- Deploy the functions from the `supabase/functions` directory:
  - `analyze-resume`
  - `fetch-jobs`
- Set environment variables for each function:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `AI_API_KEY`

Also apply the SQL migrations under `supabase/migrations` to create the required tables (e.g. `resumes`, `analyses`, any job tables if present).

### 4. Run the App Locally

```bash
npm run dev
```

Open the URL printed in the terminal (typically `http://localhost:5173`) and:

1. Sign up via the Auth page  
2. Upload a resume on the Dashboard  
3. Paste a job description and run an analysis  
4. View recommended jobs on the Jobs page  

### 5. Run Tests

```bash
npm test
```

---

## Project Structure (High Level)

```text
src/
  main.tsx           # App bootstrap
  App.tsx            # Routes & layout
  pages/
    Index.tsx        # Marketing/landing page
    Auth.tsx         # Login / signup
    Dashboard.tsx    # Resume upload & analysis
    Jobs.tsx         # Job recommendations & filters
  components/
    AIInsightsPanel.tsx
    ATSScoreImpact.tsx
    ResumeComparison.tsx
    ScoreCircle.tsx
    SkillBadge.tsx
    DownloadResumeButton.tsx
    ui/              # shadcn-ui components
  integrations/
    supabase/
      client.ts      # Supabase client config
      types.ts       # Generated types (if any)

supabase/
  functions/
    analyze-resume/  # AI analysis edge function
    fetch-jobs/      # Job fetch & scoring
  migrations/        # Database schema & migrations
```

---

## Deployment

You can deploy the frontend to any modern static hosting provider (e.g. **Vercel**, **Netlify**, **Cloudflare Pages**) by building the app and serving the `dist` folder:

```bash
npm run build
```

For production:

- Deploy Supabase functions (`analyze-resume`, `fetch-jobs`) to your Supabase project  
- Ensure **all environment variables** are set correctly in Supabase and in your frontend hosting provider  
- Point your frontend’s env vars to the production Supabase project  

---

## Contributing

- **Issues & ideas**: open a GitHub issue describing the feature/bug.
- **Pull requests**: fork the repo, create a feature branch, and open a PR with a clear description and screenshots where applicable.

---

## License

Add your preferred license here (e.g. MIT) or link to a `LICENSE` file once chosen.
