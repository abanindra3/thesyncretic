-- The Syncretic: central booking system. Run with `supabase db push`.
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create type public.staff_role as enum ('owner', 'manager', 'staff');
create type public.booking_source as enum ('website', 'manager', 'walk_in');
create type public.booking_status as enum ('hold', 'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'expired');
create type public.payment_status as enum ('unpaid', 'pending', 'partially_paid', 'paid', 'failed', 'refunded', 'pay_at_hotel');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role public.staff_role not null default 'staff',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index profiles_email_lower_key on public.profiles (lower(email));

create table public.guests (
  id uuid primary key default gen_random_uuid(), full_name text not null, phone text not null,
  email text, address text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(phone)
);
create index guests_search_idx on public.guests (lower(full_name), phone);

create table public.rooms (
  id uuid primary key default gen_random_uuid(), room_number text not null unique, category text not null,
  description text, capacity smallint not null check (capacity > 0), bed_configuration text not null,
  amenities jsonb not null default '[]'::jsonb, base_price numeric(12,2) not null check (base_price >= 0),
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.room_images (
  id uuid primary key default gen_random_uuid(), room_id uuid not null references public.rooms(id) on delete cascade,
  storage_path text not null, caption text, display_order smallint not null default 0, unique(room_id, display_order)
);
create table public.room_rates (
  id uuid primary key default gen_random_uuid(), room_id uuid references public.rooms(id) on delete cascade,
  category text, effective_start date not null, effective_end date not null, price numeric(12,2) not null check (price >= 0),
  rate_type text not null default 'standard', created_by uuid references public.profiles(id),
  check (effective_end >= effective_start), check (room_id is not null or category is not null)
);
create index room_rates_effective_idx on public.room_rates(room_id, effective_start, effective_end);

create table public.bookings (
  id uuid primary key default gen_random_uuid(), booking_reference text not null unique default ('SYN-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  guest_id uuid not null references public.guests(id), check_in date not null, check_out date not null,
  adults smallint not null check (adults > 0), children smallint not null default 0 check (children >= 0),
  nights smallint generated always as (check_out - check_in) stored, base_amount numeric(12,2) not null check (base_amount >= 0),
  taxes numeric(12,2) not null default 0 check (taxes >= 0), discount numeric(12,2) not null default 0 check (discount >= 0),
  total_amount numeric(12,2) not null check (total_amount >= 0), amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  balance_due numeric(12,2) generated always as (total_amount - amount_paid) stored,
  payment_status public.payment_status not null default 'unpaid', status public.booking_status not null default 'hold',
  source public.booking_source not null default 'website', special_requests text, cancellation_reason text, cancelled_at timestamptz,
  hold_expires_at timestamptz, created_by uuid references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (check_out > check_in), check (amount_paid <= total_amount), check ((status <> 'hold') or hold_expires_at is not null)
);
create index bookings_dates_idx on public.bookings(check_in, check_out) where status not in ('cancelled', 'expired');
create index bookings_created_idx on public.bookings(created_at desc);
create index bookings_guest_idx on public.bookings(guest_id, created_at desc);

create table public.booking_rooms (
  id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id) on delete cascade,
  room_id uuid not null references public.rooms(id), rate_per_night numeric(12,2) not null check (rate_per_night >= 0),
  adults smallint not null check (adults > 0), children smallint not null default 0 check (children >= 0),
  stay daterange not null
);
-- Cancellation is accounted for by the transactional availability function below.
create index booking_rooms_room_stay_idx on public.booking_rooms using gist(room_id, stay);

create table public.payments (
  id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0), method text not null, gateway_transaction_id text unique,
  gateway_order_id text unique, status public.payment_status not null, paid_at timestamptz, refund_id text, refund_amount numeric(12,2),
  created_at timestamptz not null default now()
);
create index payments_booking_idx on public.payments(booking_id, created_at desc);

create table public.guest_documents (
  id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id) on delete cascade,
  document_type text not null, storage_path text not null unique, verified boolean not null default false,
  verified_by uuid references public.profiles(id), verified_at timestamptz, uploaded_at timestamptz not null default now()
);
create table public.checkin_checkout (
  booking_id uuid primary key references public.bookings(id) on delete cascade, assigned_room_id uuid references public.rooms(id),
  checked_in_at timestamptz, checked_out_at timestamptz, checked_in_by uuid references public.profiles(id), checked_out_by uuid references public.profiles(id),
  deposit numeric(12,2) not null default 0, additional_charges numeric(12,2) not null default 0, notes text
);
create table public.audit_logs (
  id bigint generated always as identity primary key, user_id uuid references public.profiles(id), action text not null,
  entity_type text not null, entity_id uuid, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table public.hotel_settings (
  id boolean primary key default true check (id), property_name text not null default 'The Syncretic Guest House', timezone text not null default 'Asia/Kolkata',
  currency text not null default 'INR', tax_percent numeric(5,2) not null default 0, payment_policy text not null default 'full_advance',
  contact jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now()
);
create table public.promotions (
  id uuid primary key default gen_random_uuid(), code text not null unique, discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value numeric(12,2) not null check (discount_value >= 0), valid_from date not null, valid_to date not null,
  usage_limit integer, usage_count integer not null default 0, active boolean not null default true, check (valid_to >= valid_from)
);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger guests_updated before update on public.guests for each row execute function public.set_updated_at();
create trigger rooms_updated before update on public.rooms for each row execute function public.set_updated_at();
create trigger bookings_updated before update on public.bookings for each row execute function public.set_updated_at();

create or replace function public.set_booking_room_stay() returns trigger language plpgsql as $$
begin select daterange(check_in, check_out, '[)') into new.stay from public.bookings where id = new.booking_id; return new; end $$;
create trigger booking_room_stay before insert or update of booking_id on public.booking_rooms for each row execute function public.set_booking_room_stay();

create or replace function public.is_staff() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid())
$$;

-- Single transactional source of truth for website booking holds; the room row lock serializes competing attempts.
create or replace function public.create_booking_hold(p_guest_name text, p_phone text, p_email text, p_room_id uuid, p_check_in date, p_check_out date, p_adults smallint, p_children smallint, p_special_requests text)
returns table(booking_reference text, total_amount numeric, hold_expires_at timestamptz) language plpgsql security definer set search_path = public as $$
declare v_guest_id uuid; v_price numeric; v_booking_id uuid; v_nights int;
begin
  if p_check_out <= p_check_in then raise exception 'INVALID_DATES'; end if;
  select base_price into v_price from rooms where id = p_room_id and active for update;
  if v_price is null then raise exception 'ROOM_UNAVAILABLE'; end if;
  delete from bookings where status = 'hold' and hold_expires_at < now();
  if exists (select 1 from booking_rooms br join bookings b on b.id = br.booking_id where br.room_id = p_room_id and b.status not in ('cancelled','expired') and daterange(p_check_in,p_check_out,'[)') && br.stay) then raise exception 'ROOM_UNAVAILABLE'; end if;
  insert into guests(full_name,phone,email) values (p_guest_name,p_phone,nullif(p_email,'')) on conflict(phone) do update set full_name=excluded.full_name,email=coalesce(excluded.email,guests.email),updated_at=now() returning id into v_guest_id;
  v_nights := p_check_out - p_check_in;
  insert into bookings(guest_id,check_in,check_out,adults,children,base_amount,total_amount,status,payment_status,source,special_requests,hold_expires_at)
  values(v_guest_id,p_check_in,p_check_out,p_adults,p_children,v_price*v_nights,v_price*v_nights,'hold','pending','website',p_special_requests,now()+interval '15 minutes') returning id, bookings.booking_reference into v_booking_id, booking_reference;
  insert into booking_rooms(booking_id,room_id,rate_per_night,adults,children,stay) values(v_booking_id,p_room_id,v_price,p_adults,p_children,daterange(p_check_in,p_check_out,'[)'));
  total_amount := v_price*v_nights; hold_expires_at := now()+interval '15 minutes'; return next;
end $$;

alter table public.profiles enable row level security; alter table public.guests enable row level security; alter table public.rooms enable row level security;
alter table public.room_images enable row level security; alter table public.room_rates enable row level security; alter table public.bookings enable row level security;
alter table public.booking_rooms enable row level security; alter table public.payments enable row level security; alter table public.guest_documents enable row level security;
alter table public.checkin_checkout enable row level security; alter table public.audit_logs enable row level security; alter table public.hotel_settings enable row level security; alter table public.promotions enable row level security;
create policy "public can read active rooms" on public.rooms for select using (active);
create policy "staff manage operational data" on public.rooms for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage guests" on public.guests for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage bookings" on public.bookings for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage booking rooms" on public.booking_rooms for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage payments" on public.payments for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage documents" on public.guest_documents for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage profiles" on public.profiles for all using (auth.uid() = id or public.is_staff()) with check (auth.uid() = id or public.is_staff());
create policy "staff manage rates" on public.room_rates for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage images" on public.room_images for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage checkin" on public.checkin_checkout for all using (public.is_staff()) with check (public.is_staff());
create policy "staff read audit" on public.audit_logs for select using (public.is_staff());
create policy "staff manage settings" on public.hotel_settings for all using (public.is_staff()) with check (public.is_staff());
create policy "staff manage promotions" on public.promotions for all using (public.is_staff()) with check (public.is_staff());

insert into storage.buckets (id, name, public) values ('guest-documents', 'guest-documents', false) on conflict do nothing;
create policy "staff access private documents" on storage.objects for all to authenticated using (bucket_id = 'guest-documents' and public.is_staff()) with check (bucket_id = 'guest-documents' and public.is_staff());
