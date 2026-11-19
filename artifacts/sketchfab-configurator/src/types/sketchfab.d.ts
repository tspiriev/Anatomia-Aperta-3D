import type { AnatomicalSystemId } from '../data/anatomicalSystems';

export type SceneNode = {
  instanceID: number;
  name: string;
  rawName: string;
  type: string;
  visible: boolean;
  systemId: AnatomicalSystemId | null;
  materialID?: string;      // present on Geometry nodes
  children?: number[];      // child instanceIDs
};

export type Annotation = {
  index: number;
  name: string;
  content: { raw: string };
};

export interface SketchfabMaterial {
  id: string;
  name: string;
  channels: {
    EmitColor?: { enable: boolean; color: number[]; factor: number };
    AlbedoPBR?: { enable: boolean; color: number[]; factor: number };
    Opacity?: {
      enable: boolean; factor: number; type?: string; invert?: boolean;
      ior?: number; refractionColor?: number[]; roughnessFactor?: number;
      useNormalOffset?: boolean; useAlbedoTint?: boolean; useMicrosurfaceTexture?: boolean;
    };
    [key: string]: unknown;
  };
}

declare global {
  interface Window {
    Sketchfab: new (iframe: HTMLIFrameElement) => {
      init: (
        uid: string,
        options: {
          success: (api: SketchfabAPI) => void;
          error: () => void;
          autostart?: number;
          camera?: number;
          autospin?: number;
          annotation?: number;
          annotations_visible?: number;
          ui_annotations?: number;
          ui_controls?: number;
          ui_infos?: number;
          ui_inspector?: number;
          ui_fullscreen?: number;
          ui_watermark_link?: number;
          ui_watermark?: number;
        },
      ) => void;
    };
  }

  interface SketchfabAPI {
    start: () => void;
    stop: () => void;
    addEventListener: (event: string, callback: (info?: any) => void) => void;
    getNodeMap: (
      callback: (err: Error | null, nodes: Record<string, any>) => void,
    ) => void;
    getAnnotationList: (
      callback: (err: Error | null, annotations: any[]) => void,
    ) => void;
    gotoAnnotation: (
      index: number,
      options: object,
      callback: (err: Error | null, index: number) => void,
    ) => void;
    hide: (instanceID: number) => void;
    show: (instanceID: number) => void;
    focusOnVisibleGeometries?: (callback: (err: Error | null) => void) => void;
    getCameraLookAt?: (callback: (err: Error | null, camera: { position: number[]; target: number[] }) => void) => void;
    setCameraLookAt?: (position: number[], target: number[], duration: number) => void;
    getMatrix?: (instanceID: number, callback: (err: Error | null, matrix: unknown) => void) => void;
    getMaterialList: (
      callback: (err: Error | null, materials: SketchfabMaterial[]) => void,
    ) => void;
    /** Update an existing material's properties (affects ALL nodes using that material). */
    setMaterial: (material: SketchfabMaterial, callback: () => void) => void;
    /** Create a brand-new material in the scene; returns it with a fresh id. */
    createMaterial: (
      material: Omit<SketchfabMaterial, 'id'> & { id?: string },
      callback: (err: Error | null, material: SketchfabMaterial) => void,
    ) => void;
    /** Assign a material (by id) to a specific node — true per-node override. */
    assignMaterial: (
      node: any,
      materialId: string,
      callback: (err: Error | null) => void,
    ) => void;
  }
}

export {};
