-- Development-only inventory. Change these to match the physical rooms before production use.
insert into public.rooms (id, room_number, category, description, capacity, bed_configuration, amenities, base_price) values
  ('00000000-0000-4000-8000-000000000101', '101', 'Double Room', 'A warm and considered room for two.', 2, 'Double bed', '["Wi-Fi","Air conditioning","Breakfast"]', 1400),
  ('00000000-0000-4000-8000-000000000102', '102', 'Double Room', 'A warm and considered room for two.', 2, 'Double bed', '["Wi-Fi","Air conditioning","Breakfast"]', 1400),
  ('00000000-0000-4000-8000-000000000201', '201', 'Superior Room', 'A generous room with a king bed.', 2, 'King bed', '["Wi-Fi","Air conditioning","Breakfast"]', 1600),
  ('00000000-0000-4000-8000-000000000202', '202', 'Superior Room', 'A generous room with a king bed.', 2, 'King bed', '["Wi-Fi","Air conditioning","Breakfast"]', 1600)
on conflict (room_number) do nothing;

insert into public.hotel_settings (id) values (true) on conflict (id) do nothing;
