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
    keywords: ['weichai 165 kva', 'weichai 165', 'generador weichai 165'],
    image: 'https://ac-landing-pages-user-uploads-production.s3.amazonaws.com/0000058194/ac725f72-4cac-42e4-a0c0-4e973ad6843a.png',
    sourceUrl: 'https://www.weichaichile.cl/generador-wpg165l9/',
    sourceDomain: 'weichaichile.cl',
    note: 'Referencia visual oficial Weichai WPG165L9 de 165 kVA; validar versión exacta del activo.',
  },
  {
    keywords: ['atlas copco st-1030', 'atlas copco st1030', 'scoop atlas copco st-1030', 'scoop atlas copco st1030'],
    image: 'https://tj.imgix.net/acces-industriel/mining-equipments/SCOOPTRAM-LOADER-CHARGEUSE-NAVETTE-ATLAS-COPCO-EPIROC-ST1013-EM356-2.jpg?auto=compress%2Cformat&q=75&v=1732243554&w=1280',
    sourceUrl: 'https://www.acces-s.ca/en/mining/equipment-for-sale-and-rental/atlas-copco-epiroc-st-1030-scooptram-loader-3',
    sourceDomain: 'acces-s.ca',
    note: 'Referencia visual del modelo Atlas Copco ST1030; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['diamec 232', 'diamec 232-2008', 'diamec 232-2012'],
    image: 'https://geotechpedia.com/Images/Equipment/DIAMEC_232-1.jpg',
    sourceUrl: 'https://geotechpedia.com/Equipment/Show/57/Diamec-232--Underground-core-drilling-rig-for-narrow-spaces',
    sourceDomain: 'geotechpedia.com',
    note: 'Referencia visual del modelo Diamec 232; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['chevrolet nkr 613', 'camion chevrolet nkr 613', 'camión chevrolet nkr 613'],
    image: 'https://chileautos.pxcrush.net/cars/dealer/835p6z211m6s7ug9a462079j4.jpg?pxc_format=auto&pxc_height=600&pxc_method=crop&pxc_width=900',
    sourceUrl: 'https://www.chileautos.cl/vehiculos/detalles/2011-chevrolet-nkr-613/CP-AD-8424573/',
    sourceDomain: 'chileautos.cl',
    note: 'Referencia visual Chevrolet NKR 613 en Chile; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['foton auman', 'fotón aumán', 'camion foton auman', 'camión fotón aumán'],
    image: 'https://www.newtrac.cl/wp-content/uploads/2025/11/IMG_3064.jpg',
    sourceUrl: 'https://www.newtrac.cl/productos/tractocamion-foton-2019-auman-2544-6x2-aut-ref-lt76-buin/?id=25417&idCategoria=299',
    sourceDomain: 'newtrac.cl',
    note: 'Referencia visual de camión Foton Auman en Chile; carrocería y configuración pueden variar.',
  },
  {
    keywords: ['mercedes benz aljibe', 'camion mercedes benz aljibe', 'camión mercedes benz aljibe'],
    image: 'https://chileautos.pxcrush.net/cars/dealer/76i8suc4eb2pkbfdpunzza1w1.jpg?height=725&pxc_bgtype=self&pxc_method=fitfill&width=1087',
    sourceUrl: 'https://www.chileautos.cl/vehiculos/mercedes-benz/actros-3336/',
    sourceDomain: 'chileautos.cl',
    note: 'Referencia visual de camión aljibe Mercedes-Benz en Chile; validar modelo exacto del activo.',
  },
  {
    keywords: ['atlas copco xams', 'compresor portatil atlas copco xams', 'compresor portátil atlas copco xams'],
    image: 'https://image.made-in-china.com/2f0j00bqdcNgPlQwok/Atlas-Copco-Diesel-Engine-portable-air-compressor-XAMS850.webp',
    sourceUrl: 'https://bestrand-compressor.en.made-in-china.com/product/WJiUORqCLshe/China-Atlas-Copco-Diesel-Engine-portable-air-compressor-XAMS850.html',
    sourceDomain: 'made-in-china.com',
    note: 'Referencia visual de la familia Atlas Copco XAMS; validar variante exacta del activo.',
  },
  {
    keywords: ['cat 938-g', 'cat 938g', 'cargador frontal cat 938-g'],
    image: 'https://espacios.nyc3.cdn.digitaloceanspaces.com/maquinaria24/machinery-rents/June2025/pdMHGkKfmKZpoKuw5YwZ.jpeg',
    sourceUrl: 'https://maquinaria24.com/es/machinery_rents/1999-caterpillar-938g-4444',
    sourceDomain: 'maquinaria24.com',
    note: 'Referencia visual del modelo Caterpillar 938G; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['ghh mk-a20', 'dumper ghh, modelo mk-a20', 'mk-a20'],
    image: 'https://www.tasimacilar.com/d/other/2024/05/07/1715003791-ghh-mk-a20-4.jpg',
    sourceUrl: 'https://ghhmm.co.za/mk-a20/',
    sourceDomain: 'ghhmm.co.za',
    note: 'Referencia visual del modelo GHH MK-A20; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['jcb 533-105t', 'jcb 533-105', 'manipulador jcb 533-105t'],
    image: 'https://d1ssu070pg2v9i.cloudfront.net/pex/morrisleslie/2025/09/09140312/MLP18675-4.jpeg',
    sourceUrl: 'https://www.morrisleslie.com/product/2023-jcb-533-105/',
    sourceDomain: 'morrisleslie.com',
    note: 'Referencia visual del modelo JCB 533-105; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['boomer 281', 'atlas copco, boomer 281', 'atlas copco boomer 281'],
    image: 'https://d9z1tpn605xsl.cloudfront.net/uploads/gallery/image/25273280/2004_Atlas_Copco_RB_281_pic_1_new.jpg',
    sourceUrl: 'https://www.plantandequipment.com/equipment-items/2004-atlas-copco-boomer-281',
    sourceDomain: 'plantandequipment.com',
    note: 'Referencia visual del modelo Atlas Copco Boomer 281; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['simba h-1253', 'simba h1253', 'atlas copco, simba h-1253'],
    image: 'https://techinfo.epiroc.com/storage/simba_1253_470_%401x?fb=missing_image_470_%401x',
    sourceUrl: 'https://techinfo.epiroc.com/en-us/information/30955174923-g',
    sourceDomain: 'epiroc.com',
    note: 'Referencia visual de la familia Simba 1253; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['generador toyama 6,5 kva', 'toyama 6,5 kva', 'toyama 6.5 kva'],
    image: 'https://solucionesdinamicassdi.com/4032/planta-electrica-toyama-gasolina-tg6500cxr-bivolt-65kva-monofasica-avr-arranque-manual.jpg',
    sourceUrl: 'https://solucionesdinamicassdi.com/es/generadores-a-gasolina/666-planta-electrica-toyama-gasolina-tg6500cxr-bivolt-65kva-monofasica-avr-arranque-manual.html',
    sourceDomain: 'solucionesdinamicassdi.com',
    note: 'Referencia visual Toyama TG6500CXR 6,5 kVA; validar variante exacta del activo.',
  },
  {
    keywords: ['mitsubishi canter', 'camion mitsubishi canter', 'camión mitsubishi canter'],
    image: 'https://macotattersall.cl/images/usados/mitsubishi/DRRT72/1.jpg',
    sourceUrl: 'https://macotattersall.cl/usados?idus=137-mitsubishi-fuso-canter',
    sourceDomain: 'macotattersall.cl',
    note: 'Referencia visual Mitsubishi Fuso Canter en Chile; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['wilson 500 kva', 'generador wilson 500', 'fg wilson 500'],
    image: 'https://www.nairaland.com/attachments/19285394_xp550119fgw500kvadieselgen1copy_jpeg9cd20caced48c8fcb6d7028320bfcdb8',
    sourceUrl: 'https://www.fgwilson.com/es_ES/products/new/fg-wilson/diesel-generators/medium-range-225-938-kva/1000012492.html',
    sourceDomain: 'fgwilson.com',
    note: 'Referencia visual de generador FG Wilson P500 de 500 kVA; validar configuración exacta del activo.',
  },
  {
    keywords: ['simba s7d', 'atlas copco simba s7d'],
    image: 'https://rgamp.com/wp-content/uploads/2023/04/referencia-s7d-1.jpg',
    sourceUrl: 'https://rgamp.com/en/equipment/simba-s7d/',
    sourceDomain: 'rgamp.com',
    note: 'Referencia visual del modelo Simba S7D; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['ford f-150 2025', 'ford f150 2025'],
    image: 'https://carimages.d2cmedia.ca/newcarimages/fr/cb69bb1e0e26462/Ford/F-150/2025/1200/464168-UExBVElORQ/white/front45.png',
    sourceUrl: 'https://www.fordthetford.com/modeles/Ford-F_150.html',
    sourceDomain: 'fordthetford.com',
    note: 'Referencia visual Ford F-150 2025; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['kia frontier 2023', 'kia frontier'],
    image: 'https://img.linemedia.com/img/s/flatbed-truck-3-5t/KIA/Frontier-2-5---1669206114719474609_big--22112314213896082700.jpg',
    sourceUrl: 'https://autoline.info/-/sale/flatbed-trucks-3-5t/KIA/Frontier-2-5--22112314213896082700',
    sourceDomain: 'autoline.info',
    note: 'Referencia visual de Kia Frontier; validar configuración exacta del activo.',
  },
  {
    keywords: ['nissan terrano 2013', 'nissan terrano'],
    image: 'https://chileautos.pxcrush.net/chileautos/cars/private/exhqjb1s0ypanw8rrnrso8yl3.jpg?height=725&pxc_bgtype=self&pxc_method=fitfill&width=1087',
    sourceUrl: 'https://www.chileautos.cl/vehiculos/nissan/terrano/',
    sourceDomain: 'chileautos.cl',
    note: 'Referencia visual Nissan Terrano; validar año y configuración exacta del activo.',
  },
  {
    keywords: ['volkswagen amarok 2024', 'amarok 2024'],
    image: 'https://http2.mlstatic.com/D_749783-MLA78505821184_082024-C.jpg',
    sourceUrl: 'https://www.volkswagen.cl/es/modelos/amarok.html',
    sourceDomain: 'volkswagen.cl',
    note: 'Referencia visual Volkswagen Amarok 2024; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['toyota new hilux 2016'],
    image: 'https://chileautos.pxcrush.net/chileautos/cars/private/631fmg20y17rw5kvjdbtocgga.jpg?pxc_method=fit&pxc_size=560%2C750',
    sourceUrl: 'https://www.chileautos.cl/vehiculos/toyota/hilux/2016/',
    sourceDomain: 'chileautos.cl',
    note: 'Referencia visual Toyota Hilux 2016; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['toyota new hilux 2021', 'toyota new hilux 2022'],
    image: 'https://chileautos.pxcrush.net/cars/dealer/ey00098w9q51e9qdk22ur36u8.jpg?height=725&pxc_bgtype=self&pxc_method=fitfill&width=1087',
    sourceUrl: 'https://www.chileautos.cl/vehiculos/toyota/hilux/',
    sourceDomain: 'chileautos.cl',
    note: 'Referencia visual Toyota Hilux de la generación 2021-2022; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['toyota new hilux 2023', 'toyota new hilux 2024', 'toyota new hilux 2025'],
    image: 'https://s3-sitioweb.s3.amazonaws.com/content/uploads/2024/01/21154712/A-13-2.jpg',
    sourceUrl: 'https://toyota.cl/modelos/pickup/hilux/',
    sourceDomain: 'toyota.cl',
    note: 'Referencia visual oficial Toyota Hilux de la generación vigente; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['atlas copco v-900', 'atlas copco v900', 'compresor atlas copco v-900'],
    image: 'https://image.made-in-china.com/203f0j00OGQeoAWEZtbw/Atlas-V900-Copco-Diesel-Portable-Screw-Air-Compressor-for-Mining-Quarry-High-Pressure-25bar-360psi-800-Cfm-950cfm-Atlascopco.webp',
    sourceUrl: 'https://www.atlascopco.com/es-cl/construction-equipment/campaigns-energy/compresor-atlas-copco-v900',
    sourceDomain: 'atlascopco.com',
    note: 'Referencia visual del Atlas Copco V900; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['atlas copco xas-97', 'atlas copco xas 97', 'xas-97'],
    image: 'https://www.truck1.co.in/img/xxl/2684/Atlas-Copco-XAS-97-DD-Belgium_2684_8538735924094.jpg',
    sourceUrl: 'https://www.truck1.co.in/construction-machinery/air-compressors/atlas-copco-xas-97-dd-a7968032.html',
    sourceDomain: 'truck1.co.in',
    note: 'Referencia visual del Atlas Copco XAS 97; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['doosan p-600', 'doosan p600', 'compresor doosan p-600'],
    image: 'https://static-data2.manualslib.com/product-images/037/2335314/doosan-p600wjd-t3-air-compressor.jpg',
    sourceUrl: 'https://www.manualslib.com/manual/2335314/Doosan-P600wjd-T3.html',
    sourceDomain: 'manualslib.com',
    note: 'Referencia visual del Doosan P600; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['doosan xp-825', 'doosan xp825', 'xp-825'],
    image: 'https://swiftequipment.com/Images/Air_Compressor/101187/FullSizeR3.large.jpg',
    sourceUrl: 'https://swiftequipment.com/low-hours-doosan-xp825wcu-t3-diesel-air-compressor-p-101187.html',
    sourceDomain: 'swiftequipment.com',
    note: 'Referencia visual del Doosan XP825; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['cargador frontal cat 938 (', 'cat 938 ('],
    image: 'https://media.sandhills.com/img.axd?c=True&checksum=o9Ho91Uvqt5zceYZ4i9g9SdCV%2BgxtdGJGMmiPgbb3v0%3D&ext=&h=460&id=9072143995&lp=&p=&rt=0&rwl=False&sz=Max&t=&w=614&wid=4326182721&wt=False',
    sourceUrl: 'https://www.cat.com/es_ES/products/new/equipment/wheel-loaders/small-wheel-loaders/123480.html',
    sourceDomain: 'cat.com',
    note: 'Referencia visual de Caterpillar 938; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['atlas copco qas 500', 'atlas qas 500', 'qas 500 vd'],
    image: 'https://5lrorwxhmjmnrik.leadongcdn.com/cloud/ijBqjKnpRiiSpkolmliq/Silent-Generator-200KVA-625KVA-460-460.jpg',
    sourceUrl: 'https://www.atlascopco.com/es-cl/construction-equipment/products/power-diesel-generators/mobile-row/qas',
    sourceDomain: 'atlascopco.com',
    note: 'Referencia visual del Atlas Copco QAS 500; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['atlas qas 325', 'atlas copco qas 325', 'qas 325 kva'],
    image: 'https://www.smtsweden.com/wp-content/uploads/2019/06/17041_19.jpg',
    sourceUrl: 'https://www.atlascopco.com/es-cl/construction-equipment/products/power-diesel-generators/mobile-row/qas',
    sourceDomain: 'atlascopco.com',
    note: 'Referencia visual del Atlas Copco QAS 325; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['cummins 500 kva', 'generador cummins 500'],
    image: 'https://agrotorg.net/imgs/board/68/580268-10.jpg',
    sourceUrl: 'https://agrotorg.net/ru/board/m-580268/cummins-c500-d5q-500-kva-400-kw-2025-rik/',
    sourceDomain: 'agrotorg.net',
    note: 'Referencia visual de generador Cummins C500 de 500 kVA; validar versión exacta del activo.',
  },
  {
    keywords: ['cat 950 gc', 'caterpillar 950 gc', 'cargador frontal cat 950 gc'],
    image: 'https://s7d2.scene7.com/is/image/Caterpillar/C844066',
    sourceUrl: 'https://www.cat.com/en_US/products/new/equipment/wheel-loaders/medium-wheel-loaders/1000029532.html',
    sourceDomain: 'cat.com',
    note: 'Referencia visual del modelo Caterpillar 950 GC; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['cat 928-g', 'cat 928g', 'caterpillar 928g', 'cargador frontal cat 928-g'],
    image: 'https://www.bossmachinery.nl/data/images/vehicles/01_Caterpillar_928G_928G_04.JPG',
    sourceUrl: 'https://www.bossmachinery.nl/nl/machines/Wiellader/1623/caterpillar928g',
    sourceDomain: 'bossmachinery.nl',
    note: 'Referencia visual del modelo Caterpillar 928G; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['cat 938-h', 'cat 938h', 'caterpillar 938h', 'cargador frontal cat 938-h'],
    image: 'https://www.bossmachinery.nl/data/images/vehicles/01_Caterpillar%20938H%20BM6546_38.jpg',
    sourceUrl: 'https://www.bossmachinery.nl/nl/machines/Wiellader/4858/caterpillar938h',
    sourceDomain: 'bossmachinery.nl',
    note: 'Referencia visual del modelo Caterpillar 938H; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['cat 938-k', 'cat 938k', 'caterpillar 938k', 'cargador frontal cat 938-k'],
    image: 'https://images.sbito.it/api/v1/sbt-ads-images-pro/images/c6/c668e0cc-ba48-4199-8947-fe857098e6c8?rule=gallery-desktop-2x-auto',
    sourceUrl: 'https://parts.cat.com/es/catcorp/equipment/wheel-loader/938K-40',
    sourceDomain: 'cat.com',
    note: 'Referencia visual del modelo Caterpillar 938K; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['volvo l-120-f', 'volvo l120f', 'cargador frontal volvo l-120-f'],
    image: 'https://dawidgwozdz.com/uploads/maszyny/zdjecie/o/eb530dc330abaeffe429635ee6a0d4768351f1fd.jpeg',
    sourceUrl: 'https://dawidgwozdz.com/en/maszyna/volvo/l120f',
    sourceDomain: 'dawidgwozdz.com',
    note: 'Referencia visual del modelo Volvo L120F; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['atlas copco ga-132', 'atlas copco ga 132', 'ga-132'],
    image: 'https://product.hstatic.net/200000628497/product/may-nen-khi-g-series__2__3f2051caa21e443eb6a01f006759189e_master_b5079cc90eb641058d6af9afc040cafc_master.jpeg',
    sourceUrl: 'https://compressorpna.com/products/oil-lubricated-screw-compressor-g-vsd',
    sourceDomain: 'compressorpna.com',
    note: 'Referencia visual Atlas Copco G/GA 132; validar configuración exacta contra placa.',
  },
  {
    keywords: ['jcb 560-80', 'manipulador telescopico jcb 560-80'],
    image: 'https://specs.lectura.de/models/renamed/orig/teleskopen-starr-560-80-jcb%281%29.png',
    sourceUrl: 'https://www.jcb.cl/productos/manipuladores-telescopicos/manipulador-telescopico-560-80-jcb',
    sourceDomain: 'jcb.cl',
    note: 'Referencia visual del modelo JCB 560-80; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['jcb 531-70', 'manipulador jcb 531-70'],
    image: 'https://jabagri.co.uk/wp-content/uploads/2024/05/JCB-531-70-Turbo-Agricultural-Loadalls-3.jpg',
    sourceUrl: 'https://jabagri.co.uk/product/jcb-531-70-turbo-telehandler/',
    sourceDomain: 'jabagri.co.uk',
    note: 'Referencia visual del modelo JCB 531-70; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['manitou mt-732', 'manitou mt 732'],
    image: 'https://www.technikboerse.com/bilder/teleskoplader/manitou/mt-732/49015614/8914145/manitou-mt-732-8914145-10_800x600.jpg',
    sourceUrl: 'https://www.technikboerse.com/en/gebraucht/excavator-loader-17/manitou-754/mt-732-13163',
    sourceDomain: 'technikboerse.com',
    note: 'Referencia visual del modelo Manitou MT 732; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['cat 320-gx', 'cat 320 gx', 'excavadora cat 320-gx'],
    image: 'https://admin.phuthaicat.com.vn/uploads/320gx_7_35b909a416.jpg',
    sourceUrl: 'https://www.phuthaicat.com.vn/vi/products/cat-320-gx',
    sourceDomain: 'phuthaicat.com.vn',
    note: 'Referencia visual del modelo Caterpillar 320 GX; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['cat 320-d', 'cat 320d', 'excavadora cat 320-d'],
    image: 'https://www.truck1.fr/img/xxl/9295/CAT-319D-France_9295_8070852987739.jpg',
    sourceUrl: 'https://h-cpc.cat.com/cmms/v2?cid=406&f=product&gid=329&it=product&lid=es&nc=1&pid=13969861&sc=US',
    sourceDomain: 'cat.com',
    note: 'Referencia visual de Caterpillar 320D; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['cat 246-d3', 'cat 246d3', 'minicargador cat 246-d3'],
    image: 'https://media.sandhills.com/img.axd?c=True&checksum=PtV3%2BQtKF8QXsgHYfhCQEhzxESiohVaTigPr2hBiOAI%3D&ext=&h=460&id=10007600854&lp=&p=&rt=0&rwl=False&sz=Max&t=&w=614&wid=4326182721&wt=False',
    sourceUrl: 'https://www.machinerytrader.com/listing/for-sale/247755249/2023-caterpillar-246d3-wheel-skid-steers',
    sourceDomain: 'machinerytrader.com',
    note: 'Referencia visual del modelo Caterpillar 246D3; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['jcb 3cx', 'retroexcavadora jcb 3cx'],
    image: 'https://img.waimaoniu.net/3642/3642-202412101528415262.jpg',
    sourceUrl: 'https://www.tiger-machinery.net/product/used-jcb-3cx-backhoe-loader',
    sourceDomain: 'tiger-machinery.net',
    note: 'Referencia visual del modelo JCB 3CX; no acredita que sea la unidad física registrada.',
  },
  {
    keywords: ['boomer s1d', 'atlas copco boomer s1d', 'epiroc boomer s1d'],
    image: 'https://img.directindustry.es/images_di/photo-g/59040-15374087.jpg',
    sourceUrl: 'https://www.directindustry.es/prod/epiroc/product-59040-1053613.html',
    sourceDomain: 'directindustry.es',
    note: 'Referencia visual del modelo Boomer S1D; no acredita que sea la unidad física registrada.',
  },

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
