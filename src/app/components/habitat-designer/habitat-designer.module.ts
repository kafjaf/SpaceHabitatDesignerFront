import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { HabitatDesignerComponent } from './habitat-designer.component';
import { ThreeSceneDirective } from '../../directives/three-scene.directive';

const routes: Routes = [
  { path: '', component: HabitatDesignerComponent }
];


@NgModule({
  declarations: [HabitatDesignerComponent, ThreeSceneDirective],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonToggleModule,
    MatExpansionModule
  ]
})
export class HabitatDesignerModule { }
