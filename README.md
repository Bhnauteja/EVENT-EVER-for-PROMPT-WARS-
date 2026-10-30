# PlanWise — Intelligent Event Planning & Coordination Platform

[![Live App](https://img.shields.io/badge/Live%20Demo-event--ever--for--prompt--wars.vercel.app-6366f1?style=for-the-badge&logo=vercel)](https://event-ever-for-prompt-wars.vercel.app)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github)](https://github.com/bhanu236876543/EVENT-EVER-for-PROMPT-WARS-)
[![Database](https://img.shields.io/badge/Supabase-PostgreSQL%20RLS-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)

🔗 **Live Production URL:** [https://event-ever-for-prompt-wars.vercel.app](https://event-ever-for-prompt-wars.vercel.app)  
📱 **Public Guest Hub Demo:** [https://event-ever-for-prompt-wars.vercel.app/event/techsprint-2026](https://event-ever-for-prompt-wars.vercel.app/event/techsprint-2026)

**PlanWise** is a full-stack, AI-powered event coordination operating system designed for event organizers and attendees. It connects fragmented event planning workflows—schedules, budgets, vendors, task dependencies, RSVPs, and WhatsApp communications—into a single, unified platform.

---

## 🌟 Core Pillars

### 1. PLAN (AI Event Architecture)
- **AI Event Architect:** Generates structured, realistic timelines, budget category allocations, preparation checklists, vendor needs, and cost-saving ideas tailored to your event type (Hackathons, Weddings, Birthdays, Conferences, Community Gatherings).
- **Dual-Engine Reliability:** Runs on a deterministic expert planning engine by default (zero API setup required) with optional plug-and-play integration for **Google Gemini (1.5 Flash)** and **OpenAI (GPT-4o)**.
- **Granular Review & Merge:** Review generated schedule items, budgets, and tasks individually before safely merging them into live records—no accidental overwrites.

### 2. MANAGE (Deterministic Operations)
- **Budget Reality Check & What-If Simulator:**
  - Strict deterministic accounting tracking *Estimated*, *Quoted*, *Committed*, *Paid*, and *Actual* expenses.
  - Payments reduce unpaid obligations rather than inflating expense counts.
  - Health scores and benchmark underestimation alerts (e.g. per-guest catering realism, missing equipment rentals).
  - Isolated **What-If Sandbox Simulator** to adjust guest counts, budgets, and category multipliers without touching database records until explicitly confirmed.
- **Timeline Builder & Live Radar:**
  - Full CRUD with automatic **schedule overlap detection**.
  - Internal vs. Guest-Visible privacy toggles.
  - Event-day clock showing **"Happening Right Now"** and **"Up Next"** based on the event's actual timezone.
- **Vendor Contracts Tracker:**
  - Side-by-side vendor quotation comparison.
  - Balance due tracking and organizer-only contact notes.
- **Task & Checklist Board:**
  - Priority levels (*Urgent*, *High*, *Medium*, *Low*), overdue highlights, team assignments, and filter tabs.
- **Plan-Change Dependency & Impact Analysis:**
  - Simulates cascade dependencies when event dates, venues, budgets, or guest counts are altered.
  - Flags affected vendors, tasks, and reminders before changes are saved.
- **Event Risk Alerts Banner:**
  - Real-time audit flagging schedule overlaps, impending vendor payment milestones, overdue tasks, and low RSVP response rates.

### 3. CONNECT (Guest Experience & Communication)
- **Mobile-First Public Guest Event Hub:**
  - Responsive, beautiful dark-mode interface designed for Android and mobile browsers.
  - Strictly presents published information—organizer finances, internal notes, and vendor data are completely excluded.
  - One-click RSVP with plus-one counts, dietary preferences, and celebratory confetti.
  - **Event-Aware AI Chatbot:** Grounded exclusively in published event details to answer guest questions about directions, parking, dress codes, and schedules without hallucinations.
- **Scannable QR Codes:**
  - Generates instant scannable QR codes linking directly to the guest event hub.
  - Downloadable high-resolution PNG for posters, badge lanyards, and print invitations.
- **WhatsApp Automation Engine:**
  - Provider abstraction supporting the official **Meta WhatsApp Cloud API**.
  - Compliant, transparent **WhatsApp Click-to-Chat (`wa.me`) manual fallback** with pre-filled messages and secure token links when API keys are not entered.
  - Recipient eligibility re-checks (e.g., skips RSVP reminders for guests who already confirmed attendance).
  - Audited dispatch history log.
- **CSV Guest Import & Export:**
  - Import guest rosters from CSV with live preview and syntax validation.
  - Export RSVP attendance reports with dietary notes and response tokens.

---

## 🛠️ Tech Stack & Architecture

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS v4, custom glassmorphism design tokens, Outfit & Plus Jakarta Sans typography
- **Icons:** Lucide React
- **QR Engine:** `qrcode`
- **Effects:** `canvas-confetti`
- **Persistence:**
  - **Local Offline Database Engine (Active):** Browser storage with full relational structure, seed data hydration, and JSON export/import backups.
  - **Supabase PostgreSQL Ready:** Complete schema with **Row Level Security (RLS)** in `supabase/schema.sql`.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js (v18+)
- `pnpm` (or `npm`)

### 2. Install & Start Locally
```bash
# Clone the repository
git clone <repo-url>
cd "prompt wars"

# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

Open `http://localhost:5173/` in your browser.

### 3. Build for Production
```bash
pnpm run build
```
Build output is saved to `/dist`.

---

## 🔒 Security & Privacy Standard

- **Row Level Security (RLS):** Policies are enforced at the database layer (see `supabase/schema.sql`).
- **Data Isolation:** Public guest hub endpoints and views strictly exclude all financial columns, organizer notes, internal vendor pricing, and other guests' contact information.
- **Unguessable Tokens:** Guest RSVP links use unique non-sequential tokens (`gst_...`) preventing unauthorized cross-guest modification.
- **Zero Hallucination Communication:** PlanWise never fabricates fake delivery statuses or testimonials. When Meta API keys are not supplied, the app clearly labels dispatches as Click-to-Chat.

---

## 📄 Database Migration (Supabase)

To link to a live Supabase project:
1. Open your [Supabase Dashboard](https://supabase.com/).
2. Navigate to the **SQL Editor**.
3. Paste the contents of `supabase/schema.sql` and click **Run**.
4. In PlanWise, open **Settings** (gear icon) and paste your **Supabase URL** and **Anon Public Key**.

---

## 📱 WhatsApp Integration Setup

### Option A: Official Meta Cloud API (Automated Delivery)
1. Register on [Meta for Developers](https://developers.facebook.com/).
2. Setup a WhatsApp Business App and retrieve your **Phone Number ID** and **System User Access Token**.
3. In PlanWise, open **Settings** and enter both values.

### Option B: Click-to-Chat Mode (Free, Instant, No Account Required)
- Leave settings blank. PlanWise will automatically generate personalized `wa.me` links containing the guest's name, event details, and unique RSVP token.

---

## 👥 Seed & Demo Data Included

The application ships with 3 pre-configured demo events:
1. **TechSprint 2026: AI & Systems Hackathon** (220 attendees, schedule, AV/catering expenses, tasks, guests)
2. **Elena & Liam's Sunset Vineyard Wedding** (110 guests, wine estate budget, photography quotes)
3. **Marcus's 30th Rooftop Birthday Celebration** (65 guests, cocktail lounge, music cues)

You can reset to demo data or export your customized events at any time via the **Settings** modal.
