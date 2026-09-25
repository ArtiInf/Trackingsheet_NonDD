import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/login.service';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http'; 
@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './User.component.html',
  styleUrls: ['./User.component.css']
})
export class UsersComponent implements OnInit {
  userName$!: Observable<string | null>;
  userDesignation$!: Observable<string | null>;
  Code$!: Observable<string | null>;

  projectsList: any[] = [];
  currentEmpId: string = '';

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef, private http: HttpClient
  ) {

  }

  ngOnInit() {
    this.userName$ = this.authService.userName$;
    this.userDesignation$ = this.authService.userDesignation$;
        this.Code$ = this.authService.Code$;
    const localEmpId = localStorage.getItem('empId') || localStorage.getItem('EmployeeID');

    if (localEmpId && localEmpId !== 'N/A') {
      this.currentEmpId = localEmpId;
      this.loadEmployeeProjects(localEmpId);
    }
    this.authService.EmployeeID$.subscribe({
      next: (empId) => {
        if (empId && empId !== 'N/A' && empId !== this.currentEmpId) {
          this.currentEmpId = empId;
          this.loadEmployeeProjects(empId);
         this.authService.Code$.subscribe((code) => {
            this.loadOrderDetails(empId, code || '');
          });

        }
      },
    });
  }
  loadEmployeeProjects(empId: string) {
    this.authService.getProjects(empId).subscribe({
      next: (data) => {
        this.projectsList = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Error fetching projects", err);
      }
    });
  }
feedbackList: any[] = [];
orderCounts = { total: 0, pending: 0, complete: 0 };

loadOrderDetails(empId: string, code: string) {
  const apiUrl = `${this.authService.baseUrl}/TrackingSheet/GetProjectWiseOrdersDetails?empId=${empId}&code=${code}`;
  this.http.get<any>(apiUrl).subscribe({
    next: (data) => {
      if (data.success && data.count) {
        this.orderCounts = {
          total: data.count.total || 0,
          pending: data.count.pending || 0,
          complete: data.count.complete || 0
        };
       this.feedbackList = data.count.feedbacks || [];  
        this.cdr.detectChanges();     
      }
    },
    error: (err) => console.error("Error fetching details:", err)
  });
}
}