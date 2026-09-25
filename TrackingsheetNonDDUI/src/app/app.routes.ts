import { Routes } from '@angular/router';
import { LoginComponent } from './Login/login.component';
import { MainLayoutComponent } from './main-layout/main-layout.component';
import { UsersComponent } from './User/User.component';
import { ProjectDetails } from './ProjectDetails/ProjectDetails.component';
import { TrackingSheetComponent} from './TrackingSheet/TrackingSheet.component';
import { CreateOrder } from './CreateOrders/createorders.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  {
    path: 'login',
    component: LoginComponent
  },
  
  {
    path: 'dashboard', 
    component: MainLayoutComponent,
    children: [
      { path: '', component: UsersComponent }, 
      { path: 'project-details', component: ProjectDetails },
      { path: 'tracking-sheet', component: TrackingSheetComponent },
      { path: 'create-order', component: CreateOrder }
    ]
  },
  
  {
    path: '**',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];