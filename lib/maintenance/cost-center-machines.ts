import { getCostCenterRootCode, isActiveCostCenterStatus, repairCostCenterText } from '@/lib/cost-centers';

const MACHINE_KEYWORDS = [
  'hilux',
  'terrano',
  'ford cargo',
  'f-150',
  'mitsubishi',
  'chevrolet',
  'volkswagen',
  'auman',
  'foton',
  'foton auman',
  'amarok',
  'doosan',
  'p600',
  'p-600',
  'xp-825',
  'xp 825',
  'l200',
  'l120f',
  'fg wilson',
  'wilson',
  'tdb 150',
  'qas 275',
  'qas 500',
  'qas500',
  'qas 325',
  'qas325',
  'qas275',
  'sullair',
  'sullair 375',
  'sullair 185',
  '185',
  'xcmg',
  'xc928',
  'xc-928',
  'positron',
  'weichai',
  'cummins',
  'p275',
  'p500',
  'c500d5p',
  'wp4.1',
  'wp7',
  'frontier',
  'volvo',
  'cargador',
  'scoop',
  'dumper',
  'camion',
  'camioneta',
  'cargo',
  'compresor',
  'molino',
  'atlas copco',
  'cat ',
  'caterpillar',
  'bus',
  'bomba',
  'excavadora',
  'retroexcavadora',
  'sonda',
  'sondaje',
  'jumb',
  'simba',
  's7d',
  'h1253',
  'simba h1253',
  'simba h-1253',
  'boomer s1d',
  'boomer 281',
  '3cx',
  '531-70',
  '533-105',
  '455zx',
  '320d',
  '320 gx',
  '320gx',
  '928g',
  '938k',
  '950gc',
  'xas97',
  'xams',
  'diamec',
  'de-130',
  'de130',
  'mt-732',
  'mt 732',
  'onram',
  'mk-a20',
  'rl-852',
  'cs-533e',
  'cs533e',
  'generador',
  'electrogeno',
  'positron 63',
  'positron 150',
  'sct-204',
  'jcb 225',
  'minicargador jcb',
  'minicargador',
  'mini cargador',
  'horquilla',
  'forklift',
  'cpcd25',
  '15180',
  'trendy',
  'flo 2m25',
];

// Families that can produce operational machines or assets from the cost-center tree.
// We keep administrative roots out, but include the equipment-heavy families that were
// previously being skipped from the derived catalog.
const MACHINE_ROOT_CODES = new Set([
  '3',
  '4',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
  '20',
]);

const CANONICAL_FAMILIES: Record<string, string> = {
  '1': 'Mina Peumo',
  '2': 'Mina Don Jaime',
  '3': 'Exploracion',
  '4': 'Planta',
  '7': 'Proyectos en Ejecucion',
  '8': 'Camionetas',
  '9': 'Camiones',
  '10': 'Cargadores de Bajo Perfil',
  '11': 'Cargadores Frontales',
  '12': 'Camiones de Bajo Perfil',
};

export const REDISTRIBUTABLE_SOURCE_MAP: Record<
  string,
  {
    family: string;
    rootCode: string;
  }
> = {
  '1-11': { family: 'Compresores', rootCode: '14' },
  '1-13': { family: 'Equipos de Sondaje', rootCode: '16' },
  '2-11': { family: 'Compresores', rootCode: '14' },
  '2-13': { family: 'Equipos de Sondaje', rootCode: '16' },
  '3-3-1': { family: 'Excavadoras y Retroexcavadoras', rootCode: '19' },
  '3-6-1': { family: 'Cargadores de Bajo Perfil', rootCode: '10' },
  '3-6-2': { family: 'Compresores', rootCode: '14' },
  '3-6-3': { family: 'Compresores', rootCode: '14' },
  '3-7-1': { family: 'Equipos de Sondaje', rootCode: '16' },
  '3-7-2': { family: 'Grupos Generadores', rootCode: '13' },
  '3-7-3': { family: 'Minicargadores', rootCode: '18' },
  '3-7-5': { family: 'Compresores', rootCode: '14' },
  '3-9-1': { family: 'Compresores', rootCode: '14' },
  '3-9-2': { family: 'Cargadores de Bajo Perfil', rootCode: '10' },
  '3-9-3': { family: 'Cargadores Frontales', rootCode: '11' },
  '3-10-1': { family: 'Equipos de Sondaje', rootCode: '16' },
  '3-10-2': { family: 'Grupos Generadores', rootCode: '13' },
};

export function getRedistributableMachineAssignment(code: string) {
  return REDISTRIBUTABLE_SOURCE_MAP[String(code || '').trim()] || null;
}

function normalize(value: string) {
  return repairCostCenterText(value).toLowerCase();
}

function toTitleCase(value: string) {
  return String(value || '')
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      if (/^[A-Z0-9]{2,}$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function looksLikeMachine(name: string) {
  const normalized = normalize(name);
  return MACHINE_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function canonicalFamilyLabel(rootCode: string, rawName: string) {
  const family = CANONICAL_FAMILIES[rootCode] || repairCostCenterText(rawName || rootCode);
  return toTitleCase(family.replace(/\s+/g, ' ').trim());
}

export function inferMachineFamilyFromText(value: string) {
  const normalized = normalize(value);
  if (!normalized) return null;

  const matches: Array<[string, string]> = [
    ['camionetas', 'Camionetas'],
    ['camion', 'Camiones'],
    ['scoop', 'Cargadores de Bajo Perfil'],
    ['cargador frontal', 'Cargadores Frontales'],
    ['cargador', 'Cargadores de Bajo Perfil'],
    ['dumper', 'Camiones de Bajo Perfil'],
    ['compresor', 'Compresores'],
    ['doosan', 'Compresores'],
    ['p600', 'Compresores'],
    ['p-600', 'Compresores'],
    ['sondaje', 'Equipos de sondaje'],
    ['sonda', 'Equipos de sondaje'],
    ['perforacion', 'Equipos de perforacion'],
    ['excavadora', 'Excavadoras y Retroexcavadoras'],
    ['retroexcavadora', 'Excavadoras y Retroexcavadoras'],
    ['amarok', 'Camionetas'],
    ['auman', 'Camiones'],
    ['foton auman', 'Camiones'],
    ['l200', 'Camionetas'],
    ['terrano', 'Camionetas'],
    ['l120f', 'Cargadores Frontales'],
    ['wilson', 'Grupos Generadores'],
    ['qas 275', 'Grupos Generadores'],
    ['qas 500', 'Grupos Generadores'],
    ['qas 325', 'Grupos Generadores'],
    ['positron', 'Grupos Generadores'],
    ['weichai', 'Grupos Generadores'],
    ['cummins', 'Grupos Generadores'],
    ['sullair', 'Compresores'],
    ['sullair 375', 'Compresores'],
    ['sullair 185', 'Compresores'],
    ['p275', 'Grupos Generadores'],
    ['p500', 'Grupos Generadores'],
    ['c500d5p', 'Grupos Generadores'],
    ['wp4.1', 'Grupos Generadores'],
    ['wp7', 'Grupos Generadores'],
    ['xcmg', 'Cargadores Frontales'],
    ['xc928', 'Cargadores Frontales'],
    ['xc-928', 'Cargadores Frontales'],
    ['planta', 'Planta'],
    ['exploracion', 'Exploracion'],
    ['proyectos', 'Proyectos en Ejecucion'],
    ['generador', 'Grupos Generadores'],
    ['electrogeno', 'Grupos Generadores'],
    ['simba', 'Equipos de perforacion'],
    ['s7d', 'Equipos de perforacion'],
    ['h1253', 'Equipos de perforacion'],
    ['simba h1253', 'Equipos de perforacion'],
    ['boomer s1d', 'Equipos de perforacion'],
    ['boomer 281', 'Equipos de perforacion'],
    ['3cx', 'Excavadoras y Retroexcavadoras'],
    ['531-70', 'Manipuladores Telescopicos'],
    ['533-105', 'Manipuladores Telescopicos'],
    ['455zx', 'Cargadores Frontales'],
    ['320d', 'Excavadoras y Retroexcavadoras'],
    ['320 gx', 'Excavadoras y Retroexcavadoras'],
    ['320gx', 'Excavadoras y Retroexcavadoras'],
    ['928g', 'Cargadores Frontales'],
    ['938k', 'Cargadores Frontales'],
    ['950gc', 'Cargadores Frontales'],
    ['xas97', 'Compresores'],
    ['xams', 'Compresores'],
    ['xp-825', 'Compresores'],
    ['xp 825', 'Compresores'],
    ['diamec', 'Equipos de sondaje'],
    ['de-130', 'Equipos de sondaje'],
    ['de130', 'Equipos de sondaje'],
    ['mt-732', 'Manipuladores Telescopicos'],
    ['mt 732', 'Manipuladores Telescopicos'],
    ['onram', 'Equipos de sondaje'],
    ['mk-a20', 'Camiones de Bajo Perfil'],
    ['rl-852', 'Otros Equipos'],
    ['cs-533e', 'Excavadoras y Retroexcavadoras'],
    ['cs533e', 'Excavadoras y Retroexcavadoras'],
    ['cargo', 'Camiones'],
    ['15180', 'Camiones'],
    ['positron 63', 'Grupos Generadores'],
    ['positron 150', 'Grupos Generadores'],
    ['tdb 150', 'Grupos Generadores'],
    ['sct-204', 'Compresores'],
    ['jcb 225', 'Minicargadores'],
    ['minicargador jcb', 'Minicargadores'],
    ['minicargador', 'Minicargadores'],
    ['mini cargador', 'Minicargadores'],
    ['trendy', 'Buses'],
    ['volkswagen trendy', 'Buses'],
    ['flo 2m25', 'Otros Equipos'],
    ['horquilla', 'Otros Equipos'],
    ['forklift', 'Otros Equipos'],
    ['cpcd25', 'Otros Equipos'],
    ['bomba', 'Bombas'],
    ['ventilador', 'Ventiladores'],
    ['manipulador telescopico', 'Manipuladores Telescopicos'],
    ['560-80', 'Manipuladores Telescopicos'],
    ['hilux', 'Camionetas'],
    ['toyota hilux', 'Camionetas'],
    ['ford transit', 'Buses'],
    ['transit', 'Buses'],
    ['rodillo', 'Compactadores'],
    ['compactadora', 'Compactadores'],
  ];

  for (const [needle, label] of matches) {
    if (normalized.includes(needle)) return label;
  }

  return null;
}

export type DerivedCostCenterMachine = {
  id: string;
  code: string;
  name: string;
  family: string;
  rootCode: string;
  status: string;
  source: 'cost_center';
  description?: string | null;
};

export function deriveMachinesFromCostCenters(costCenters: Array<{ id: string; code: string; name: string; description?: string | null; status?: string | null }>) {
  const centers = costCenters
    .filter((center) => isActiveCostCenterStatus(center.status))
    .filter((center) => {
      const code = String(center.code || '');
      if (REDISTRIBUTABLE_SOURCE_MAP[code]) return true;

      const name = repairCostCenterText(center.name || '');
      const rootCode = getCostCenterRootCode(code);

      return (
        code.includes('-') &&
        !/^0?[1-7]$/.test(rootCode) &&
        (looksLikeMachine(name) || MACHINE_ROOT_CODES.has(rootCode))
      );
    });

  const rootNames = new Map<string, string>();
  for (const center of costCenters) {
    const rootCode = getCostCenterRootCode(center.code);
    if (!rootNames.has(rootCode) && !String(center.code || '').includes('-')) {
      rootNames.set(rootCode, canonicalFamilyLabel(rootCode, center.name || rootCode));
    }
  }

  const machines: DerivedCostCenterMachine[] = centers.map((center) => {
    const sourceCode = String(center.code || '');
    const explicit = REDISTRIBUTABLE_SOURCE_MAP[sourceCode];
    const rootCode = explicit?.rootCode || getCostCenterRootCode(center.code);
    const family =
      explicit?.family ||
      rootNames.get(rootCode) ||
      canonicalFamilyLabel(rootCode, rootCode);
    return {
      id: center.id,
      code: sourceCode,
      name: repairCostCenterText(center.name || ''),
      family,
      rootCode,
      status: String(center.status || 'active'),
      source: 'cost_center',
      description: center.description || null,
    };
  });

  return machines.sort((a, b) => {
    const familyCompare = a.family.localeCompare(b.family, 'es', { sensitivity: 'base' });
    if (familyCompare !== 0) return familyCompare;
    return a.code.localeCompare(b.code, 'es', { numeric: true, sensitivity: 'base' });
  });
}
