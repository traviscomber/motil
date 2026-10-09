# MOTIL Rock Master v1 — 360 asset-first

Estado: vista 360 aprobada visualmente por el responsable y habilitada por defecto en el hero. Publicación sujeta a QA y merge.

## Fuente única

- Archivo canónico servido: `public/motil-rock-master-v1.glb`.
- Procedencia: archivo original `motil-rock.glb`, SHA de blob Git `69edf88799bad1c9483f73e55cc6b31ba3a70d1f`, conservado en historial.
- Se suprimen las rutas duplicadas en la rama: `motil-rock.glb` y `public/motil-rock.glb`.
- El GLB suministra geometría, colores por vértice y parámetros PBR. El visor solo controla cámara, iluminación, escala y movimiento; no altera colores ni materiales.

## Verificación geométrica inicial del archivo original

- glTF 2.0, 649.156 bytes; un mesh, 4.500 triángulos no indexados y 13.500 vértices.
- Posiciones soldadas a 5 decimales: 2.252; 6.750 aristas, todas compartidas por exactamente dos caras.
- Cero triángulos degenerados, cero aristas abiertas y cero aristas no manifold.
- Normales distribuidas por los ocho octantes horizontales: 546, 586, 527, 588, 553, 575, 537 y 588 triángulos.
- Colores por vértice en el propio archivo; sin shaders que sinteticen vetas en el navegador.
- Estas pruebas son estructurales: no equivalen a aprobación estética o fidelidad fotográfica.

## QA visual

- Ruta solo para entornos preview: `/rock-master-360`.
- Ángulos directos: `?angle=0`, `?angle=90`, `?angle=180`, `?angle=270`.
- Arrastrar horizontalmente sobre el modelo permite una vuelta completa; soporta preferencia de movimiento reducido.
- Comparar cuatro siluetas, balance negro / cobre, continuidad de vetas, grosor, profundidad y encuadre.
- La landing usa el GLB por defecto y mantiene la imagen estática hasta renderizar el primer frame. Para rollback, configurar `NEXT_PUBLIC_MOTIL_HERO_3D=disabled` y redesplegar.
- Verificar capturas de escritorio y móvil, navegación, carga de GLB y consola antes de merge.

## Fuera de alcance

Sin cambios de Supabase, flujos operacionales, autenticación ni datos reales de MOTIL.

## Estudio visual: sulfuros de cobre — lab revision

- Estado: preview, sin merge a `main`.
- Nueva paleta directamente en `COLOR_0` del GLB, no un filtro CSS ni un shader.
- Inspiración geológica: bornita (cobre rojizo/anaranjado con pátina limitada), calcopirita (latón dorado) y calcosina oscura. El diseño es interpretativo, no un análisis mineralógico.
- Matriz oscura intacta, cobre naranja en facetas minerales ya coloreadas, latón disperso en manchas coherentes y poca pátina azulada.
- Material PBR final: `roughnessFactor = 0.42`, `metallicFactor = 0.88`. Evita reflejos blanco-espejo excesivos.
- No se toca la geometría, las normales, UVs, rotación, permisos ni datos operativos.
- Archivo anterior preservado en Git: `69edf88799bad1c9483f73e55cc6b31ba3a70d1f`. El archivo de producción sigue siendo único.
- Control estático en CI: glTF válido, malla cerrada, dark matrix y distribución de vértices naranja/cobre.
- Control visual pendiente: ángulos 0°, 90°, 180°, 270°; desktop y mobile en preview.
