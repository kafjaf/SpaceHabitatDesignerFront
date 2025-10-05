export interface DefaultFunctionalZoneDto {
  type: number; // Correspond à l'enum FunctionalZoneType
  name: string;
  defaultWidthM: number;
  defaultDepthM: number;
  defaultHeightM: number;
  colorHex: string;
}

export interface FunctionalZone {
  id: string;
  type: number;
  name: string;
  widthM: number;
  depthM: number;
  heightM: number;
  positionX: number;
  positionY: number;
  positionZ: number;
  colorHex?: string;
}
