import {
  Directive,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  AfterViewInit,
  Output,
  EventEmitter,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as THREE from 'three';
import { CSS2DObject, CSS2DRenderer, OrbitControls, TransformControls } from 'three-stdlib';
import { FunctionalZone } from '../Models/zoneFonctionnelle.models';
import { HabitatShape } from '../Models/habitat.models';

export enum TransformMode {
  Translate = 'translate',
  Scale = 'scale'
}

@Directive({
  selector: '[appThreeScene]',
  standalone: false
})
export class ThreeSceneDirective implements AfterViewInit, OnDestroy, OnChanges {
  @Input() habitatShape: HabitatShape = HabitatShape.Cylindre;
  @Input() habitatRadius: number = 5;
  @Input() habitatHeight: number = 10;
  @Input() zones: FunctionalZone[] = [];
  @Input() invalidZoneIds: Set<string> = new Set();
  @Input() transformMode: TransformMode = TransformMode.Translate;

  @Input() habitatTransparent : boolean = false;

  @Output() zoneSelected = new EventEmitter<FunctionalZone>();
  @Output() zoneUpdated = new EventEmitter<FunctionalZone>();
  @Output() zoneTransforming = new EventEmitter<Partial<FunctionalZone>>();

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private habitatMesh!: THREE.Mesh;
  private zoneMeshes: THREE.Mesh[] = [];
  private zoneMeshMap = new Map<string, THREE.Mesh>();
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private animationId!: number;

   // --- NOUVEAU : Le renderer pour les étiquettes HTML ---
  private labelRenderer!: CSS2DRenderer;

  private transformControls!: TransformControls;
  private selectedMesh: THREE.Mesh | null = null;
  private isDragging: boolean = false;
  private initialZoneDimensions = new THREE.Vector3();

   // --- NOUVEAU : Une map pour garder une référence à nos étiquettes ---
  private zoneLabelMap = new Map<string, CSS2DObject>();

  private isBrowser: boolean;

  constructor(
    private el: ElementRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      this.init();
      this.animate();
      this.el.nativeElement.addEventListener('click', this.onCanvasClick.bind(this));
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.isBrowser) {
      if (changes['habitatShape'] || changes['habitatRadius'] || changes['habitatHeight']) {
        this.createHabitat();
      }
      if (changes['zones']) {
        this.renderZones();
      }
      if (changes['invalidZoneIds']) {
        this.updateZoneColors();
      }
      if (changes['transformMode'] && this.transformControls) {
        this.transformControls.setMode(this.transformMode);
      }
       if (changes['habitatTransparent'] && this.habitatMesh) {
        // Mettre à jour seulement le matériau si seule la transparence change
        const material = this.habitatMesh.material as THREE.MeshStandardMaterial;
        material.transparent = this.habitatTransparent;
        material.opacity = this.habitatTransparent ? 0.2 : 1.0; // 0.2 si transparent, 1.0 si opaque
      }
    }
  }

  ngOnDestroy(): void {
    if (this.isBrowser) {
      this.el.nativeElement.removeEventListener('click', this.onCanvasClick.bind(this));
      this.detachTransformControls();
      cancelAnimationFrame(this.animationId);
      window.removeEventListener('resize', this.onWindowResize.bind(this));
      
      if (this.controls) this.controls.dispose();
      if (this.renderer) this.renderer.dispose();
      
      if (this.habitatMesh) {
        this.habitatMesh.geometry.dispose();
        if (this.habitatMesh.material) (this.habitatMesh.material as THREE.Material).dispose();
      }
      if (this.labelRenderer) {
        this.el.nativeElement.parentNode.removeChild(this.labelRenderer.domElement);
      }
      this.zoneMeshMap.forEach(mesh => {
          mesh.geometry.dispose();
          if (mesh.material) (mesh.material as THREE.Material).dispose();
      });
    }
  }

  private init(): void {
    const width = this.el.nativeElement.clientWidth;
    const height = this.el.nativeElement.clientHeight;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.set(15, 15, 15);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.el.nativeElement, antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    const gridHelper = new THREE.GridHelper(50, 50);
    this.scene.add(gridHelper);
      // --- NOUVEAU : Initialisation du CSS2DRenderer ---
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(width, height);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0px';
    // Très important pour que les clics de souris "traversent" les étiquettes
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    this.el.nativeElement.parentNode.appendChild(this.labelRenderer.domElement);
    // --- FIN DE L'AJOUT ---
    this.createHabitat();
    this.renderZones();
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private createHabitat(): void {
    if (this.habitatMesh) {
      this.scene.remove(this.habitatMesh);
      this.habitatMesh.geometry.dispose();
      (this.habitatMesh.material as THREE.Material).dispose();
    }
    let geometry: THREE.BufferGeometry;
    if (this.habitatShape === HabitatShape.Cylindre) {
      geometry = new THREE.CylinderGeometry(this.habitatRadius, this.habitatRadius, this.habitatHeight, 32);
    } else {
      geometry = new THREE.SphereGeometry(this.habitatRadius, 32, 32);
    }
    const material = new THREE.MeshStandardMaterial({
      color: 0xcccccc, 
      metalness: 0.5, 
      roughness: 0.5, 
      transparent: this.habitatTransparent, // Utilise la nouvelle propriété
      opacity: this.habitatTransparent ? 0.2 : 1.0 // Utilise la nouvelle propriété
    });
    this.habitatMesh = new THREE.Mesh(geometry, material);
    this.habitatMesh.castShadow = true;
    this.habitatMesh.receiveShadow = true;
    material.side = THREE.DoubleSide; // visible des deux côtés
    material.depthWrite = false;      // empêche le masquage des zones internes

    // CORRECTION : Faute de frappe, c'était .Sphere au lieu de .Sphère
    if (this.habitatShape === HabitatShape.Sphere) {
        this.habitatMesh.position.y = this.habitatRadius / 2; // Centre la sphère verticalement
    } else {
        this.habitatMesh.position.y = this.habitatHeight / 2;
    }
    this.scene.add(this.habitatMesh);
  }
    
  private renderZones(): void {
    this.detachTransformControls(); // Détacher les contrôles avant de tout recréer
    if (!this.scene) return;
    this.zoneMeshes.forEach(mesh => {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
    });
    this.zoneMeshMap.clear();
    this.zoneMeshes = [];

    this.zoneLabelMap.forEach(label => {
      label.removeFromParent(); // Enlève l'étiquette de son parent (le mesh)
    });
    this.zoneLabelMap.clear();

    this.zones.forEach(zone => {
        const geometry = new THREE.BoxGeometry(zone.widthM, zone.heightM, zone.depthM);
        const material = new THREE.MeshStandardMaterial({
            color: zone.colorHex || '#cccccc', metalness: 0.2, roughness: 0.8
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(zone.positionX, zone.positionY + zone.heightM / 2, zone.positionZ);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { zoneId: zone.id };

         // --- NOUVEAU : Création et ajout de l'étiquette ---
      const labelDiv = document.createElement('div');
      labelDiv.className = 'zone-label';
      labelDiv.textContent = zone.name;

      const label = new CSS2DObject(labelDiv);
      // Positionne l'étiquette légèrement au-dessus du centre supérieur de la boîte
      label.position.set(0, zone.heightM / 2 + 0.5, 0); 
      mesh.add(label); // On attache l'étiquette au mesh !
      
      this.zoneLabelMap.set(zone.id, label); // On la stocke pour pouvoir la nettoyer plus tard
      // --- FIN DE L'AJOUT ---
        this.scene.add(mesh);
        this.zoneMeshMap.set(zone.id, mesh);
        this.zoneMeshes.push(mesh);
    });
    this.updateZoneColors();
  }
    
  private updateZoneColors(): void {
    this.zoneMeshMap.forEach((mesh, zoneId) => {
        const material = mesh.material as THREE.MeshStandardMaterial;
        const zoneData = this.zones.find(z => z.id === zoneId);
        if (!zoneData) return;
        if (this.invalidZoneIds.has(zoneId)) {
            material.color.setHex(0xff0000);
        } else {
            material.color.set(zoneData.colorHex || '#cccccc');
        }
    });
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    this.controls.update();
    this.renderer.render(this.scene, this.camera);

     // --- NOUVEAU : Rendu de la scène des étiquettes par-dessus ---
    this.labelRenderer.render(this.scene, this.camera);
  }

  private onWindowResize(): void {
    const width = this.el.nativeElement.clientWidth;
    const height = this.el.nativeElement.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);

    // --- NOUVEAU : Mettre aussi à jour la taille du renderer des étiquettes ---
    this.labelRenderer.setSize(width, height);
  }

  private onCanvasClick(event: MouseEvent): void {
    if (this.isDragging) return;

    const rect = this.el.nativeElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.zoneMeshes);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      this.attachTransformControls(clickedMesh);
    } else {
      this.detachTransformControls();
    }
  }

  // --- CORRECTION : Utilisation de "arrow functions" pour conserver le contexte `this` ---
  private onMouseDown = () => {
    this.controls.enabled = false;
    if (this.transformMode === TransformMode.Scale && this.selectedMesh) {
      const zoneId = this.selectedMesh.userData['zoneId'];
      const zoneData = this.zones.find(z => z.id === zoneId);
      if (zoneData) {
        this.initialZoneDimensions.set(zoneData.widthM, zoneData.heightM, zoneData.depthM);
      }
    }
  };

  private onMouseUp = () => {
    this.controls.enabled = true;
    if (this.isDragging) { // N'émettre que si on a réellement déplacé quelque chose
      this.onZoneTransformed(true); // true = mise à jour finale
    }
  };

  private onObjectChange = () => {
    this.onZoneTransformed(false); // false = mise à jour en cours
  };

  private onDraggingChanged = (event: any) => {
    this.isDragging = event.value;
  };

  private attachTransformControls(mesh: THREE.Mesh): void {
    if (this.selectedMesh === mesh) return;

    this.detachTransformControls();
    this.selectedMesh = mesh;

    this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
    this.transformControls.attach(mesh);
    this.transformControls.setMode(this.transformMode);
    this.scene.add(this.transformControls);

    this.transformControls.addEventListener('mouseDown' as any, this.onMouseDown);
    this.transformControls.addEventListener('mouseUp' as any, this.onMouseUp);
    this.transformControls.addEventListener('objectChange' as any, this.onObjectChange);
    this.transformControls.addEventListener('dragging-changed' as any, this.onDraggingChanged);

    const zoneId = mesh.userData['zoneId'];
    const selectedZone = this.zones.find(z => z.id === zoneId);
    if (selectedZone) {
      this.zoneSelected.emit(selectedZone);
    }
  }

  private detachTransformControls(): void {
    if (this.transformControls) {
      this.transformControls.removeEventListener('mouseDown' as any, this.onMouseDown);
      this.transformControls.removeEventListener('mouseUp' as any, this.onMouseUp);
      this.transformControls.removeEventListener('objectChange' as any, this.onObjectChange);
      this.transformControls.removeEventListener('dragging-changed' as any, this.onDraggingChanged);
      this.transformControls.dispose();
      this.scene.remove(this.transformControls);
    }
    this.selectedMesh = null;
    this.isDragging = false; 
  }

  private onZoneTransformed(isFinalUpdate: boolean): void {
    if (!this.selectedMesh) return;

    const zoneId = this.selectedMesh.userData['zoneId'];
    const zoneData = this.zones.find(z => z.id === zoneId);
    if (!zoneData) return;

    const partialUpdate: Partial<FunctionalZone> = { id: zoneData.id }; 

    if (this.transformMode === TransformMode.Translate) {
      partialUpdate.positionX = this.selectedMesh.position.x;
      partialUpdate.positionY = this.selectedMesh.position.y - (zoneData.heightM / 2);
      partialUpdate.positionZ = this.selectedMesh.position.z;
    } 
    else if (this.transformMode === TransformMode.Scale) {
      partialUpdate.widthM = this.initialZoneDimensions.x * this.selectedMesh.scale.x;
      partialUpdate.heightM = this.initialZoneDimensions.y * this.selectedMesh.scale.y;
      partialUpdate.depthM = this.initialZoneDimensions.z * this.selectedMesh.scale.z;
    }
    
    if (isFinalUpdate) {
      const finalZoneData = { ...zoneData, ...partialUpdate };
      this.zoneUpdated.emit(finalZoneData);
    } else {
      this.zoneTransforming.emit(partialUpdate);
    }
  } 
}