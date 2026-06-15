declare module 'web-ifc-three/IfcViewer' {
  export class IfcViewerAPI {
    constructor(options: { container: HTMLElement; backgroundColor?: any });
    axes: { setAxesAndGrid: (axes: boolean, grid: boolean) => void };
    context: { ifcCamera: { setNavigationMode: (mode: string) => void } };
    IFC: { loadIfc: (buffer: ArrayBuffer, coordinationMatrix: boolean) => Promise<any> };
  }
}
