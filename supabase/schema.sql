-- ==============================================================================
-- Supabase Schema for WhatsApp OTP Verification System
-- Run this in the Supabase Dashboard -> SQL Editor -> New Query
-- ==============================================================================

-- 1. Create table for OTP records
create table if not exists public.otp_verifications (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,
  otp_hash text not null,
  expires_at timestamptz not null,
  is_verified boolean not null default false,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);

-- 2. Indexes for fast lookup by phone number & verification status
create index if not exists idx_phone_verified 
  on public.otp_verifications (phone_number, is_verified);

create index if not exists idx_created_at 
  on public.otp_verifications (created_at desc);

-- 3. Security: Enable Row Level Security (RLS)
-- Disallow direct access from client browsers/anon keys.
-- The Netlify serverless functions use the service_role key which bypasses RLS.
alter table public.otp_verifications enable row level security;

-- (Optional) Explicitly revoke all permissions from public/anon users:
revoke all on public.otp_verifications from anon, authenticated;

-- 4. (Optional) Maintenance function to clean up expired OTPs older than 24 hours
create or replace function public.cleanup_expired_otps()
returns void
language sql
as $$
  delete from public.otp_verifications
  where created_at < now() - interval '24 hours';
$$;
