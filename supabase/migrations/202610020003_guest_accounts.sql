-- Guest accounts are tied to a verified Supabase Auth email.
alter table public.guests add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;
create index if not exists guests_auth_user_idx on public.guests(auth_user_id);

drop policy if exists "guests view their own record" on public.guests;
drop policy if exists "guests view their bookings" on public.bookings;
drop policy if exists "guests view their booking rooms" on public.booking_rooms;
drop policy if exists "guests view their payments" on public.payments;

create policy "guests view their own record" on public.guests for select using (auth_user_id = auth.uid());
create policy "guests view their bookings" on public.bookings for select using (guest_id in (select id from public.guests where auth_user_id = auth.uid()));
create policy "guests view their booking rooms" on public.booking_rooms for select using (booking_id in (select b.id from public.bookings b join public.guests g on g.id = b.guest_id where g.auth_user_id = auth.uid()));
create policy "guests view their payments" on public.payments for select using (booking_id in (select b.id from public.bookings b join public.guests g on g.id = b.guest_id where g.auth_user_id = auth.uid()));
