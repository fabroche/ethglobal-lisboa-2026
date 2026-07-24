-- =============================================================================
-- 0001_init — esquema base (TENTATIVO, sujeto a la decisión de idea)
-- Proyecto ETHGlobal Lisboa 2026. Cola de jobs IA + perfiles + wallets read-only.
-- =============================================================================

create extension if not exists "pgcrypto";

-- Perfil de usuario (multi-tenant por user_id de Supabase Auth).
create table if not exists perfil (
  id          uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at  timestamptz not null default now()
);

-- Wallets que el usuario quiere vigilar (SOLO LECTURA — direcciones públicas).
create table if not exists wallet (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  address     text not null,          -- dirección 0x… (pública)
  ens_name    text,                   -- nombre ENS si se resuelve
  label       text,
  chain       text not null default 'ethereum',
  created_at  timestamptz not null default now(),
  unique (user_id, address, chain)
);

-- Cola de tareas para la IA de runtime (drenada por el worker headless).
create table if not exists ai_jobs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete cascade,
  tipo        text not null,          -- p. ej. 'reporte', 'asistente'
  estado      text not null default 'pendiente',  -- pendiente|procesando|hecho|error
  input       jsonb not null default '{}'::jsonb,
  output      jsonb,
  error       text,
  intentos    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists ai_jobs_estado_idx on ai_jobs (estado, created_at);

-- Claim atómico de un job (SKIP LOCKED) para que varios workers no colisionen.
create or replace function tomar_ai_job()
returns ai_jobs
language plpgsql
as $$
declare
  job ai_jobs;
begin
  select * into job
  from ai_jobs
  where estado = 'pendiente'
  order by created_at
  for update skip locked
  limit 1;

  if not found then
    return null;
  end if;

  update ai_jobs
  set estado = 'procesando', intentos = intentos + 1, updated_at = now()
  where id = job.id
  returning * into job;

  return job;
end;
$$;

-- RLS: cada usuario solo ve lo suyo.
alter table perfil   enable row level security;
alter table wallet   enable row level security;
alter table ai_jobs  enable row level security;

create policy "perfil propio"  on perfil  for all using (auth.uid() = id)      with check (auth.uid() = id);
create policy "wallets propias" on wallet  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "jobs propios"    on ai_jobs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
