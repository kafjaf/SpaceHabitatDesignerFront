import { Component, OnInit } from '@angular/core';
import { HabitatService } from '../../services/habitat.service';
import { Destination, HabitatShape, HabitatTypeDto } from '../../Models/habitat.models';
import { DefaultFunctionalZoneDto, FunctionalZone } from '../../Models/zoneFonctionnelle.models';
import { ValidationResultDto } from '../../Models/validation.models';
import { TransformMode } from '../../directives/three-scene.directive';

@Component({
  selector: 'app-habitat-designer',
  standalone: false,
  templateUrl: './habitat-designer.component.html',
  styleUrl: './habitat-designer.component.scss'
})
export class HabitatDesignerComponent implements OnInit {

   // --- NOUVELLES PROPRIÉTÉS POUR LA MISSION ---
  // crewSize: number = 2; // Taille d'équipage par défaut
  destination: Destination = Destination.OrbiteTerrestreBasse; // Destination par défaut
  destinationEnum = Destination; // Pour l'utiliser dans le template
  // Pour la liste déroulante des destinations
  availableDestinations = [
    { name: 'Orbite Terrestre Basse', value: Destination.OrbiteTerrestreBasse },
    { name: 'Orbite Lunaire', value: Destination.OrbiteLunaire },
    { name: 'Surface Lunaire', value: Destination.SurfaceLunaire },
    { name: 'Transit vers Mars', value: Destination.TransitVersMars },
    { name: 'Orbite Martienne', value: Destination.OrbiteMartienne },
    { name: 'Surface Martienne', value: Destination.SurfaceMartienne }
  ];

   // --- NOUVELLES PROPRIÉTÉS POUR LA FORME ---
  habitatShape: HabitatShape = HabitatShape.Cylindre; // Forme par défaut
  habitatShapeEnum = HabitatShape; // Pour l'utiliser dans le template
  // Pour la liste déroulante
  availableShapes = [
    { name: 'Cylindre', value: HabitatShape.Cylindre },
    { name: 'Sphère', value: HabitatShape.Sphere }
  ];

  habitatTypes: any[] = [];
  habitatRadius: number = 5;
  habitatHeight: number = 10;
  currentVolume: number = 0;

 // Nouvelles propriétés pour les zones
  availableZoneTypes: DefaultFunctionalZoneDto[] = [];
  zones: FunctionalZone[] = [];
  selectedZone: FunctionalZone | null = null;
  selectedZoneTypeToAdd: number = 0; // ID du type sélectionné dans le dropdown


  // Nouvelle propriété pour les erreurs
  validationErrors: ValidationResultDto[] = [];
  invalidZoneIds: Set<string> = new Set();

  // Nouvelle propriété pour le mode de transformation
  currentTransformMode: TransformMode = TransformMode.Translate;
   TransformMode = TransformMode; 

    // --- NOUVELLES PROPRIÉTÉS POUR LA MISSION ---
  crewSize: number = 4; // Taille de l'équipage par défaut
  missionDuration: number = 365; // Durée en jours par défaut



  constructor(private habitatService: HabitatService) { }

  
  ngOnInit(): void {
    this.loadHabitatTypes();
     this.loadAvailableZoneTypes();
    this.calculateVolume();
  }
  

  loadHabitatTypes(): void {
    this.habitatService.getHabitatTypes().subscribe({
      next: (data) => {
        this.habitatTypes = data;
        console.log('Types d\'habitats reçus:', this.habitatTypes);
      },
      error: (err) => {
        console.error('Erreur lors de la récupération des types d\'habitats:', err);
      }
    });
  }

  loadAvailableZoneTypes(): void {
    this.habitatService.getDefaultZones().subscribe({
      next: (data) => {
         console.log('Données des zones reçues par le composant :', data); 
        this.availableZoneTypes = data;
      },
      error: (err) => console.error('Erreur:', err)
    });
  }

  validate(): void {
    this.habitatService.validateHabitat(this.habitatShape, this.habitatRadius, this.habitatHeight, this.zones, this.crewSize, this.missionDuration, this.destination).subscribe({
      next: (errors) => {
        this.validationErrors = errors;
        this.invalidZoneIds = new Set(errors.filter(e => e.zoneId).map(e => e.zoneId!));
      },
      error: (err) => console.error('Erreur de validation:', err)
    });
  }



  updateHabitat(): void {
    this.calculateVolume();
  }

  calculateVolume(): void {
    // Volume d'un cylindre = π * r² * h
     if (this.habitatShape === HabitatShape.Cylindre) {
      this.currentVolume = Math.PI * Math.pow(this.habitatRadius, 2) * this.habitatHeight;
    } else if (this.habitatShape === HabitatShape.Sphere) {
      this.currentVolume = (4 / 3) * Math.PI * Math.pow(this.habitatRadius, 3);
    }
  }

   addZone(): void {
    const zoneTemplate = this.availableZoneTypes.find(z => z.type === this.selectedZoneTypeToAdd);
    if (!zoneTemplate) return;

    // Positionnement simple : on place les zones en cercle pour l'instant
    const angle = this.zones.length * (Math.PI * 2 / 5); // 5 zones max avant de superposer
    const distanceFromCenter = this.habitatRadius * 0.6;

    const newZone: FunctionalZone = {
      id: crypto.randomUUID(),
      type: zoneTemplate.type,
      name: zoneTemplate.name,
      widthM: zoneTemplate.defaultWidthM,
      depthM: zoneTemplate.defaultDepthM,
      heightM: zoneTemplate.defaultHeightM,
      positionX: Math.cos(angle) * distanceFromCenter,
      positionY: 0, // Au niveau du sol
      positionZ: Math.sin(angle) * distanceFromCenter,
      colorHex: zoneTemplate.colorHex 
    };
    this.zones = [...this.zones, newZone];
  }

  selectZone(zone: FunctionalZone): void {
    this.selectedZone = zone;
  }

  // Nouvelle méthode pour gérer les mises à jour depuis la 3D
  onZoneUpdated(updatedZone: FunctionalZone): void {
    // Trouver la zone dans le tableau et la remplacer par la version mise à jour
    const index = this.zones.findIndex(z => z.id === updatedZone.id);
    if (index !== -1) {
    if (JSON.stringify(this.zones[index]) !== JSON.stringify(updatedZone)) {
        const newZones = [...this.zones];
        newZones[index] = updatedZone;
        this.zones = newZones;
        
        if (this.selectedZone?.id === updatedZone.id) {
          this.selectedZone = updatedZone;
        }
      }
    }
    this.validate(); // Re-valider après chaque modification
  }

  // Nouvelles méthodes pour contrôler l'édition
  deselectZone(): void {
    this.selectedZone = null;
    // Pour détacher les contrôles, on peut émettre un clic "vide" ou ajouter une méthode à la directive.
    // Pour simplifier, on va recharger les zones, ce qui détachera tout.
    // Une meilleure approche serait un @Input() sur la directive pour forcer le détachement.
    // Pour l'instant, cette approche simple fonctionne.
    const tempZones = [...this.zones];
    this.zones = [];
    setTimeout(() => this.zones = tempZones, 0);
  }

  setTransformMode(mode: TransformMode): void {
    this.currentTransformMode = mode;
  }
    onZoneDataChange(): void {
    // Quand les données changent via les inputs, on doit forcer la mise à jour du tableau
    // pour que la directive 3D reçoive le changement.
    if (this.selectedZone) {
      this.onZoneUpdated(this.selectedZone);
    }
  }

   get isHabitatTransparent(): boolean {
    // L'habitat devient transparent dès qu'il y a au moins une zone dedans.
    return this.zones.length > 0;
  }
}


