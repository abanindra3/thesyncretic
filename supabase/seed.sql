-- Development-only inventory: 7 physical rooms in each public category.
-- Replace room numbers and rates with the real property inventory before production.
insert into public.rooms (room_number, category, description, capacity, bed_configuration, amenities, base_price)
select '10' || room_number, 'Double Room', 'A warm and considered room for two.', 2, 'Double bed', '["Wi-Fi","Air conditioning","Breakfast"]', 1400
from generate_series(1, 7) room_number
on conflict (room_number) do nothing;

insert into public.rooms (room_number, category, description, capacity, bed_configuration, amenities, base_price)
select '20' || room_number, 'Superior Room', 'A generous room with a king bed.', 2, 'King bed', '["Wi-Fi","Air conditioning","Breakfast"]', 1600
from generate_series(1, 7) room_number
on conflict (room_number) do nothing;

insert into public.hotel_settings (id) values (true) on conflict (id) do nothing;
