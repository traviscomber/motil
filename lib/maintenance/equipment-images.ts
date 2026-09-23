export type EquipmentImageMatch = {
  image: string;
  match: 'model' | 'family';
  sourceUrl?: string;
  sourceDomain?: string;
  note: string;
};

const EXACT_EQUIPMENT_IMAGES: Array<{
  keywords: string[];
  image: string;
  sourceUrl: string;
  sourceDomain: string;
  note: string;
}> = [
  {
    keywords: ['komatsu pc1250'],
    image: 'https://www.euronato.ru/content/images/newsi1/source/img_1735569896.jpg',
    sourceUrl: 'https://www.komatsu.com/en-us/products/equipment/excavators/large-excavators/pc1250lc-11',
    sourceDomain: 'komatsu.com',
    note: 'Referencia visual del modelo Komatsu PC1250; no acredita que sea la unidad física instalada.',
  },
  {
    keywords: ['caterpillar cat c18', 'caterpillar c18', 'cat c18'],
    image: 'https://s7d2.scene7.com/is/image/Caterpillar/CM20200528-df18b-20ba8',
    sourceUrl: 'https://www.cat.com/es_ES/products/new/power-systems/electric-power/diesel-generator-sets/106720.html',
    sourceDomain: 'cat.com',
    note: 'Imagen de producto Caterpillar C18. La configuración exacta puede variar.',
  },
  {
    keywords: ['metso sag 40x22', 'metso sag'],
    image: 'https://www.metso.cn/globalassets/portfolio/premier-and-select-mills/premier_geardriven_front.png?height=800&quality=90&width=1200',
    sourceUrl: 'https://www.metso.com/portfolio/sag-mills/',
    sourceDomain: 'metso.com',
    note: 'Referencia visual de molino SAG Metso; no acredita la configuración física 40x22 instalada.',
  },
  {
    keywords: ['sandvik cvp-900', 'sandvik cvp 900'],
    image: 'https://www.rockprocessing.sandvik/siteassets/stories/hx900-wear-protection-engineered-to-last/hx-2-1080px.jpg',
    sourceUrl: 'https://www.rockprocessing.sandvik/en/stories/articles/2025/09/hx900-wear-protection-engineered-to-last/',
    sourceDomain: 'sandvik.com',
    note: 'Referencia visual de sistema transportador Sandvik; no se encontró fotografía pública verificable del CVP-900 exacto.',
  },
  {
    keywords: ['weir warman 12/10', 'warman 12/10'],
    image: 'https://static.wixstatic.com/media/7d27ef_c41f6e1bf02145829527f290b454409c~mv2.jpg/v1/fill/w_980,h_1470,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/7d27ef_c41f6e1bf02145829527f290b454409c~mv2.jpg',
    sourceUrl: 'https://www.machineryscene.com/product-page/warman-model-12-10-fah-pump',
    sourceDomain: 'machineryscene.com',
    note: 'Referencia 12/10 Warman de la misma familia y tamaño; requiere validación contra la placa del activo.',
  },
];

const EQUIPMENT_IMAGE_MAP: { keywords: string[]; image: string; note: string }[] = [
  {
    keywords: ['camioneta', 'pickup', 'hilux', 'ranger', 'l200', 'amarok', 'camionetas'],
    image: '/equipment/camioneta-4x4.png',
    note: 'Imagen referencial de familia de camionetas 4x4.',
  },
  {
    keywords: ['camion', 'camiones', 'camin', 'cargo', 'volvo', 'mercedes', 'scania', 'kenworth', 'freightliner', 'bajo perfil camion'],
    image: '/equipment/camion-minero.png',
    note: 'Imagen referencial de familia de camiones.',
  },
  {
    keywords: ['cargador bajo perfil', 'scoop', 'lhd', 'bajo perfil', 'loader underground'],
    image: '/equipment/cargador-bajo-perfil.png',
    note: 'Imagen referencial de cargador de bajo perfil.',
  },
  {
    keywords: ['cargador frontal', 'cargadores frontales', 'wheel loader', 'pala cargadora'],
    image: '/equipment/cargador-frontal.png',
    note: 'Imagen referencial de cargador frontal.',
  },
  {
    keywords: ['compresor', 'compresores', 'air compressor', 'atlas copco xrvs'],
    image: '/equipment/compresor.png',
    note: 'Imagen referencial de familia de compresores.',
  },
  {
    keywords: ['generador', 'grupo generador', 'grupos generadores', 'grupos electrogenos', 'electrogeno', 'generator'],
    image: '/equipment/grupo-generador.png',
    note: 'Imagen referencial de grupo generador.',
  },
  {
    keywords: ['perforadora', 'perforacion', 'perforadoras', 'jumbo', 'drill', 'sondaje', 'sondajes'],
    image: '/equipment/perforadora.png',
    note: 'Imagen referencial de equipo de perforación.',
  },
  {
    keywords: ['excavadora', 'retroexcavadora', 'excavadoras', 'retroexcavadoras', 'backhoe'],
    image: '/equipment/excavadora.png',
    note: 'Imagen referencial de excavadora.',
  },
  {
    keywords: ['manipulador telescopico', 'manipuladores telescopicos', 'telehandler', 'manitou', 'telescopico'],
    image: '/equipment/manipulador-telescopico.png',
    note: 'Imagen referencial de manipulador telescópico.',
  },
  {
    keywords: ['minicargador', 'minicargadores', 'bobcat', 'skid steer', 'mini cargador'],
    image: '/equipment/minicargador.png',
    note: 'Imagen referencial de minicargador.',
  },
];

function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function getEquipmentImageMeta(text: string | null | undefined): EquipmentImageMatch | null {
  if (!text) return null;
  const normalized = normalize(text);

  for (const entry of EXACT_EQUIPMENT_IMAGES) {
    if (entry.keywords.some((kw) => normalized.includes(normalize(kw)))) {
      return {
        image: entry.image,
        match: 'model',
        sourceUrl: entry.sourceUrl,
        sourceDomain: entry.sourceDomain,
        note: entry.note,
      };
    }
  }

  for (const entry of EQUIPMENT_IMAGE_MAP) {
    if (entry.keywords.some((kw) => normalized.includes(normalize(kw)))) {
      return {
        image: entry.image,
        match: 'family',
        note: entry.note,
      };
    }
  }

  return null;
}

export function getEquipmentImage(text: string | null | undefined): string | null {
  return getEquipmentImageMeta(text)?.image || null;
}
