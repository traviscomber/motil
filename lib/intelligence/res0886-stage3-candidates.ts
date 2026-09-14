export type Res0886Stage3Candidate = {
  sourceId: 'sernageomin-res-0886-2025';
  regulatoryLabel: string;
  parentLabel: string | null;
  geometry: 'point' | 'polygon';
  sourceSection: string;
  sourceAnchorStatus: 'official_index_only';
  reviewStatus: 'pending_human_review';
};

const candidate = (
  regulatoryLabel: string,
  geometry: Res0886Stage3Candidate['geometry'],
  sourceSection: string,
  parentLabel: string | null = null,
): Res0886Stage3Candidate => ({
  sourceId: 'sernageomin-res-0886-2025',
  regulatoryLabel,
  parentLabel,
  geometry,
  sourceSection,
  sourceAnchorStatus: 'official_index_only',
  reviewStatus: 'pending_human_review',
});

export const RES_0886_STAGE3_CANDIDATES: readonly Res0886Stage3Candidate[] = [
  candidate('MINA RAJO ABIERTO', 'polygon', 'CLASIFICACIÓN MINAS RAJO ABIERTO'),
  ...[
    'POLVORIN MINA RAJO ABIERTO',
    'CHANCADO MINA RAJO ABIERTO',
    'TALLER MINA RAJO ABIERTO',
    'LUBRICANTERA MINA RAJO ABIERTO',
    'SURTIDOR DE COMBUSTIBLE MINA RAJO ABIERTO',
    'OFICINA Y ADMINISTRACION MINA RAJO ABIERTO',
    'BODEGA MINA RAJO ABIERTO',
    'CASINO MINA RAJO ABIERTO',
    'POLICLINICO MINA RAJO ABIERTO',
    'SALA DE CONTROL MINA RAJO ABIERTO',
    'LABORATORIO MINA RAJO ABIERTO',
  ].map((label) => candidate(label, 'point', 'CLASIFICACIÓN MINAS RAJO ABIERTO', 'MINA RAJO ABIERTO')),

  ...[
    'BODEGA MINA SUBTERRANEA',
    'CASINO MINA SUBTERRANEA',
    'POLICLINICO MINA SUBTERRANEA',
    'SALA DE CONTROL MINA SUBTERRANEA',
    'LABORATORIO MINA SUBTERRANEA',
  ].map((label) => candidate(label, 'point', 'CLASIFICACIÓN MINA SUBTERRANEA', 'MINA SUBTERRANEA')),

  candidate('PLANTA CONCENTRACION', 'polygon', 'CLASIFICACIÓN PLANTAS DE CONCENTRACIÓN'),
  ...[
    'CHANCADO PLANTA DE CONCENTRACION',
    'PLANTA MOLIENDA PLANTA CONCENTRACION',
    'PLANTA FLOTACION PLANTA CONCENTRACION',
    'ESPESADORES PLANTA CONCENTRACION',
    'PLANTA DE FILTROS PLANTA CONCENTRACION',
    'TALLER PLANTA CONCENTRACION',
    'PLANTA MOLIBDENO',
    'PLANTA DE CAL',
    'ALMACENAMIENTO SUMINISTROS PLANTA CONCENTRACION',
    'OFICINA Y ADMINISTRACION PLANTA CONCENTRACION',
    'BODEGA PLANTA CONCENTRACION',
    'CASINO PLANTA CONCENTRACION',
    'POLICLINICO PLANTA CONCENTRACION',
    'SALA DE CONTROL PLANTA CONCENTRACION',
    'LABORATORIO PLANTA CONCENTRACION',
  ].map((label) => candidate(label, 'point', 'CLASIFICACIÓN PLANTAS DE CONCENTRACIÓN', 'PLANTA CONCENTRACION')),

  candidate('PLANTA RECUPERACION MAGNETICA', 'polygon', 'CLASIFICACIÓN PLANTA RECUPERACIÓN MAGNÉTICA'),
  ...[
    'CHANCADO PLANTA RECUPERACIÓN MAGNETICA',
    'PLANTA MOLIENDA PLANTA RECUPERACIÓN MAGNETICA',
    'PLANTA FLOTACION PLANTA RECUPERACION MAGNETICA',
    'CONCENTRACION MAGNETICA SECO',
  ].map((label) => candidate(label, 'point', 'CLASIFICACIÓN PLANTA RECUPERACIÓN MAGNÉTICA', 'PLANTA RECUPERACION MAGNETICA')),

  candidate('PUERTO DE EMBARQUE MINERO', 'point', 'CLASIFICACIÓN PUERTO EMBARQUE MINERO'),
  ...[
    'OFICINA Y ADMINISTRACION PUERTO EMBARQUE MINERO',
    'BODEGA PUERTO EMBARQUE MINERO',
    'CASINO PUERTO EMBARQUE MINERO',
    'POLICLINICO PUERTO EMBARQUE MINERO',
  ].map((label) => candidate(label, 'point', 'CLASIFICACIÓN PUERTO EMBARQUE MINERO', 'PUERTO DE EMBARQUE MINERO')),

  ...[
    'RELLENO SANITARIO',
    'PLANTA TRATAMIENTO AGUA POTABLE',
    'PLANTA TRATAMIENTO AGUA SERVIDAS',
    'PLANTA DE REFINACION ELECTROLITICA',
  ].map((label) => candidate(label, 'point', 'CLASIFICACIÓN DE INSTALACIONES ASOCIADAS A LA FAENA')),

  candidate('LAVADERO', 'point', 'CLASIFICACIÓN LAVADEROS'),
];

export const RES_0886_STAGE3_POLICY = {
  authority: 'reference_only',
  extractionAuthority: 'official_sernageomin_index_text_only',
  pageAnchorAvailable: false,
  mayPromoteToApprovedReference: false,
  humanReviewRequired: true,
  regulatoryCodeMayBeInvented: false,
  sourceMayBeTreatedAsExhaustive: false,
  operationalMutationExecuted: false,
} as const;
