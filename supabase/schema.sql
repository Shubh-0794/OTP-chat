-- ==============================================================================
-- Supabase Schema & Webhook Trigger for WhatsApp OTP Verification System
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
alter table public.otp_verifications enable row level security;
revoke all on public.otp_verifications from anon, authenticated;

-- 4. Enable the pg_net extension in schema 'net' (standard for Supabase)
create extension if not exists pg_net with schema net;

-- 5. Create the Trigger Function using net.http_post
create or replace function public.send_whatsapp_otp_webhook()
returns trigger
language plpgsql
security definer
set search_path = public, net
as $$
declare
  req_id bigint;
  payload jsonb;
begin
  -- Construct the exact JSON payload expected by your Vercel ingress endpoint
  payload := jsonb_build_object(
    'user', jsonb_build_object(
      'phone', new.phone_number
    ),
    'sms', jsonb_build_object(
      'otp', new.otp_hash
    )
  );

  -- Dispatch asynchronous HTTP POST to your Vercel API ingress route using net.http_post
  select net.http_post(
    url := 'https://otp-chat-kappa.vercel.app/api/ingress/supabase-otp-hook/cards-crafted-auth/send-sms',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := payload
  ) into req_id;

  return new;
exception
  when others then
    -- Log warning and allow table insert to proceed even if webhook dispatch hits an error
    raise warning 'WhatsApp OTP webhook trigger error: %', SQLERRM;
    return new;
end;
$$;

-- 6. Drop existing trigger if present to prevent duplicate firing
drop trigger if exists tr_send_whatsapp_otp on public.otp_verifications;

-- 7. Attach trigger on every new row inserted into otp_verifications
create trigger tr_send_whatsapp_otp
  after insert on public.otp_verifications
  for each row
  execute function public.send_whatsapp_otp_webhook();

-- 8. Maintenance function to clean up expired OTPs older than 24 hours
create or replace function public.cleanup_expired_otps()
returns void
language sql
as $$
  delete from public.otp_verifications
  where created_at < now() - interval '24 hours';
$$;
