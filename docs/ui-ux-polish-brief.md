# ratemyidea.ai — UI/UX Polish Brief
Última actualización: 2026-06-22
Estado: correcciones UI solicitadas implementadas en commit local `255b379`; pendiente push/deploy/smoke producción si Phil decide publicar.

## Objetivo de Phil

Pulir la app en general para que se sienta:

- simple;
- útil;
- ordenada;
- con buen gusto de UI/UX.

Esto reemplaza la lectura más estrecha de “pulir solo el último cambio en el análisis”. El foco no es abrir features nuevas, sino mejorar claridad, jerarquía, utilidad percibida y experiencia general.

## Restricción operativa

ratemyidea.ai sigue live/operativo y con desarrollo pausado. Antes de implementar cambios, CASE debe hacer triage y proponer una lista mínima de ajustes.

No construir features nuevas sin decisión explícita de Phil.

## Criterios de evaluación

### Simple

- ¿La primera pantalla explica rápido qué hace la app?
- ¿El usuario sabe qué escribir y qué obtendrá?
- ¿Hay demasiadas CTAs compitiendo?
- ¿El flujo post-análisis se siente directo o lleno de bloques?

### Útil

- ¿El análisis ayuda a decidir o solo describe?
- ¿Las recomendaciones son accionables?
- ¿El benchmark, Market Study y Pro aparecen en momentos lógicos?
- ¿El usuario entiende qué hacer después del score?

### Ordenada

- ¿La jerarquía visual del resultado es clara?
- ¿Score, resumen, fortalezas/debilidades, benchmark, share y upsell están en orden correcto?
- ¿Hay repetición de mensajes?
- ¿Mobile se siente limpio?

### Buen gusto UI/UX

- ¿La interfaz se ve confiable y sobria?
- ¿El espaciado, tipografía y colores se sienten consistentes?
- ¿El producto se diferencia de una página genérica de AI?
- ¿Se siente más como herramienta útil que como demo?

## Triage recomendado

1. Revisar home antes de evaluación.
2. Revisar formulario/input.
3. Revisar resultado básico completo.
4. Revisar score/share card.
5. Revisar benchmark básico y bloque Pro.
6. Revisar Market Study preview.
7. Revisar mobile.
8. Separar hallazgos en:
   - quick polish;
   - copy/jerarquía;
   - bug real;
   - cambio de producto;
   - no tocar ahora.

## Smoke test de Phil — correcciones UI

### 1. Sección de puntuación / compartir

- Regresar “mostrar idea” a toggle on/off con cuadro redondeado.
- Dejar un solo botón principal para compartir.
- Quitar botones separados de descargar y copiar.
- El botón de compartir debe abrir preview, igual que el botón inferior actual que muestra opciones.
- El botón no debe ser mucho más grande que el texto que contiene.

### 2. Botones generales

- Mejorar botones para que se sientan más clickeables.
- Agregar hover más claro.
- Mejorar proporción de esquinas redondeadas.
- Estandarizar botones en tamaño o relación altura/ancho.
- Buscar consistencia visual entre CTAs primarios, secundarios y botones pequeños.

### 3. Jerarquía tipográfica

- Revisar tamaños de letra contra la jerarquía existente.
- Evitar tamaños que compitan con títulos principales o que hagan secciones secundarias demasiado pesadas.

### 4. Benchmark Pro bloqueado

- La imagen borrosa actual no simula bien la verdadera sección Pro.
- La sección Pro real usa gráfica de barras con porcentaje importante en el costado superior.
- No necesita ser idéntica, pero sí debe comunicar mejor el valor del benchmark.
- En lugar de mostrar una imagen dentro de un cuadro, sería más lógico que todo el cuadro de la sección esté borroso/simulado, manteniendo visibles los textos de sección y el estado bloqueado.

## Output esperado del triage

Una lista priorizada de máximo 5–7 ajustes, cada uno con:

- problema observado;
- por qué importa;
- tipo: UI / UX / copy / prompt / bug / producto;
- esfuerzo: bajo / medio / alto;
- si requiere aprobación de Phil.
