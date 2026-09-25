import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

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

  errorType: string = '';
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
