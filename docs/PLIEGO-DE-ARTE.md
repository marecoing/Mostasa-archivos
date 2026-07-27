# Pliego de arte — MOSTASA'S RAGE

**Documento generado.** No editar a mano: sale de `src/game/art/` con
`npm run arte:pliego`. Si un número de acá cambia, cambió en el motor.

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
| Resolución de autoría | 600 px por metro (el doble que el juego, que corre a 150) |
| Orientación | El personaje mira a la **derecha**. El hueso apunta hacia **abajo**. |
| Pivote | La articulación **padre**, arriba. Coordenadas exactas en la tabla. |
| Contorno de tinta | 13 px, color `#11141d`, uniforme, cerrado |
| Aire al borde | 18 px. Ningún píxel opaco puede tocar el borde del lienzo. |
| Solape en articulaciones | 24 px más allá de la articulación, para que al doblarse no aparezca hueco |
| Sombreado | Planos planos de luz y sombra. **Sin degradados, sin desenfoque, sin texturas fotográficas.** |
| Paleta | Cerrada. Ver sección 4. No usar ningún color fuera de la lista. |

---

## 3. Proporciones

| Medida | Valor |
| --- | --- |
| Estatura de Mostasa | 1.76 m = 1056 px a resolución de autoría |
| Proporción | 6 cabezas |
| Altura de cabeza | 0.293 m = 176 px |
| Tobillo sobre el piso | 0.09 m = 54 px |

Estaturas del resto del elenco, para cuando se encarguen los enemigos:

- **hero**: 1.76 m (1056 px)
- **grunt**: 1.74 m (1044 px)
- **heavy**: 1.92 m (1152 px)
- **runner**: 1.68 m (1008 px)
- **miniBoss**: 1.98 m (1188 px)
- **boss**: 2.15 m (1290 px)

Un enemigo común mide prácticamente lo mismo que el héroe, porque en la calle
la gente mide lo mismo. Nada de enemigos enanos.

---

## 4. Paleta cerrada

Buenos Aires de noche bajo alumbrado de vapor de sodio. Asfalto azulado, halo
naranja de la lámpara, neón de los carteles como contraluz.

`#11141d` · `#1d2231` · `#1a2030` · `#2b3242` · `#3d4659` · `#4a4d52` · `#63666c` · `#ffd98a` · `#f2b04e` · `#b87433` · `#d9a21b` · `#f0c247` · `#8f6510` · `#2fb6a8` · `#c4478f` · `#c98d63` · `#e0a97d` · `#8f6044` · `#3a4a6b` · `#52658a` · `#4d5460` · `#6a7280` · `#55603f` · `#717d57` · `#c8384a` · `#e4576a` · `#e8e4da`

Cada material tiene tres tonos: iluminado, base y en sombra. Usar exactamente
estos y no interpolar:

| Material | Luz | Base | Sombra |
| --- | --- | --- | --- |
| skin | `#e0a97d` | `#c98d63` | `#8f6044` |
| mustard | `#f0c247` | `#d9a21b` | `#8f6510` |
| clothBlue | `#52658a` | `#3a4a6b` | `#1d2231` |
| clothGrey | `#6a7280` | `#4d5460` | `#1d2231` |
| clothOlive | `#717d57` | `#55603f` | `#1d2231` |
| asphalt | `#3d4659` | `#2b3242` | `#1a2030` |
| pavement | `#63666c` | `#4a4d52` | `#2b3242` |
| sodium | `#ffd98a` | `#f2b04e` | `#b87433` |
| danger | `#e4576a` | `#c8384a` | `#1d2231` |

**Mostasa lleva campera mostaza.** Es el único amarillo saturado que usa un
personaje: sirve para que el jugador nunca lo pierda de vista en una pantalla
llena de enemigos. Los enemigos van en azules, grises y verdes desaturados.

---

## 5. Luz

Una sola dirección de luz para todo el juego. Ésta es la regla que impide que
personajes y fondos parezcan pegoteados de dos mundos distintos.

- **Llave** (cálida, de la lámpara de sodio): azimut -35°, elevación 62°.
  En la práctica: **desde arriba y desde la izquierda de pantalla**.
- **Contraluz** (frío, del neón): azimut 145°, es decir **desde atrás y a la derecha**.
- El lado iluminado de cada pieza es el **izquierdo**. La sombra va a la derecha.

---

## 6. Las ocho piezas

| Archivo | Pieza | Lienzo (px) | Pivote (x, y) | Articulación hija (x, y) | Largo de hueso |
| --- | --- | --- | --- | --- | --- |
| `cabeza.png` | Cabeza (perfil tres cuartos, con pelo y bigote) | 221 × 219 | 113, 118 | — | — |
| `torso.png` | Torso con campera y cuello | 227 × 480 | 114, 139 | 114, 427 | 288 px |
| `brazo.png` | Brazo (hombro a codo), con manga | 145 × 280 | 72, 53 | 72, 233 | 180 px |
| `antebrazo.png` | Antebrazo (codo a muñeca), con puño de manga | 113 × 265 | 55, 45 | 55, 213 | 168 px |
| `mano.png` | Mano cerrada en puño | 133 × 102 | 64, 18 | — | 66 px |
| `muslo.png` | Muslo (cadera a rodilla), con pantalón | 169 × 386 | 84, 69 | 84, 339 | 270 px |
| `pantorrilla.png` | Pantorrilla (rodilla a tobillo), con pantalón | 136 × 329 | 74, 47 | 74, 287 | 240 px |
| `borcegui.png` | Borceguí con suela | 205 × 195 | 75, 120 | — | 96 px |

El **pivote** es el punto del lienzo donde el motor clava la pieza. La
**articulación hija** es donde tiene que caer el extremo del hueso: si el
antebrazo dice que la muñeca va en (x, y), ahí tiene que estar la muñeca
dibujada, o el brazo queda largo o corto.

### `cabeza.png` — Cabeza (perfil tres cuartos, con pelo y bigote)

El pivote es el CENTRO de la cabeza, no la base del cuello. La cara mira a la derecha. Incluir pelo, oreja, ceja, ojo y bigote en la misma pieza. El cuello lo dibuja el torso: no dibujarlo acá.

### `torso.png` — Torso con campera y cuello

El pivote es la PELVIS. El punto hijo es la línea de hombros. La campera baja por debajo de la pelvis y sube hasta el cuello. Tiene que ser más angosta que la línea de hombros, o tapa el brazo del lado lejano. Incluir el cuello asomando arriba; los brazos van aparte.

### `brazo.png` — Brazo (hombro a codo), con manga

El pivote es el HOMBRO. Marcar el deltoides arriba y afinar hacia el codo.

### `antebrazo.png` — Antebrazo (codo a muñeca), con puño de manga

El pivote es el CODO. Panza del músculo arriba, muñeca fina abajo. Incluir el puño de la manga donde termina.

### `mano.png` — Mano cerrada en puño

El pivote es la MUÑECA. Puño cerrado con el pulgar cruzado por delante: se lee mucho mejor que una mano abierta y es la pose correcta casi siempre.

### `muslo.png` — Muslo (cadera a rodilla), con pantalón

El pivote es la CADERA. Grueso arriba, rodilla marcada abajo.

### `pantorrilla.png` — Pantorrilla (rodilla a tobillo), con pantalón

El pivote es la RODILLA. El gemelo va del lado de ATRÁS (izquierda del dibujo, porque el personaje mira a la derecha).

### `borcegui.png` — Borceguí con suela

El pivote es el TOBILLO, y queda por ENCIMA de la planta: la planta del borceguí tiene que caer a 54 px por debajo del pivote, que es donde apoya en el piso. La punta mira a la derecha. Suela más oscura.


---

## 7. Cómo se verifica una entrega

```
npm run arte:validar -- <carpeta>
```

El validador rechaza automáticamente:

- lienzo de tamaño incorrecto
- PNG sin canal alfa
- píxeles opacos tocando el borde (falta el aire de 18 px)
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
> pieza]** de un personaje masculino adulto de 1.76 m, proporción de
> 6 cabezas, con campera mostaza `#d9a21b` y
> pantalón azul `#3a4a6b`. El personaje mira a la
> derecha. Luz desde arriba a la izquierda. Sin fondo, sin sombra proyectada,
> sin texto, sin marco.

Después recortar al lienzo exacto de la tabla y pasar el validador.
