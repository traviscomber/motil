-- Canonical maintenance fleet provided by Ariel López on 2026-10-01.
-- The detailed assignment/cost history is preserved in source_payload; assets are keyed by source asset_code + license_plate.

with existing_batch as (
  select id
  from staging.import_batches
  where organization_id='2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'::uuid
    and source_file='Distribución Camionetas CMLP (1).xlsx'
    and metadata->>'canonical_date'='2026-10-01'
  order by created_at desc
  limit 1
),
batch as (
  insert into staging.import_batches(
    organization_id, source_file, source_file_sha256, source_type,
    status, total_rows, valid_rows, warning_rows, error_rows, metadata,
    validated_at, promoted_at
  )
  select
    '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'::uuid,
    'Distribución Camionetas CMLP (1).xlsx',
    encode(digest('Distribución Camionetas CMLP (1).xlsx|Ariel López|2026-10-01','sha256'),'hex'),
    'canonical_user_provided',
    'promoted',
    28,28,0,0,
    jsonb_build_object('provider','Ariel López','canonical_date','2026-10-01','scope','maintenance_fleet'),
    now(),now()
  where not exists (select 1 from existing_batch)
  returning id
),
selected_batch as (
  select id from batch
  union all
  select id from existing_batch
  limit 1
),
src(brand,plate,year,assignment,asset_code,records,spend,last_record) as (
  values
  ('NISSAN Terrano','FGCJ-20',2013,'Reemplazo Explosivos (Mecanico) (San Pedro) (Minas)','113-1',22,416108.14::numeric,'2026-04-30'::date),
  ('TOYOTA Hilux','HSBK-26',2016,'Servicios maestranza N°2 (Jefe Mantención Planta)','116-1',2,22940::numeric,'2026-03-17'::date),
  ('VOLSKWAGEN Amarok','STWK-87',2023,'Gerente General (Jorge Diaz)','120-1',2,88656::numeric,'2026-02-04'::date),
  ('TOYOTA Hilux','PHLG-34',2021,'Servicios N°2 Mina Don Jaime (Jefe Mina - Administrativo)','121-6',36,689472.70::numeric,'2026-04-30'::date),
  ('TOYOTA Hilux','PHLF-83',2021,'Servicios Sondaje N°2 (Jefe Sondaje / Mina Don Jaime)','221-6',25,1222007.81::numeric,'2026-05-05'::date),
  ('TOYOTA Hilux','PRZJ-20',2021,'Explosivos Mina Peumo (Mecanicos / Mina Peumo)','321-6',14,353499::numeric,'2026-04-27'::date),
  ('TOYOTA Hilux','PRXH-15',2021,'Explosivos Mina Don Jaime (Mecanicos / Mina Don Jaime)','421-6',43,1438344.21::numeric,'2026-04-30'::date),
  ('TOYOTA Hilux','PSST-36',2021,'Servicios Planta (Victor Delgado - Jefe Turno)','521-6',4,19030::numeric,'2026-03-04'::date),
  ('TOYOTA Hilux','RPSY-24',2022,'Servicios Sondaje N°1 (Jhonathan Lazo / Minas)','222-6',11,1005555.42::numeric,'2026-04-30'::date),
  ('TOYOTA Hilux','RPSY-62',2022,'Servicios N°1 Mina Don Jaime (Jefes de Turno)','322-6',25,1785436.31::numeric,'2026-04-30'::date),
  ('TOYOTA Hilux','RPSY-63',2022,'Topografia (Bastian Vidal, Andres lillo)','422-6',12,316006.28::numeric,'2026-04-30'::date),
  ('TOYOTA Hilux','RPSY-64',2022,'Servicios N°1 Mina San Pedro (Nicolás Mihlenbrock)','522-6',3,98726::numeric,'2026-04-14'::date),
  ('KIA Frontier','RJXG-44',2022,'Administración y Servicios N°3 (Bodega)','622-6',18,528680.27::numeric,'2026-05-05'::date),
  ('TOYOTA Hilux','SGSY-56',2023,'Administración y Servicios N°2 (William Videla, Venancio Miranda)','123-3',18,262499::numeric,'2026-05-04'::date),
  ('TOYOTA Hilux','SKSZ-22',2023,'Servicios N°1 Mina Peumo (Jefes de Turno)','223-3',42,1507347.16::numeric,'2026-05-05'::date),
  ('TOYOTA Hilux','SJVT-30',2023,'Servicios Maestranza N°1 (Luis Diaz / Eléctricos)','323-3',17,1587132.35::numeric,'2026-05-05'::date),
  ('TOYOTA Hilux','TCFH-27',2024,'Geologia N°2 (Emilio Cabrera / Pedro Calisto)','124-3',27,768598.93::numeric,'2026-05-05'::date),
  ('TOYOTA Hilux','TCFH-28',2024,'Explosivos y Servicios Raiz del Cobre (Jefe Mina / Jefe Turno)','224-3',15,1071375.75::numeric,'2026-05-05'::date),
  ('TOYOTA Hilux','TCCX-81',2024,'Explosivos y Servicios San Pedro (Jefe Mina / Jefe Turno)','324-3',20,810693.23::numeric,'2026-05-05'::date),
  ('TOYOTA Hilux','TRKP-63',2025,'Jefe Mina Don Jaime (Cristian Rubio)','125-9',43,3198232.90::numeric,'2026-05-05'::date),
  ('TOYOTA Hilux','TRKP-65',2025,'Jefe Mina Peumo (Jaime Manquez)','225-9',33,2333206.02::numeric,'2026-05-05'::date),
  ('TOYOTA Hilux','TRKP-66',2025,'Mantencion Equipos N°2 (Mauricio Astudillo)','325-9',15,527698::numeric,'2026-05-05'::date),
  ('TOYOTA Hilux','TRKP-67',2025,'Prevencion y sostenibilidad (Gonzalo Canales)','425-9',13,1221066.77::numeric,'2026-05-05'::date),
  ('TOYOTA Hilux','TRKP-68',2025,'Mantencion Equipos N°1 (Gustavo Vega)','525-9',13,1174999.77::numeric,'2026-05-05'::date),
  ('TOYOTA Hilux','VFLZ-88',2025,'Subgerente de operaciones (Pedro Zegers)','625-9',5,924721::numeric,'2026-05-05'::date),
  ('TOYOTA Hilux','VFPB-14',2025,'Jefe de ingenieria y planificacion (Fernando Maldonado)','725-9',8,72824.42::numeric,'2026-05-05'::date),
  ('TOYOTA Hilux','VFPB-43',2025,'Administración y Servicios N°1 (Esteban Diaz / Administración)','825-9',28,1124139.07::numeric,'2026-05-05'::date),
  ('TOYOTA Hilux','VFPB-67',2025,'Geologia N°1 (Esteban Siebert)','925-9',10,407600::numeric,'2026-05-05'::date)
),
numbered as (
  select row_number() over(order by asset_code)::int as source_row, s.*
  from src s
)
insert into canonical.assets (
  organization_id, asset_code, name, asset_type,
  manufacturer, model, license_plate, is_active,
  validation_status, validation_notes,
  source_file, source_sheet, source_row, import_batch_id, source_hash,
  source_payload, imported_at, updated_at
)
select
  '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'::uuid,
  n.asset_code,
  n.brand || ' ' || n.plate,
  'vehicle',
  split_part(n.brand,' ',1),
  substring(n.brand from position(' ' in n.brand)+1),
  n.plate,
  true,
  'valid',
  array['Fuente canónica provista por Ariel López el 2026-10-01'],
  'Distribución Camionetas CMLP (1).xlsx',
  'Canonical Ariel',
  n.source_row,
  b.id,
  'asset:' || md5(concat_ws('|',n.asset_code,n.plate,n.brand,n.year::text,n.assignment)),
  jsonb_build_object(
    'year',n.year,
    'assignment',n.assignment,
    'maintenance_records',n.records,
    'aggregated_spend',n.spend,
    'last_record',n.last_record
  ),
  now(),
  now()
from numbered n
cross join selected_batch b
where not exists (
  select 1
  from canonical.assets a
  where a.organization_id='2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee'::uuid
    and upper(trim(a.license_plate))=n.plate
);
