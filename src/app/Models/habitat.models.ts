export interface HabitatTypeDto {
  value: number;
  name: string;
}

export enum HabitatShape {
  Cylindre = 0,
  Sphere = 1
}

export enum Destination {
  OrbiteTerrestreBasse = 0,
  OrbiteLunaire = 1,
  SurfaceLunaire = 2,
  TransitVersMars = 3,
  OrbiteMartienne = 4,
  SurfaceMartienne = 5
}