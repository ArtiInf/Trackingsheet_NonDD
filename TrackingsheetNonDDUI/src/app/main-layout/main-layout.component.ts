import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../services/login.service';
import { ProjectDetails } from '../ProjectDetails/ProjectDetails.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ProjectDetails],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.css']
})
export class MainLayoutComponent implements OnInit {
  userName: string | null = null;
  isAssignProjectOpen: boolean = false;

  constructor(private authService: AuthService, private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.closeAssignProjectPopup();
    });
  }

  ngOnInit(): void {
    this.authService.userName$.subscribe(name => {
      this.userName = name;
    });
  }

  openAssignProjectPopup() {
    this.isAssignProjectOpen = true;
  }

  closeAssignProjectPopup() {
    this.isAssignProjectOpen = false;
  }



  openNotifications() {
    console.log('Notification bell clicked');
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
  refreshPage() {
  window.location.reload();
}
}