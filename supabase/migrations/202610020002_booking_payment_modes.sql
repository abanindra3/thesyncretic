-- Run after 202610020001_hotel_core.sql. Supports paid online holds and manager/pay-at-hotel confirmations.
create or replace function public.create_booking_hold(
  p_guest_name text, p_phone text, p_email text, p_room_id uuid, p_check_in date, p_check_out date,
  p_adults smallint, p_children smallint, p_special_requests text,
  p_source public.booking_source default 'website', p_payment_policy text default 'full_advance', p_created_by uuid default null
)
returns table(booking_reference text, total_amount numeric, hold_expires_at timestamptz, booking_status public.booking_status) language plpgsql security definer set search_path = public as $$
declare v_guest_id uuid; v_price numeric; v_booking_id uuid; v_nights int; v_status public.booking_status; v_payment_status public.payment_status; v_expiry timestamptz;
begin
  if p_check_out <= p_check_in then raise exception 'INVALID_DATES'; end if;
  select base_price into v_price from rooms where id = p_room_id and active for update;
  if v_price is null then raise exception 'ROOM_UNAVAILABLE'; end if;
  delete from bookings where status = 'hold' and hold_expires_at < now();
  if exists (select 1 from booking_rooms br join bookings b on b.id = br.booking_id where br.room_id = p_room_id and b.status not in ('cancelled','expired') and daterange(p_check_in,p_check_out,'[)') && br.stay) then raise exception 'ROOM_UNAVAILABLE'; end if;
  insert into guests(full_name,phone,email) values (p_guest_name,p_phone,nullif(p_email,'')) on conflict(phone) do update set full_name=excluded.full_name,email=coalesce(excluded.email,guests.email),updated_at=now() returning id into v_guest_id;
  v_nights := p_check_out - p_check_in;
  v_status := case when p_payment_policy = 'pay_at_hotel' then 'confirmed' else 'hold' end;
  v_payment_status := case when p_payment_policy = 'pay_at_hotel' then 'pay_at_hotel' else 'pending' end;
  v_expiry := case when v_status = 'hold' then now()+interval '15 minutes' else null end;
  insert into bookings(guest_id,check_in,check_out,adults,children,base_amount,total_amount,status,payment_status,source,special_requests,hold_expires_at,created_by)
  values(v_guest_id,p_check_in,p_check_out,p_adults,p_children,v_price*v_nights,v_price*v_nights,v_status,v_payment_status,p_source,p_special_requests,v_expiry,p_created_by)
  returning id, bookings.booking_reference into v_booking_id, booking_reference;
  insert into booking_rooms(booking_id,room_id,rate_per_night,adults,children,stay) values(v_booking_id,p_room_id,v_price,p_adults,p_children,daterange(p_check_in,p_check_out,'[)'));
  if v_status = 'confirmed' then insert into payments(booking_id,amount,method,status) values(v_booking_id,v_price*v_nights,'pay_at_hotel','pay_at_hotel'); end if;
  total_amount := v_price*v_nights; hold_expires_at := v_expiry; booking_status := v_status; return next;
end $$;
