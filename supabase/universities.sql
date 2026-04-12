create table if not exists public.universities (
  id text primary key,
  name text not null,
  short_name text not null,
  city text not null,
  lat double precision not null,
  lng double precision not null,
  color text not null default '#000000',
  country text not null,
  disciplines text[] not null default '{}',
  logo text,
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

insert into public.universities (id, name, short_name, city, lat, lng, color, country, disciplines, logo, status)
values
  ('nederlandse-filmacademie', 'Nederlandse Filmacademie', 'NFA', 'Amsterdam', 52.3676, 4.9041, '#E63946', 'Netherlands', '{"Production design"}', '/images/logos/nederlandse-filmacademie.png', 'active'),
  ('film-university-babelsberg', 'Film University Babelsberg Konrad Wolf', 'FUB', 'Potsdam', 52.3906, 13.0356, '#457B9D', 'Germany', '{"Screenwriting","Production design","Film production"}', null, 'active'),
  ('royal-danish-academy', 'Royal Danish Academy', 'RDA', 'København', 55.6761, 12.5683, '#2A9D8F', 'Denmark', '{"Game design"}', '/images/logos/royal-danish-academy.png', 'active'),
  ('st-helens-college', 'St Helens College', 'SHC', 'Saint Helens', 53.4534, -2.7369, '#F4A261', 'United Kingdom', '{}', '/images/logos/st-helens-college.png', 'inactive'),
  ('szkola-filmowa-lodz', 'Szkoła Filmowa w Łodzi', 'SFŁ', 'Łódź', 51.7592, 19.456, '#C855D8', 'Poland', '{"Film production"}', '/images/logos/szkola-filmowa-lodz.png', 'active'),
  ('ubc', 'University of British Columbia', 'UBC', 'Vancouver', 49.2606, -123.246, '#264653', 'Canada', '{"Anthropology & Language"}', '/images/logos/ubc.png', 'active'),
  ('unl', 'University of Nebraska-Lincoln', 'UNL', 'Lincoln', 40.8202, -96.7005, '#E76F51', 'United States', '{"Interdisciplinary"}', '/images/logos/unl.png', 'inactive'),
  ('u-miami', 'University of Miami', 'UMiami', 'Miami', 25.7217, -80.2736, '#F77F00', 'United States', '{}', '/images/logos/u-miami.png', 'active'),
  ('usc', 'University of Southern California', 'USC', 'Los Angeles', 34.0224, -118.2851, '#9B2226', 'United States', '{"Interdisciplinary"}', '/images/logos/usc.png', 'active'),
  ('uc3m', 'University Carlos III of Madrid', 'UC3M', 'Madrid', 40.3314, -3.7668, '#005F73', 'Spain', '{"Audiovisual communication"}', '/images/logos/uc3m.png', 'active'),
  ('polimi', 'Politécnico de Milán', 'PoliMi', 'Milán', 45.4784, 9.2275, '#94D2BD', 'Italy', '{"Toys design"}', '/images/logos/polimi.png', 'inactive'),
  ('domus-academy', 'Domus Academy', 'Domus', 'Milán', 45.4642, 9.19, '#0A9396', 'Italy', '{"Product","Urban","Architecture"}', '/images/logos/domus-academy.png', 'active'),
  ('uanl', 'Universidad Autónoma de Nuevo León', 'UANL', 'Monterrey', 25.7277, -100.3112, '#EE9B00', 'Mexico', '{"Industrial design"}', '/images/logos/uanl.png', 'active'),
  ('u-externado', 'Universidad Externado de Colombia', 'UEC', 'Bogotá', 4.5981, -74.0676, '#CA6702', 'Colombia', '{}', '/images/logos/u-externado.png', 'active'),
  ('kamehameha', 'Kamehameha Schools', 'KS', 'Hawai''i', 21.3333, -157.8015, '#BB3E03', 'United States', '{}', '/images/logos/kamehameha.png', 'active'),
  ('espm', 'ESPM Escola Superior de Propaganda e Marketing', 'ESPM', 'São Paulo', -23.5639, -46.6544, '#AE2012', 'Brazil', '{"Journalism","Transmedia"}', '/images/logos/espm.png', 'active'),
  ('u-austral', 'Universidad Austral', 'UA', 'Buenos Aires', -34.6279, -58.5205, '#9B2226', 'Argentina', '{"Communication","Design","Engineering","International relations and business"}', '/images/logos/u-austral.png', 'active'),
  ('u-montevideo', 'UM Universidad de Montevideo', 'UdeM', 'Montevideo', -34.9061, -56.1541, '#6D6875', 'Uruguay', '{"Audiovisual communication"}', '/images/logos/u-montevideo.png', 'inactive'),
  ('strathmore', 'Strathmore University', 'SU', 'Nairobi', -1.3097, 36.8112, '#B5838D', 'Kenya', '{"Audiovisual communications","Philosophy"}', '/images/logos/strathmore.png', 'inactive'),
  ('griffith', 'Griffith University', 'GU', 'Brisbane', -27.5534, 153.0544, '#E5989B', 'Australia', '{"Film"}', '/images/logos/griffith.png', 'inactive'),
  ('purdue', 'Purdue University', 'Purdue', 'West Lafayette', 40.4237, -86.9212, '#FFB4A2', 'United States', '{}', null, 'active'),
  ('willem-de-kooning', 'Willem de Kooning Academy (RUAS)', 'WdKA', 'Rotterdam', 51.9194, 4.4869, '#6A4C93', 'Netherlands', '{}', null, 'active'),
  ('ufv', 'Universidad Francisco de Vitoria', 'UFV', 'Madrid', 40.4156, -3.7075, '#1D3557', 'Spain', '{"Videogame creation","Narration"}', null, 'active'),
  ('wbi-europe', 'World Building Institute Europe / Berlinale Talents', 'WBI', 'Berlin', 52.52, 13.405, '#D4A373', 'Germany', '{}', null, 'active')
on conflict (id) do nothing;
