begin;

with creator_cargos as (
  select id
  from public.cargos
  where lower(trim(name)) in (
    'jefe departamento de mantenimiento',
    'jefe de planificación',
    'jefe de equipos móviles y estacionarios',
    'jefe de taller mina don jaime',
    'jefe de taller mina peumo',
    'jefe de taller mina san pedro',
    'jefe mina don jaime',
    'jefe mina peumo',
    'jefe mina san pedro'
  )
)
insert into public.role_matrix (cargo_id, module_key, access_level, updated_at)
select id, 'mant_operaciones', 'ED', now()
from creator_cargos
on conflict (cargo_id, module_key)
do update set
  access_level = excluded.access_level,
  updated_at = excluded.updated_at;

commit;
