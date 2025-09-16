declare module '@react-three/fiber' {
  export const Canvas: any;
}

declare module '@react-three/drei' {
  export const Float: any;
  export const Environment: any;
  export const OrbitControls: any;
  export const MeshDistortMaterial: any;
}

declare namespace JSX {
  interface IntrinsicElements {
    ambientLight: any;
    directionalLight: any;
    mesh: any;
    icosahedronGeometry: any;
  }
}







