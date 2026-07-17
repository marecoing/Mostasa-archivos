/**
 * Stage manifest — the 10 modular scenarios of the campaign.
 * Art: each stage is a 5120×1024 strip sliced into five 1024×1024 panels
 * (see scenario-manifest.json). Only Escenario 1 (Once) is wired for
 * runtime rendering; the rest are registered data-driven and lazy-loaded
 * when built (Biblia Maestra §14, §32).
 */

export interface StageDef {
  id: string;
  index: number;
  displayName: string;
  panelCount: number;
  panelWidth: number;
  panelHeight: number;
  /** runtime panel texture paths (served from public/); empty until staged */
  panelPaths: string[];
  /** whether this stage's art has been copied into public/ for runtime use */
  runtimeReady: boolean;
  miniBossId: number | null;
  bossId: number;
  nextStageId: string | null;
}

/** Panel paths for a stage staged under public/assets/stages/<dir>/. */
function panels(dir: string, prefix: string): string[] {
  return [1, 2, 3, 4, 5].map(
    (n) => `assets/stages/${dir}/${prefix}-panel-0${n}.png`,
  );
}

export const STAGES: StageDef[] = [
  {
    id: '01-once', index: 1, displayName: 'Once', panelCount: 5,
    panelWidth: 1024, panelHeight: 1024, panelPaths: panels('once', '01-once'),
    runtimeReady: true, miniBossId: 9, bossId: 10, nextStageId: '02-estacion-oxidada',
  },
  {
    id: '02-estacion-oxidada', index: 2, displayName: 'Estación Oxidada', panelCount: 5,
    panelWidth: 1024, panelHeight: 1024, panelPaths: panels('estacion', '02-estacion-oxidada'),
    runtimeReady: true, miniBossId: 19, bossId: 20, nextStageId: '03-pasillo-del-conurbano',
  },
  {
    id: '03-pasillo-del-conurbano', index: 3, displayName: 'Pasillo del Conurbano', panelCount: 5,
    panelWidth: 1024, panelHeight: 1024, panelPaths: panels('conurbano', '03-pasillo-del-conurbano'),
    runtimeReady: true, miniBossId: 29, bossId: 30, nextStageId: '04-palermo-de-carton',
  },
  {
    id: '04-palermo-de-carton', index: 4, displayName: 'Palermo de Cartón', panelCount: 5,
    panelWidth: 1024, panelHeight: 1024, panelPaths: panels('palermo', '04-palermo-de-carton'),
    runtimeReady: true, miniBossId: null, bossId: 40, nextStageId: '05-avenida-de-la-protesta',
  },
  {
    id: '05-avenida-de-la-protesta', index: 5, displayName: 'Avenida de la Protesta', panelCount: 5,
    panelWidth: 1024, panelHeight: 1024, panelPaths: panels('protesta', '05-avenida-de-la-protesta'),
    runtimeReady: true, miniBossId: 49, bossId: 50, nextStageId: '06-catalinas-del-humo',
  },
  {
    id: '06-catalinas-del-humo', index: 6, displayName: 'Catalinas del Humo', panelCount: 5,
    panelWidth: 1024, panelHeight: 1024, panelPaths: panels('catalinas', '06-catalinas-del-humo'),
    runtimeReady: true, miniBossId: 59, bossId: 60, nextStageId: '07-puerto-del-country',
  },
  {
    id: '07-puerto-del-country', index: 7, displayName: 'Puerto del Country', panelCount: 5,
    panelWidth: 1024, panelHeight: 1024, panelPaths: panels('country', '07-puerto-del-country'),
    runtimeReady: true, miniBossId: 69, bossId: 70, nextStageId: '08-galpon-del-acceso',
  },
  {
    id: '08-galpon-del-acceso', index: 8, displayName: 'Galpón del Acceso', panelCount: 5,
    panelWidth: 1024, panelHeight: 1024, panelPaths: panels('galpon', '08-galpon-del-acceso'),
    runtimeReady: true, miniBossId: 79, bossId: 80, nextStageId: '09-pasillos-del-poder',
  },
  {
    id: '09-pasillos-del-poder', index: 9, displayName: 'Pasillos del Poder', panelCount: 5,
    panelWidth: 1024, panelHeight: 1024, panelPaths: panels('poder', '09-pasillos-del-poder'),
    runtimeReady: true, miniBossId: 89, bossId: 90, nextStageId: '10-casa-rosada-final',
  },
  {
    id: '10-casa-rosada-final', index: 10, displayName: 'Casa Rosada Final', panelCount: 5,
    panelWidth: 1024, panelHeight: 1024, panelPaths: panels('rosada', '10-casa-rosada-final'),
    runtimeReady: true, miniBossId: 98, bossId: 100, nextStageId: null,
  },
];

export const STAGE_BY_ID: Record<string, StageDef> = Object.fromEntries(
  STAGES.map((s) => [s.id, s]),
);

export function stageById(id: string): StageDef | undefined {
  return STAGE_BY_ID[id];
}
