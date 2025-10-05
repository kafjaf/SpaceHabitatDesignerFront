import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Destination, HabitatShape, HabitatTypeDto } from '../Models/habitat.models';
import { DefaultFunctionalZoneDto, FunctionalZone } from '../Models/zoneFonctionnelle.models';
import { ValidationResultDto } from '../Models/validation.models';


@Injectable({
  providedIn: 'root'
})
export class HabitatService {
  private apiUrl = 'https://localhost:7118/api';

  constructor(private http : HttpClient) { }

   getHabitatTypes(): Observable<HabitatTypeDto[]> {
    return this.http.get<HabitatTypeDto[]>(`${this.apiUrl}/habitats/types`);
  }

   getDefaultZones(): Observable<DefaultFunctionalZoneDto[]> {
    return this.http.get<DefaultFunctionalZoneDto[]>(`${this.apiUrl}/ZonesFonctionnelles`);
  }

   validateHabitat(
    habitatShape: HabitatShape, 
    habitatRadius: number, 
    habitatHeight: number, 
    zones: FunctionalZone[],
    crewSize: number,
    missionDuration: number,
    destination: Destination
  ): Observable<ValidationResultDto[]> {
    const requestBody = {
      habitatShape,
      habitatRadius,
      habitatHeight,
      zones: zones.map(z => ({
        id: z.id,
        name : z.name,
        type: z.type, // <-- Très important d'envoyer le type !
        widthM: z.widthM,
        depthM: z.depthM,
        heightM: z.heightM,
        positionX: z.positionX,
        positionY: z.positionY,
        positionZ: z.positionZ,
      })),
      crewSize,        // <-- AJOUTÉ
      missionDuration, // <-- AJOUTÉ
      destination      // <-- AJOUTÉ
    };
    return this.http.post<ValidationResultDto[]>(`${this.apiUrl}/validation/habitat`, requestBody);
  }
}

