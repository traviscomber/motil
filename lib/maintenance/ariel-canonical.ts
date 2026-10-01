export const ARIEL_CANONICAL_SOURCE = {
  provider: 'Ariel López',
  receivedAt: '2026-10-01',
  effectivePeriod: '2026',
  scope: 'Mantenimiento mecánico, equipo humano, flujo de trabajo y distribución/costos de camionetas',
  notes: [
    'La fuente visual de organigrama muestra “Rodrigo Olno”; la lámina de roles muestra “Rodrigo Olmo”. Se conserva Olmo como nombre canónico y Olno como alias de fuente.',
    'Los registros de camionetas provienen del archivo Distribución Camionetas CMLP (1).xlsx. Los montos son agregados de la hoja DATA, sin reinterpretar el concepto de cada movimiento.',
  ],
} as const;

export type CanonicalMaintenanceMember = {
  name: string;
  role: string;
  responsibilities: readonly string[];
  aliases?: readonly string[];
};

export const ARIEL_MAINTENANCE_TEAM: readonly CanonicalMaintenanceMember[] = [
  {
    name: 'Gustavo Vega',
    role: 'Jefe Departamento Mantención Mecánica',
    responsibilities: ['Dirigir', 'Administrar'],
  },
  {
    name: 'Ariel López',
    role: 'Jefe de Planificación',
    responsibilities: ['Planificar', 'Coordinar', 'Programar', 'Gestionar'],
  },
  {
    name: 'Mauricio Astudillo',
    role: 'Jefe de Equipos Móviles y Estacionarios',
    responsibilities: ['Supervisar mantención de equipos', 'Dirigir grupo de mantención', 'Coordinar compra de repuestos y servicios'],
  },
  {
    name: 'Juan Araya',
    role: 'Encargado de taller',
    responsibilities: ['Mantener, revisar y reparar equipos mina', 'Dirigir personal a cargo'],
  },
  {
    name: 'Joaquín Martínez',
    role: 'Encargado de taller',
    responsibilities: ['Mantener, revisar y reparar equipos mina', 'Dirigir personal a cargo'],
  },
  {
    name: 'José Tapia',
    role: 'Encargado de taller',
    responsibilities: ['Mantener, revisar y reparar equipos mina', 'Dirigir personal a cargo'],
  },
  {
    name: 'Rodrigo Olmo',
    aliases: ['Rodrigo Olno'],
    role: 'Encargado de Camionetas, Camiones y Furgones',
    responsibilities: ['Dirigir', 'Mantener camiones, camionetas y furgones', 'Preparar camiones, camionetas y furgones'],
  },
  {
    name: 'Esteban Díaz',
    role: 'Jefe de Bodega',
    responsibilities: [],
  },
] as const;

export const ARIEL_MAINTENANCE_FLOW = [
  { from: 'Gustavo Vega', to: 'Ariel López', relationship: 'Coordinación y decisión' },
  { from: 'Ariel López', to: 'Mauricio Astudillo', relationship: 'Planificación y coordinación' },
  { from: 'Ariel López', to: 'Rodrigo Olmo', relationship: 'Planificación y coordinación' },
  { from: 'Esteban Díaz', to: 'Rodrigo Olmo', relationship: 'Bodega y apoyo operativo' },
  { from: 'Esteban Díaz', to: 'Ariel López', relationship: 'Bodega y planificación' },
  { from: 'Esteban Díaz', to: 'Mauricio Astudillo', relationship: 'Bodega y mantenimiento' },
] as const;

export type ArielVehicleCanonical = {
  brand: string;
  plate: string;
  year: number;
  assignment: string;
  code: string;
  records: number;
  spend: number;
  lastRecord: string | null;
};

export const ARIEL_VEHICLES: readonly ArielVehicleCanonical[] = [
  { brand:'NISSAN Terrano', plate:'FGCJ-20', year:2013, assignment:'Reemplazo Explosivos (Mecanico) (San Pedro) (Minas)', code:'113-1', records:22, spend:416108.14, lastRecord:'2026-04-30' },
  { brand:'TOYOTA Hilux', plate:'HSBK-26', year:2016, assignment:'Servicios maestranza N°2 (Jefe Mantención Planta)', code:'116-1', records:2, spend:22940, lastRecord:'2026-03-17' },
  { brand:'VOLSKWAGEN Amarok', plate:'STWK-87', year:2023, assignment:'Gerente General (Jorge Diaz)', code:'120-1', records:2, spend:88656, lastRecord:'2026-02-04' },
  { brand:'TOYOTA Hilux', plate:'PHLG-34', year:2021, assignment:'Servicios N°2 Mina Don Jaime (Jefe Mina - Administrativo)', code:'121-6', records:36, spend:689472.70, lastRecord:'2026-04-30' },
  { brand:'TOYOTA Hilux', plate:'PHLF-83', year:2021, assignment:'Servicios Sondaje N°2 (Jefe Sondaje / Mina Don Jaime)', code:'221-6', records:25, spend:1222007.81, lastRecord:'2026-05-05' },
  { brand:'TOYOTA Hilux', plate:'PRZJ-20', year:2021, assignment:'Explosivos Mina Peumo (Mecanicos / Mina Peumo)', code:'321-6', records:14, spend:353499, lastRecord:'2026-04-27' },
  { brand:'TOYOTA Hilux', plate:'PRXH-15', year:2021, assignment:'Explosivos Mina Don Jaime (Mecanicos / Mina Don Jaime)', code:'421-6', records:43, spend:1438344.21, lastRecord:'2026-04-30' },
  { brand:'TOYOTA Hilux', plate:'PSST-36', year:2021, assignment:'Servicios Planta (Victor Delgado - Jefe Turno)', code:'521-6', records:4, spend:19030, lastRecord:'2026-03-04' },
  { brand:'TOYOTA Hilux', plate:'RPSY-24', year:2022, assignment:'Servicios Sondaje N°1 (Jhonathan Lazo / Minas)', code:'222-6', records:11, spend:1005555.42, lastRecord:'2026-04-30' },
  { brand:'TOYOTA Hilux', plate:'RPSY-62', year:2022, assignment:'Servicios N°1 Mina Don Jaime (Jefes de Turno)', code:'322-6', records:25, spend:1785436.31, lastRecord:'2026-04-30' },
  { brand:'TOYOTA Hilux', plate:'RPSY-63', year:2022, assignment:'Topografia (Bastian Vidal, Andres lillo)', code:'422-6', records:12, spend:316006.28, lastRecord:'2026-04-30' },
  { brand:'TOYOTA Hilux', plate:'RPSY-64', year:2022, assignment:'Servicios N°1 Mina San Pedro (Nicolás Mihlenbrock)', code:'522-6', records:3, spend:98726, lastRecord:'2026-04-14' },
  { brand:'KIA Frontier', plate:'RJXG-44', year:2022, assignment:'Administración y Servicios N°3 (Bodega)', code:'622-6', records:18, spend:528680.27, lastRecord:'2026-05-05' },
  { brand:'TOYOTA Hilux', plate:'SGSY-56', year:2023, assignment:'Administración y Servicios N°2 (William Videla, Venancio Miranda)', code:'123-3', records:18, spend:262499, lastRecord:'2026-05-04' },
  { brand:'TOYOTA Hilux', plate:'SKSZ-22', year:2023, assignment:'Servicios N°1 Mina Peumo (Jefes de Turno)', code:'223-3', records:42, spend:1507347.16, lastRecord:'2026-05-05' },
  { brand:'TOYOTA Hilux', plate:'SJVT-30', year:2023, assignment:'Servicios Maestranza N°1 (Luis Diaz / Eléctricos)', code:'323-3', records:17, spend:1587132.35, lastRecord:'2026-05-05' },
  { brand:'TOYOTA Hilux', plate:'TCFH-27', year:2024, assignment:'Geologia N°2 (Emilio Cabrera / Pedro Calisto)', code:'124-3', records:27, spend:768598.93, lastRecord:'2026-05-05' },
  { brand:'TOYOTA Hilux', plate:'TCFH-28', year:2024, assignment:'Explosivos y Servicios Raiz del Cobre (Jefe Mina / Jefe Turno)', code:'224-3', records:15, spend:1071375.75, lastRecord:'2026-05-05' },
  { brand:'TOYOTA Hilux', plate:'TCCX-81', year:2024, assignment:'Explosivos y Servicios San Pedro (Jefe Mina / Jefe Turno)', code:'324-3', records:20, spend:810693.23, lastRecord:'2026-05-05' },
  { brand:'TOYOTA Hilux', plate:'TRKP-63', year:2025, assignment:'Jefe Mina Don Jaime (Cristian Rubio)', code:'125-9', records:43, spend:3198232.90, lastRecord:'2026-05-05' },
  { brand:'TOYOTA Hilux', plate:'TRKP-65', year:2025, assignment:'Jefe Mina Peumo (Jaime Manquez)', code:'225-9', records:33, spend:2333206.02, lastRecord:'2026-05-05' },
  { brand:'TOYOTA Hilux', plate:'TRKP-66', year:2025, assignment:'Mantencion Equipos N°2 (Mauricio Astudillo)', code:'325-9', records:15, spend:527698, lastRecord:'2026-05-05' },
  { brand:'TOYOTA Hilux', plate:'TRKP-67', year:2025, assignment:'Prevencion y sostenibilidad (Gonzalo Canales)', code:'425-9', records:13, spend:1221066.77, lastRecord:'2026-05-05' },
  { brand:'TOYOTA Hilux', plate:'TRKP-68', year:2025, assignment:'Mantencion Equipos N°1 (Gustavo Vega)', code:'525-9', records:13, spend:1174999.77, lastRecord:'2026-05-05' },
  { brand:'TOYOTA Hilux', plate:'VFLZ-88', year:2025, assignment:'Subgerente de operaciones (Pedro Zegers)', code:'625-9', records:5, spend:924721, lastRecord:'2026-05-05' },
  { brand:'TOYOTA Hilux', plate:'VFPB-14', year:2025, assignment:'Jefe de ingenieria y planificacion (Fernando Maldonado)', code:'725-9', records:8, spend:72824.42, lastRecord:'2026-05-05' },
  { brand:'TOYOTA Hilux', plate:'VFPB-43', year:2025, assignment:'Administración y Servicios N°1 (Esteban Diaz / Administración)', code:'825-9', records:28, spend:1124139.07, lastRecord:'2026-05-05' },
  { brand:'TOYOTA Hilux', plate:'VFPB-67', year:2025, assignment:'Geologia N°1 (Esteban Siebert)', code:'925-9', records:10, spend:407600, lastRecord:'2026-05-05' },
] as const;

export const ARIEL_VEHICLE_SUMMARY = {
  vehicles: ARIEL_VEHICLES.length,
  maintenanceRecords: ARIEL_VEHICLES.reduce((sum, row) => sum + row.records, 0),
  totalSpend: ARIEL_VEHICLES.reduce((sum, row) => sum + row.spend, 0),
  latestRecord: ARIEL_VEHICLES.reduce<string | null>((latest, row) => !row.lastRecord ? latest : !latest || row.lastRecord > latest ? row.lastRecord : latest, null),
} as const;
