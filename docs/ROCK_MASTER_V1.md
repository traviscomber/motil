# MOTIL Rock Master v1 — 360 asset-first

Estado: candidato en revisión visual, no aprobado para producción.

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
- No habilitar `NEXT_PUBLIC_MOTIL_HERO_3D=enabled` hasta pasar captura de escritorio y móvil, consola y QA visual.

## Fuera de alcance

Sin cambios de Supabase, flujos operacionales, autenticación ni datos reales de MOTIL.
