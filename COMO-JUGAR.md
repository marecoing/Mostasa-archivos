# Cómo jugar MOSTASA'S RAGE

No hace falta saber programar ni escribir comandos.

## 1. Descargar el juego

En GitHub, botón verde **`Code`** → **`Download ZIP`**.
Descomprimí el ZIP donde quieras (Escritorio está bien).

> Asegurate de estar en la rama `claude/mostasas-rage-game-build-ausmwi`
> (se elige en el desplegable de ramas, arriba a la izquierda, antes de descargar).

## 2. Doble clic

Entrá a la carpeta que descomprimiste y hacé doble clic en:

| Tu computadora | Archivo |
| --- | --- |
| Windows | **`JUGAR-WINDOWS.bat`** |
| Mac o Linux | **`JUGAR-MAC.command`** |

Se abre una ventana negra con texto. **Es normal.** Dejala abierta: es el
juego corriendo. Para cerrar el juego, cerrás esa ventana.

La primera vez tarda unos minutos preparando todo. Después arranca en segundos.

El navegador se abre solo. Si no lo hiciera, entrá a **http://localhost:3000**

## Si te dice que falta Node.js

El juego necesita Node.js, que es gratis y se instala una sola vez.
El lanzador te abre la página de descarga: instalalo con las opciones por
defecto, cerrá la ventana negra y volvé a hacer doble clic.

En Mac, si te dice *"no se puede abrir porque es de un desarrollador no
identificado"*: clic derecho sobre `JUGAR-MAC.command` → **Abrir** → **Abrir**.

---

## Controles

| Acción | Tecla |
| --- | --- |
| Caminar (8 direcciones) | **W A S D** o flechas |
| Correr | **Shift** (mantenido) |
| Saltar | **Espacio** |
| Golpe (encadená 3 seguidos) | **J** |
| Golpe fuerte | **K** |
| Especial (con la barra de Bronca llena) | **L** |
| Agarrar enemigo / levantar arma | **I** |
| Esquivar (rodada, te vuelve intocable un instante) | **O** |
| Pausa | **Esc** |

**En los menús:** **Enter** confirma. En la pantalla de selección, **D** cambia
la dificultad y **K** abre el Kiosco (mejoras). En el título, **TAB** abre la
Libreta de récords.

**Para reportar defectos:** apretá **F1** (muestra posición y estado) y **F2**
(dibuja las cajas de colisión). Con eso puedo ubicar cualquier problema con
precisión.

---

## Qué probar en esta versión

- **Profundidad**: caminá con **W** y **S**. La calle tiene fondo y frente, y
  ahora hay objetos repartidos en toda la profundidad.
- **El caño**: caminá encima y apretá **I** para levantarlo, después pegá con
  **J**. Tiene que apuntar hacia adelante, no quedar flotando.
- **Sombras**: fijate que personajes y objetos se apoyen en el piso.
- **Emboscadas**: en el nivel 2 (Estación Oxidada) la trampa te rodea.

## Nota

En computadora de escritorio va bien. En celulares de gama media puede fallar
la carga: el juego todavía usa mucha memoria de video y eso está pendiente de
optimizar.
