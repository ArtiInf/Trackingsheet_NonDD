import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/login.service';

@Component({
  selector: 'app-feedback-process',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './FeedbackProcess.component.html',
  styleUrls: ['./FeedbackProcess.component.css']
})
export class FeedbackProcess {
  @Input() projectId: any;
  @Input() orderNumber: any;
  @Input() processName: any;          
  @Input() previousProcessName: any;
  @Input() currentRowIndex: number = 0;
  @Input() empId: any; 
  @Input() projectName: any;
  @Input() orderDate: any;
  @Input() pqa: any;
  @Input() empcode: any; 
  private _processId: number = 0;
@Input() 
  get processId(): number {
    return this._processId;
  }
  set processId(value: number) {
    this._processId = value;
    console.log('Received updated processId in child:', value);
  }  errorType: string = '';
  criticality: string = '';
  feedbackType: string = '';
  errorField: string = '';
  feedbackReceivedDate: string = '';
  errorDescription: string = '';  
  shouldBe: string = '';          
  remark: string = '';            
  maxDate: string = new Date().toISOString().split('T')[0]; 
  @Output() feedbackSubmitted = new EventEmitter<any>();
  @Output() closePopupEvent = new EventEmitter<any>(); 

constructor(private http: HttpClient,private authService: AuthService) {} // Inject HttpClient

  ngOnInit(): void {
    this.fetchProjectProcessId();
  }

fetchProjectProcessId(): void {
    if (this.projectId && this.previousProcessName) {

      const url = `${this.authService.baseUrl}/TrackingSheet/getProjectProcessId?projectId=${this.projectId}&processName=${this.previousProcessName}`;
      
      this.http.get<any>(url).subscribe({
        next: (response) => {
         this._processId = response.processId; 
          console.log('Fetched processId inside child:', this._processId);
        },
        error: (error) => {
          console.error('Error fetching process ID:', error);
        }
      });
    }
  }




  submitFeedback(): void {
    if (!this.errorDescription || this.errorDescription.trim() === '') {
      Swal.fire({
        icon: 'warning',
        title: 'Feedback Mandatory',
        text: 'Please enter the Error/Feedback description. It is mandatory!',
        confirmButtonText: 'OK',
        target: document.querySelector('.custom-modal-content') as HTMLElement
      });
      return;
    }

    const feedbackData = {
      projectId: this.projectId,
      empId: this.empId,
      projectName: this.projectName,
      orderDate: this.orderDate,
      orderNumber: this.orderNumber,
           processId: this._processId,

      processName: this.processName, 
      previousProcessName: this.previousProcessName,
    pqa: this.pqa,          
      empcode: this.empcode,
      rowIndex: this.currentRowIndex,
      errorType: this.errorType,
      criticality: this.criticality,
      feedbackType: this.feedbackType,
      errorField: this.errorField,
      feedbackReceivedDate: this.feedbackReceivedDate,
      feedback: this.errorDescription, 
      shouldBe: this.shouldBe,
      remark: this.remark
    };

    this.feedbackSubmitted.emit(feedbackData);
  }
}
