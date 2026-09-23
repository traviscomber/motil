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
    keywords: ['liugong cpcd25a', 'liugong cpcd25', 'cpcd25a'],
    image: 'https://liugongrussia.ru/images/catalog/forklift/CPCD25/CPCD25_960x540x72_01.png',
    sourceUrl: 'https://www.liugong.com/en/product/cpcd25/index.html',
    sourceDomain: 'liugong.com',
    note: 'Referencia visual del modelo LiuGong CPCD25/CPCD25A; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['komatsu pc1250'],
    image: 'https://www.euronato.ru/content/images/newsi1/source/img_1735569896.jpg',
    sourceUrl: 'https://www.euronato.ru/about/news/v_nalichii_ekskavator_komatsu_pc1250_lizing_prodazha_arenda_ekskavator_pc-1250_iz_yaponii/',
    sourceDomain: 'euronato.ru',
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

  {
    keywords: ['volkswagen delivery', 'vw delivery'],
    image: 'https://i0.wp.com/minutomotor.com.ar/wp-content/uploads/2017/09/VolkswagenDelivery-02.jpg?resize=829%2C548&ssl=1',
    sourceUrl: 'https://www.camionesybusesvolkswagen.cl/camiones/delivery-9-180/',
    sourceDomain: 'camionesybusesvolkswagen.cl',
    note: 'Referencia visual de la familia Volkswagen Delivery; validar carrocería y versión exacta del activo.',
  },
  {
    keywords: ['atlas copco qas 275', 'qas 275'],
    image: 'https://mediacache4.ep.dk/v-638458977531834839/71/af/2382-32b1-4330-9717-502097bbe444/fs10013003_1.jpg',
    sourceUrl: 'https://www.ep.dk/maskiner/generatorer/atlas-copco-generatorer/fs10013003-atlas-copco-qas-275-generator',
    sourceDomain: 'ep.dk',
    note: 'Referencia visual del generador Atlas Copco QAS 275.',
  },
  {
    keywords: ['weichai 70 kva', 'weichai 70kva'],
    image: 'https://ac-landing-pages-user-uploads-production.s3.amazonaws.com/0000058194/b9fb77d2-41f0-4810-8b9a-f1662bb19613.png',
    sourceUrl: 'https://landing.weichaichile.cl/grupo_electrogeno',
    sourceDomain: 'weichaichile.cl',
    note: 'Referencia visual de grupo electrógeno Weichai PowerGen 70 kVA.',
  },
  {
    keywords: ['weichai 33 kva', 'weichai 33kva'],
    image: 'https://www.agsa.com/cdn/shop/files/Generador33kVAWeichai_grande.png?v=1753802337',
    sourceUrl: 'https://www.agsa.com/products/generador-de-energia-33kva-a-diesel',
    sourceDomain: 'agsa.com',
    note: 'Referencia visual de grupo electrógeno Weichai 33 kVA.',
  },
  {
    keywords: ['grindex matador'],
    image: 'https://dcdn-us.mitiendanube.com/stores/006/493/392/products/1-9_matador-9a846f292e63da739117664299426610-1024-1024.webp',
    sourceUrl: 'https://ziomipompe.cl/productos/bomba-sumergible-grindex-matador-n-6-25hp-mineria/',
    sourceDomain: 'ziomipompe.cl',
    note: 'Referencia visual Grindex Matador N 25 HP; validar placa antes de tratarla como unidad exacta.',
  },
  {
    keywords: ['bertolini ca 1029', 'bomba ca 1029', 'ca 1029'],
    image: 'https://cdn11.bigcommerce.com/s-c1nawcms42/images/stencil/1280x1280/products/199/875/AMAZON_CA1029_02__61684.1663780649.jpg?c=1',
    sourceUrl: 'https://www.canpump.com/bertolini-ca-1029-1015-psi-28-9-us-gpm-35-mm-shaft-hi-pressure-pump/',
    sourceDomain: 'canpump.com',
    note: 'Referencia visual del modelo Bertolini CA 1029; validar fabricante de la unidad instalada.',
  },
  {
    keywords: ['caterpillar 246d', 'cat 246d', 'minicargador 246d'],
    image: 'https://image.made-in-china.com/2f0j00hNlkFYbBroqG/Caterpillar-Cat-246D-Skid-Steer-Loader-Used-Small-Mini-Loader-Original-Good-Condition.jpg',
    sourceUrl: 'https://yuyimachinery.en.made-in-china.com/product/qTjRkdByMahM/China-Caterpillar-Cat-246D-Skid-Steer-Loader-Used-Small-Mini-Loader-Original-Good-Condition.html',
    sourceDomain: 'made-in-china.com',
    note: 'Referencia visual del minicargador Caterpillar 246D; no acredita que sea la unidad física.',
  },
  {
    keywords: ['espa vertical uv 8', 'espa vertical', 'bomba espa'],
    image: 'https://acdn.mitiendanube.com/stores/003/451/871/products/multi-1184e7e3acab0cab9217178702853158-640-0.jpg',
    sourceUrl: 'https://www.tecnicaser.mx/us/products/espa-multi45-vertical-multistage-pump-3-hp-220-440v-3stage/',
    sourceDomain: 'tecnicaser.mx',
    note: 'Referencia visual de bomba vertical multietapas ESPA; no corresponde necesariamente al modelo UV 8.',
  },
  {
    keywords: ['versamatic', 'versa-matic'],
    image: 'https://static.grainger.com/rp/s/is/image/Grainger/4GGF5_AS01',
    sourceUrl: 'https://www.grainger.com/product/VERSA-MATIC-Double-Diaphragm-Pump-Air-4GGF5',
    sourceDomain: 'grainger.com',
    note: 'Referencia visual de bomba neumática de doble diafragma Versa-Matic; validar tamaño y material.',
  },
  {
    keywords: ['grindex m 36', 'grindex 15hp', 'grindex 15 hp', 'bomba grindex'],
    image: 'https://schmidts.store/cdn/shop/files/b75f3030d71cf0ee9b7b1b7979d6c2f1.jpg?v=1752695071&width=875',
    sourceUrl: 'https://schmidts.store/collections/all',
    sourceDomain: 'schmidts.store',
    note: 'Referencia visual de familia de bombas sumergibles Grindex; validar modelo exacto.',
  },
];

const EQUIPMENT_IMAGE_MAP: { keywords: string[]; image: string; note: string; sourceUrl?: string; sourceDomain?: string }[] = [

  {
    keywords: ['grua horquilla nissan', 'nissan flo 2m25', 'forklift nissan'],
    image: 'https://p-c-s.co.jp/preowned/wp-content/uploads/2020/01/01-72.jpg',
    sourceUrl: 'https://p-c-s.co.jp/preowned/search/3585',
    sourceDomain: 'p-c-s.co.jp',
    note: 'Referencia visual de grúa horquilla Nissan de 2,5 toneladas; el modelo exacto debe validarse en placa.',
  },

  {
    keywords: ['cat cs-533e', 'compactadora cat cs-533e', 'compactadora cat, cs-533e'],
    image: 'https://commons.wikimedia.org/wiki/Special:FilePath/Caterpillar%20CS-533E.jpg',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Caterpillar_CS-533E.jpg',
    sourceDomain: 'commons.wikimedia.org',
    note: 'Referencia visual exacta del modelo Caterpillar CS-533E; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['paus rl 852', 'rl 852'],
    image: 'https://live.staticflickr.com/8319/8063867950_6d5b5bc47d.jpg',
    sourceUrl: 'https://www.flickr.com/photos/yc-amicellicollection/8063867950/',
    sourceDomain: 'flickr.com',
    note: 'Referencia visual del modelo PAUS RL 852 TSL Scaler; no acredita que sea la unidad física registrada.',
  },

  {
    keywords: ['saer centrifuga', 'bomba 950 saer', 'saer'],
    image: 'https://static-data2.manualslib.com/product-images/a21/1933312/saer-elettropompe-ir-water-pump.jpg',
    sourceUrl: 'https://www.manualslib.com/manual/1933312/Saer-Elettropompe-Ir.html?page=23',
    sourceDomain: 'manualslib.com',
    note: 'Referencia visual de bomba centrífuga SAER; el modelo exacto 950 debe validarse.',
  },
  {
    keywords: ['ziebtec pt-500', 'ventilador neumatico ziebtec', 'pt-500'],
    image: 'https://image.made-in-china.com/318f0j00FtjUErosbhcB/-mp4.webp',
    sourceUrl: 'https://ziebtec.cl/ventilador-neumatico/',
    sourceDomain: 'ziebtec.cl',
    note: 'Referencia visual de ventilador axial minero; la ficha del activo identifica Ziebtec PT-500.',
  },
  {
    keywords: ['rodillo doble tambor', 'rodillo compactador'],
    image: 'https://s.alicdn.com/%40sc04/kf/Hae6f73b07e6d42a0b5297975c5b51c6ai/High-Quality-5-Ton-Double-Drum-Road-Roller-Kubota-Engine-Vibration-Compactor-Machine-for-Asphalt-Construction-Include-Pump-Motor.jpg',
    sourceUrl: 'https://toolz.cl/tienda/herramientas-de-compactacion/rodillo-compactador-vibratorio-rr-1500rr-1500/',
    sourceDomain: 'toolz.cl',
    note: 'Referencia visual de rodillo doble tambor con motor Kubota.',
  },
  {
    keywords: ['ford transit', 'bus ford transit'],
    image: 'https://cdn.jdpower.com/Models/640x480/2023-Ford-TransitPassengerWagon-XL.jpg',
    sourceUrl: 'https://www.ford.mx/camiones/transit/pasajeros/2023/',
    sourceDomain: 'ford.mx',
    note: 'Referencia visual Ford Transit de pasajeros 2023.',
  },

  {
    keywords: ['bomba leader', 'leader 1029', 'leader 1022', 'leader 1025'],
    image: 'https://www.mwleidingsystemen.nl/resolve_product_image/600x600/product-images/centrifugaalpomp-inoxplus-230-3-waaiers-230v-800w/6324318d97c9f2871575d5798e9b51dd.png',
    note: 'Imagen referencial de familia Leader Pumps; el modelo exacto debe validarse en placa.',
  },
  {
    keywords: ['bomba sumergible lapiz', 'bomba sumergible'],
    image: 'https://img.directindustry.com/images_di/photo-g/113455-3985605.jpg',
    note: 'Imagen referencial de una bomba sumergible industrial; no representa marca o modelo confirmado.',
  },
  {
    keywords: ['ventilador 30 hp', 'ventilador 7,5 hp', 'ventilador 7.5 hp', 'ventilador minero'],
    image: 'https://img1.goepe.com/2025056/0_1748352261_1513.png',
    note: 'Imagen referencial de ventilador axial industrial/minero; potencia y configuración pueden variar.',
  },
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
        sourceUrl: entry.sourceUrl,
        sourceDomain: entry.sourceDomain,
        note: entry.note,
      };
    }
  }

  return null;
}

export function getEquipmentImage(text: string | null | undefined): string | null {
  return getEquipmentImageMeta(text)?.image || null;
}
