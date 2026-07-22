create table if not exists moradas (
  id uuid primary key default gen_random_uuid(),
  zona text not null,
  categoria text not null default '',
  nome text not null default '',
  codigo_bruto text not null default '',
  circuito text not null default '',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists moradas_zona_idx on moradas (zona);
create index if not exists moradas_circuito_idx on moradas (circuito);
