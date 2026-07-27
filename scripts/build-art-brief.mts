/**
 * Genera docs/PLIEGO-DE-ARTE.md a partir de la especificación real del rig.
 *
 * El pliego no se escribe a mano: se deriva de ArtBible, Skeleton y BodyShapes,
 * que son los mismos módulos que usa el motor. Así es imposible que el
 * documento y el juego se desincronicen, que es exactamente lo que produjo la
 * causa de raíz R-3.
 *
 *   npm run arte:pliego
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  CHARACTER_HEIGHT_M,
  HEADS_TALL,
  HERO_HEIGHT_M,
  KEY_LIGHT_AZIMUTH_DEG,
  KEY_LIGHT_ELEVATION_DEG,
  PIXELS_PER_METRE,
  RIM_LIGHT_AZIMUTH_DEG,
} from '../src/game/art/ArtBible';
import { CLOSED_PALETTE, RAMPS, toCss } from '../src/game/art/Palette';
import {
  AUTHORING_OUTLINE_PX,
  AUTHORING_PPM,
  JOINT_OVERLAP_M,
  MARGIN_M,
  PART_SPECS,
} from '../src/game/art/PartSpec';
import { ANKLE_HEIGHT_M } from '../src/game/art/Skeleton';

const px = (m: number): number => Math.round(m * AUTHORING_PPM);

const partRows = PART_SPECS.map((s) => {
  const child = s.childX === null ? '—' : `${s.childX}, ${s.childY}`;
  const bone = s.boneLengthM === null ? '—' : `${px(s.boneLengthM)} px`;
  return `| \`${s.id}.png\` | ${s.label} | ${s.canvasW} × ${s.canvasH} | ${s.pivotX}, ${s.pivotY} | ${child} | ${bone} |`;
}).join('\n');

const partNotes = PART_SPECS.map((s) => `### \`${s.id}.png\` — ${s.label}\n\n${s.notes}\n`).join(
  '\n',
);

const paletteRows = CLOSED_PALETTE.map((c) => `\`${toCss(c)}\``).join(' · ');

const rampRows = Object.entries(RAMPS)
  .map(
    ([name, r]) =>
      `| ${name} | \`${toCss(r.lit)}\` | \`${toCss(r.base)}\` | \`${toCss(r.shade)}\` |`,
  )
  .join('\n');

const doc = `# Pliego de arte — MOSTASA'S RAGE

**Documento generado.** No editar a mano: sale de \`src/game/art/\` con
\`npm run arte:pliego\`. Si un número de acá cambia, cambió en el motor.

---

## 1. Qué se encarga y por qué así

Se encarga el personaje **por piezas sueltas**, no como láminas de animación.

El motor ya tiene el esqueleto: mueve las piezas, las encadena y las anima. El
dibujante entrega ocho piezas y el juego produce con ellas reposo, caminata,
carrera, combo de tres golpes, golpe fuerte, salto, esquiva, daño, caída y
levantada — sin volver a pedir arte.

Esto no es una preferencia: es lo que garantiza que el personaje **no se
deforme entre cuadros**. Cuando cada cuadro es un dibujo independiente, el
cuerpo cambia de volumen al reproducirse en bucle y el juego se ve amateur. Con
piezas sobre un esqueleto eso es imposible por construcción.

El lado lejano del cuerpo **usa el mismo arte**, teñido un escalón más oscuro
por el motor. No hay que dibujar brazo izquierdo y brazo derecho.

---

## 2. Reglas que aplican a TODAS las piezas

| Regla | Valor |
| --- | --- |
| Formato | PNG con transparencia real (RGBA, 8 bits) |
| Resolución de autoría | ${AUTHORING_PPM} px por metro (el doble que el juego, que corre a ${PIXELS_PER_METRE}) |
| Orientación | El personaje mira a la **derecha**. El hueso apunta hacia **abajo**. |
| Pivote | La articulación **padre**, arriba. Coordenadas exactas en la tabla. |
| Contorno de tinta | ${AUTHORING_OUTLINE_PX} px, color \`${toCss(CLOSED_PALETTE[0]!)}\`, uniforme, cerrado |
| Aire al borde | ${px(MARGIN_M)} px. Ningún píxel opaco puede tocar el borde del lienzo. |
| Solape en articulaciones | ${px(JOINT_OVERLAP_M)} px más allá de la articulación, para que al doblarse no aparezca hueco |
| Sombreado | Planos planos de luz y sombra. **Sin degradados, sin desenfoque, sin texturas fotográficas.** |
| Paleta | Cerrada. Ver sección 4. No usar ningún color fuera de la lista. |

---

## 3. Proporciones

| Medida | Valor |
| --- | --- |
| Estatura de Mostasa | ${HERO_HEIGHT_M} m = ${px(HERO_HEIGHT_M)} px a resolución de autoría |
| Proporción | ${HEADS_TALL} cabezas |
| Altura de cabeza | ${(HERO_HEIGHT_M / HEADS_TALL).toFixed(3)} m = ${px(HERO_HEIGHT_M / HEADS_TALL)} px |
| Tobillo sobre el piso | ${ANKLE_HEIGHT_M} m = ${px(ANKLE_HEIGHT_M)} px |

Estaturas del resto del elenco, para cuando se encarguen los enemigos:

${Object.entries(CHARACTER_HEIGHT_M)
  .map(([role, h]) => `- **${role}**: ${h} m (${px(h)} px)`)
  .join('\n')}

Un enemigo común mide prácticamente lo mismo que el héroe, porque en la calle
la gente mide lo mismo. Nada de enemigos enanos.

---

## 4. Paleta cerrada

Buenos Aires de noche bajo alumbrado de vapor de sodio. Asfalto azulado, halo
naranja de la lámpara, neón de los carteles como contraluz.

${paletteRows}

Cada material tiene tres tonos: iluminado, base y en sombra. Usar exactamente
estos y no interpolar:

| Material | Luz | Base | Sombra |
| --- | --- | --- | --- |
${rampRows}

**Mostasa lleva campera mostaza.** Es el único amarillo saturado que usa un
personaje: sirve para que el jugador nunca lo pierda de vista en una pantalla
llena de enemigos. Los enemigos van en azules, grises y verdes desaturados.

---

## 5. Luz

Una sola dirección de luz para todo el juego. Ésta es la regla que impide que
personajes y fondos parezcan pegoteados de dos mundos distintos.

- **Llave** (cálida, de la lámpara de sodio): azimut ${KEY_LIGHT_AZIMUTH_DEG}°, elevación ${KEY_LIGHT_ELEVATION_DEG}°.
  En la práctica: **desde arriba y desde la izquierda de pantalla**.
- **Contraluz** (frío, del neón): azimut ${RIM_LIGHT_AZIMUTH_DEG}°, es decir **desde atrás y a la derecha**.
- El lado iluminado de cada pieza es el **izquierdo**. La sombra va a la derecha.

---

## 6. Las ocho piezas

| Archivo | Pieza | Lienzo (px) | Pivote (x, y) | Articulación hija (x, y) | Largo de hueso |
| --- | --- | --- | --- | --- | --- |
${partRows}

El **pivote** es el punto del lienzo donde el motor clava la pieza. La
**articulación hija** es donde tiene que caer el extremo del hueso: si el
antebrazo dice que la muñeca va en (x, y), ahí tiene que estar la muñeca
dibujada, o el brazo queda largo o corto.

${partNotes}

---

## 7. Cómo se verifica una entrega

\`\`\`
npm run arte:validar -- <carpeta>
\`\`\`

El validador rechaza automáticamente:

- lienzo de tamaño incorrecto
- PNG sin canal alfa
- píxeles opacos tocando el borde (falta el aire de ${px(MARGIN_M)} px)
- dibujo vacío o casi vacío
- colores fuera de la paleta cerrada

Nada entra al juego sin pasar esta verificación. Es la puerta que antes no
existía y que dejaba entrar arte que después había que parchear desde el
código.

---

## 8. Si el arte se genera con IA en vez de encargarse a un dibujante

Pedir **una pieza por vez**, nunca el personaje completo, y adjuntar esta
instrucción:

> Ilustración vectorial plana para videojuego, estilo de silueta fuerte con
> contorno de tinta uniforme, colores planos sin degradados, en la línea de
> Katana ZERO o Samurai Jack. Fondo transparente. La pieza es **[nombre de la
> pieza]** de un personaje masculino adulto de ${HERO_HEIGHT_M} m, proporción de
> ${HEADS_TALL} cabezas, con campera mostaza \`${toCss(RAMPS.mustard.base)}\` y
> pantalón azul \`${toCss(RAMPS.clothBlue.base)}\`. El personaje mira a la
> derecha. Luz desde arriba a la izquierda. Sin fondo, sin sombra proyectada,
> sin texto, sin marco.

Después recortar al lienzo exacto de la tabla y pasar el validador.
`;

const out = resolve(process.cwd(), 'docs/PLIEGO-DE-ARTE.md');
writeFileSync(out, doc, 'utf8');
console.log(`Pliego escrito en ${out}`);
console.log(`${PART_SPECS.length} piezas especificadas.`);
