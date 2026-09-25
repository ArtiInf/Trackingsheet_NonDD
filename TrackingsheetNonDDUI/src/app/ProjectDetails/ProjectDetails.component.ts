import { Component, OnInit, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/login.service';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ProjectDetails.component.html',
  styleUrls: ['./ProjectDetails.component.css'],
})
export class ProjectDetails implements OnInit {
  userName$!: Observable<string | null>;
  userDesignation$!: Observable<string | null>;

  projectsList: any[] = [];
  selectedProjectId: number = 0;
  today: string = new Date().toISOString().split('T')[0];
  fromDate: string = '';
  toDate: string = '';

  currentEmpId: string = '';

  @Output() onProceed = new EventEmitter<void>();

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) { }

  ngOnInit() {
    this.userName$ = this.authService.userName$;
    this.userDesignation$ = this.authService.userDesignation$;

    this.authService.EmployeeID$.subscribe({
      next: (empId) => {
        if (empId && empId !== 'N/A') {
          this.currentEmpId = empId;
          this.loadEmployeeProjects(empId);
        }
      },
    });
  }

  loadEmployeeProjects(empId: string) {
    this.authService.getProjects(empId).subscribe({
      next: (data) => {
        this.projectsList = data;
        this.cdr.detectChanges();
      }
    });
  }

  navigateToTrackingSheet() {
    if (this.selectedProjectId === 0 || !this.selectedProjectId) {
      this.showWarningAlert("Please Select Project");
      return;
    }

    if (!this.fromDate) {
      this.showWarningAlert("Please Select From Date");
      return;
    }

    if (!this.toDate) {
      this.showWarningAlert("Please Select To Date");
      return;
    }

    const selectedProjObj = this.projectsList.find(p => p.projectId == this.selectedProjectId);
    const projName = selectedProjObj ? selectedProjObj.projectName : '';

    this.authService.getTrackingSheetData(this.selectedProjectId, this.currentEmpId, this.fromDate, this.toDate).subscribe({
      next: (apiResponse) => {
        this.onProceed.emit();

        this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
          this.router.navigate(['/dashboard/tracking-sheet'], {
            state: {
              projectId: this.selectedProjectId,
              trackingData: apiResponse,
              projectName: projName,
              fromDate: this.fromDate,
              toDate: this.toDate
            }
          });
        });
      },
      error: (err: any) => {
        Swal.fire({
          title: 'Error!',
          text: 'error throw',
          icon: 'error',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  showWarningAlert(message: string) {
    Swal.fire({
      title: 'Validation Error',
      text: message,
      icon: 'warning',
      confirmButtonColor: '#297a19',
      background: '#ffffff',
      customClass: {
        popup: 'animated fadeInDown'
      }
    });
  }
  // Type kartana direct auto-select hoû naye mhanun hi method help karel
onKeydown(event: KeyboardEvent) {
  // Jo key press kela ahe tyanusar list madhe search karun custom logic deu shakta,
  // kiva native browser behavior la handle karu shakta.
}
}