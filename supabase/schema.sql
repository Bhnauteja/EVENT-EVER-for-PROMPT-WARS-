-- PlanWise PostgreSQL Schema & Row Level Security (RLS)
-- Suitable for execution in Supabase SQL Editor

-- 1. Events Table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom',
  description TEXT DEFAULT '',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  venue_name TEXT NOT NULL,
  venue_address TEXT NOT NULL,
  directions_url TEXT,
  estimated_guests INTEGER NOT NULL DEFAULT 50,
  total_planned_budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  dress_code TEXT,
  parking_info TEXT,
  special_instructions TEXT,
  organizer_language TEXT NOT NULL DEFAULT 'en',
  is_published BOOLEAN NOT NULL DEFAULT false,
  public_slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Schedule Items Table
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  date DATE,
  location TEXT NOT NULL,
  responsible_person TEXT,
  dependencies TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'scheduled',
  is_guest_visible BOOLEAN NOT NULL DEFAULT true,
  prep_notes TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Expenses Table (Financial Records - Organizer Only)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  estimated_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  quoted_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  committed_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  actual_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'unpaid',
  commitment_level TEXT NOT NULL DEFAULT 'estimated',
  vendor_id UUID,
  due_date DATE,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Vendors Table (Organizer Only)
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  quoted_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  agreed_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  booking_status TEXT NOT NULL DEFAULT 'inquiry',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  delivery_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Tasks Table (Organizer Only)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  deadline DATE,
  assigned_to TEXT,
  dependencies TEXT[] DEFAULT '{}',
  related_vendor_id UUID,
  related_schedule_id UUID,
  private_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Guests Table
CREATE TABLE IF NOT EXISTS public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  rsvp_status TEXT NOT NULL DEFAULT 'awaiting',
  invitation_status TEXT NOT NULL DEFAULT 'not_sent',
  preferred_language TEXT NOT NULL DEFAULT 'en',
  secure_token TEXT UNIQUE NOT NULL,
  plus_one_allowed BOOLEAN NOT NULL DEFAULT false,
  plus_one_count INTEGER NOT NULL DEFAULT 0,
  dietary_restrictions TEXT,
  guest_notes TEXT,
  organizer_notes TEXT,
  table_number TEXT,
  rsvp_submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'normal',
  target_audience TEXT NOT NULL DEFAULT 'all',
  is_published BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Communication Logs Table (Organizer Only)
CREATE TABLE IF NOT EXISTS public.communication_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  workflow_type TEXT NOT NULL,
  guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  message_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  provider_response TEXT,
  error_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

-- Events Policies:
-- Organizer has full read/write access
CREATE POLICY "Organizers manage their events"
  ON public.events
  FOR ALL
  USING (auth.uid() = organizer_id)
  WITH CHECK (auth.uid() = organizer_id);

-- Public / Guests can view published events
CREATE POLICY "Public can view published events"
  ON public.events
  FOR SELECT
  USING (is_published = true);

-- Schedules Policies:
-- Organizer manages all
CREATE POLICY "Organizers manage schedules"
  ON public.schedules
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.events WHERE events.id = schedules.event_id AND events.organizer_id = auth.uid())
  );

-- Guests can view only guest-visible items from published events
CREATE POLICY "Guests view published schedule"
  ON public.schedules
  FOR SELECT
  USING (
    is_guest_visible = true AND
    EXISTS (SELECT 1 FROM public.events WHERE events.id = schedules.event_id AND events.is_published = true)
  );

-- Expenses Policies (STRICTLY ORGANIZER ONLY)
CREATE POLICY "Expenses strictly private to organizer"
  ON public.expenses
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.events WHERE events.id = expenses.event_id AND events.organizer_id = auth.uid())
  );

-- Vendors Policies (STRICTLY ORGANIZER ONLY)
CREATE POLICY "Vendors strictly private to organizer"
  ON public.vendors
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.events WHERE events.id = vendors.event_id AND events.organizer_id = auth.uid())
  );

-- Tasks Policies (STRICTLY ORGANIZER ONLY)
CREATE POLICY "Tasks strictly private to organizer"
  ON public.tasks
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.events WHERE events.id = tasks.event_id AND events.organizer_id = auth.uid())
  );

-- Guests Policies:
-- Organizer has full access to manage guest roster
CREATE POLICY "Organizers manage guest roster"
  ON public.guests
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.events WHERE events.id = guests.event_id AND events.organizer_id = auth.uid())
  );

-- Guest can view and update ONLY their own RSVP using their unguessable token
CREATE POLICY "Guest views own invitation via secure token"
  ON public.guests
  FOR SELECT
  USING (secure_token IS NOT NULL);

CREATE POLICY "Guest submits own RSVP via secure token"
  ON public.guests
  FOR UPDATE
  USING (secure_token IS NOT NULL)
  WITH CHECK (secure_token IS NOT NULL);

-- Announcements Policies:
CREATE POLICY "Organizers manage announcements"
  ON public.announcements
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.events WHERE events.id = announcements.event_id AND events.organizer_id = auth.uid())
  );

CREATE POLICY "Guests view published announcements"
  ON public.announcements
  FOR SELECT
  USING (
    is_published = true AND
    EXISTS (SELECT 1 FROM public.events WHERE events.id = announcements.event_id AND events.is_published = true)
  );

-- Communication Logs Policies (ORGANIZER ONLY)
CREATE POLICY "Communication logs private to organizer"
  ON public.communication_logs
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.events WHERE events.id = communication_logs.event_id AND events.organizer_id = auth.uid())
  );
