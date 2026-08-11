-- wger exercise catalog (CC-BY-SA 4.0) — reference data seeded via scripts/seed-wger-exercises.ts

create table if not exists public.exercise_categories (
  id int primary key,
  name text not null
);

create table if not exists public.muscles (
  id int primary key,
  name text not null,
  name_en text,
  is_front boolean not null default true,
  image_url_main text,
  image_url_secondary text
);

create table if not exists public.equipment (
  id int primary key,
  name text not null
);

create table if not exists public.exercises (
  id int primary key,
  uuid uuid not null unique,
  name text not null,
  description text,
  category_id int references public.exercise_categories (id),
  image_url text,
  image_thumbnail_url text
);

create index if not exists exercises_category_id_idx on public.exercises (category_id);

create table if not exists public.exercise_muscles (
  exercise_id int not null references public.exercises (id) on delete cascade,
  muscle_id int not null references public.muscles (id) on delete cascade,
  is_primary boolean not null default false,
  primary key (exercise_id, muscle_id)
);

create index if not exists exercise_muscles_muscle_id_idx on public.exercise_muscles (muscle_id);

create table if not exists public.exercise_equipment (
  exercise_id int not null references public.exercises (id) on delete cascade,
  equipment_id int not null references public.equipment (id) on delete cascade,
  primary key (exercise_id, equipment_id)
);

create index if not exists exercise_equipment_equipment_id_idx on public.exercise_equipment (equipment_id);

alter table public.exercise_categories enable row level security;
alter table public.muscles enable row level security;
alter table public.equipment enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_muscles enable row level security;
alter table public.exercise_equipment enable row level security;

drop policy if exists "exercise_categories_select_all" on public.exercise_categories;
create policy "exercise_categories_select_all"
  on public.exercise_categories for select
  using (true);

drop policy if exists "muscles_select_all" on public.muscles;
create policy "muscles_select_all"
  on public.muscles for select
  using (true);

drop policy if exists "equipment_select_all" on public.equipment;
create policy "equipment_select_all"
  on public.equipment for select
  using (true);

drop policy if exists "exercises_select_all" on public.exercises;
create policy "exercises_select_all"
  on public.exercises for select
  using (true);

drop policy if exists "exercise_muscles_select_all" on public.exercise_muscles;
create policy "exercise_muscles_select_all"
  on public.exercise_muscles for select
  using (true);

drop policy if exists "exercise_equipment_select_all" on public.exercise_equipment;
create policy "exercise_equipment_select_all"
  on public.exercise_equipment for select
  using (true);

grant select on public.exercise_categories to anon, authenticated;
grant select on public.muscles to anon, authenticated;
grant select on public.equipment to anon, authenticated;
grant select on public.exercises to anon, authenticated;
grant select on public.exercise_muscles to anon, authenticated;
grant select on public.exercise_equipment to anon, authenticated;
