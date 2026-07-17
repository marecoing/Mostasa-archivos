/**
 * Inter-level story beats (Biblia §5: tono satírico rioplatense). Every
 * character and organization is fictional; nothing refers to real people.
 * Pure data — CutsceneScene renders it, tests validate it.
 */

export interface StoryLine {
  /** speaker label shown above the text; '' = narrator */
  speaker: string;
  text: string;
}

export interface StageIntro {
  stageId: string;
  lines: StoryLine[];
}

const M = 'MOSTASA';
const N = '';

export const STAGE_INTROS: Record<string, StageIntro> = {
  '01-once': {
    stageId: '01-once',
    lines: [
      { speaker: N, text: 'Buenos Aires, 2026. La Rosca controla cada esquina,\ncada trámite, cada peaje invisible de la ciudad.' },
      { speaker: M, text: 'Me sacaron los ahorros, el laburo y hasta el termo.\nPero anoche un pendrive cayó en mis manos...' },
      { speaker: M, text: 'Y adentro está TODO. Nombres, cuentas, coimas.\nEsta noche, el Once me va a escuchar.' },
    ],
  },
  '02-estacion-oxidada': {
    stageId: '02-estacion-oxidada',
    lines: [
      { speaker: N, text: 'El pendrive necesita la clave del Guarda Fantasma,\nque cobra peaje en una estación que ningún tren visita.' },
      { speaker: M, text: 'Un molinete que no gira y un guarda que no existe.\nIgual que mi jubilación.' },
    ],
  },
  '03-pasillo-del-conurbano': {
    stageId: '03-pasillo-del-conurbano',
    lines: [
      { speaker: N, text: 'La clave apunta a un servidor escondido en lo profundo\ndel conurbano, detrás de mil pasillos y un quiosco.' },
      { speaker: M, text: 'El Puntero del Pasillo dice que acá no pasa nadie\nsin "colaborar". Hoy colaboro yo: con bronca.' },
    ],
  },
  '04-palermo-de-carton': {
    stageId: '04-palermo-de-carton',
    lines: [
      { speaker: N, text: 'El servidor derivaba la guita a una financiera trucha\ndisfrazada de café de especialidad en Palermo.' },
      { speaker: M, text: 'Cobran 9 lucas el cortado y lo llaman "experiencia".\nLa única experiencia que traigo es la de mis puños.' },
    ],
  },
  '05-avenida-de-la-protesta': {
    stageId: '05-avenida-de-la-protesta',
    lines: [
      { speaker: N, text: 'La Rosca armó una contramarcha paga para tapar\nel escándalo. Bombos alquilados, bronca de utilería.' },
      { speaker: M, text: 'Yo marché toda mi vida por cosas de verdad.\nA los bombos truchos les voy a marcar el compás.' },
    ],
  },
  '06-catalinas-del-humo': {
    stageId: '06-catalinas-del-humo',
    lines: [
      { speaker: N, text: 'Los papeles llevan a una torre de oficinas donde\nLa Gerencia factura humo... literalmente.' },
      { speaker: M, text: 'Cuarenta pisos de "consultoría estratégica".\nNi una silla donde sentarse a laburar.' },
    ],
  },
  '07-puerto-del-country': {
    stageId: '07-puerto-del-country',
    lines: [
      { speaker: N, text: 'El Escribano del Country guarda las escrituras truchas\ndetrás de tres rejas y un lago artificial.' },
      { speaker: M, text: 'Tienen seguridad privada, cámaras y drones.\nYo tengo un tubo oxidado y razón. Alcanza.' },
    ],
  },
  '08-galpon-del-acceso': {
    stageId: '08-galpon-del-acceso',
    lines: [
      { speaker: N, text: 'Todo lo que la Rosca roba duerme en un galpón\nal costado del Acceso. Todo lo que Mostasa perdió, también.' },
      { speaker: M, text: '¿Ese de ahí es MI termo? Ahora sí es personal.' },
    ],
  },
  '09-pasillos-del-poder': {
    stageId: '09-pasillos-del-poder',
    lines: [
      { speaker: N, text: 'Quedan dos firmas para desbloquear el pendrive.\nLas dos viven en los pasillos donde nunca entra el sol.' },
      { speaker: M, text: 'El Asesor Eterno lleva 40 años "asesorando".\nHoy le llega la evaluación de desempeño.' },
    ],
  },
  '10-casa-rosada-final': {
    stageId: '10-casa-rosada-final',
    lines: [
      { speaker: N, text: 'No queda nadie entre Mostasa y el Jefe de la Rosca.\nSolo una plaza, una reja, y años de mentiras.' },
      { speaker: M, text: 'Esto no es venganza. Es devolución con intereses.' },
      { speaker: N, text: 'La ciudad entera contiene la respiración.' },
    ],
  },
};

export function introForStage(stageId: string): StageIntro | undefined {
  return STAGE_INTROS[stageId];
}
