insert into aircraft_types (code, manufacturer, name, default_cruise_speed_kmh, service_ceiling_ft)
values
('A320', 'Airbus', 'A320-200', 828, 39000),
('A321', 'Airbus', 'A321neo', 833, 39000),
('A359', 'Airbus', 'A350-900', 905, 43000),
('B38M', 'Boeing', '737 MAX 8', 839, 41000),
('B789', 'Boeing', '787-9', 903, 43000),
('B77W', 'Boeing', '777-300ER', 892, 43000)
on conflict (code) do nothing;
