import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HabitatDesignerComponent } from './components/habitat-designer/habitat-designer.component';

const routes: Routes = [
  //  { path: '', component: HabitatDesignerComponent }
  {
   path: '', 
    loadChildren: () => import('./components/habitat-designer/habitat-designer.module').then(m => m.HabitatDesignerModule)
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
