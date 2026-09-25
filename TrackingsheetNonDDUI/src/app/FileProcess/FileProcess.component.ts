import { Component, Input, ChangeDetectorRef, Output, EventEmitter,ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { AuthService } from '../services/login.service';
@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './FileProcess.component.html',
  styleUrls: ['./FileProcess.component.css']
})
export class OrderTrackingComponent {
  private _projectId!: number;
  private _orderNumber!: string;
  currentEmpId: string = '';
  @Input() projectName: string = '';
  private _OrderDate!: string;

  @Input() uploadedFiles: Array<{ file: File, rowData: any, rowIndex: number, processKeyName: string }> = [];
  @Input() currentRowIndex: number = -1;

  @Output() fileSelected = new EventEmitter<{ file: File, rowData: any }>();
  @Output() fileUploadedSuccess = new EventEmitter<boolean>();

  private _pqaProcess: string = '';

  @Input()
  set pqaProcess(value: string) { this._pqaProcess = value; this.checkAndFetch(); }
  get pqaProcess(): string { return this._pqaProcess; }


  onFileSelected(event: any, row: any): void {
    const fileInput = event.target;
    const file: File = fileInput.files[0];

    if (!file) return;

    const previousDate = row.AddedDate || row.addedDate || row.addeddate || null;
    const previousFile = row.File || row.file || null;

    const selectedFileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    if (selectedFileNameWithoutExt.trim().toLowerCase() !== this.orderNumber.trim().toLowerCase()) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'File name should be same as Order# Please Verify',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
        target: document.querySelector('.custom-modal-content') as HTMLElement
      });
      fileInput.value = '';
      return;
    }

    const detectedProcess = row['Process Name'] || row['ProcessName'] || row['Process'] || row['processKeyName'] || '';
    row['Process Name'] = detectedProcess;

    this.fileSelected.emit({ file: file, rowData: row });

    setTimeout(() => {
      const popupProcessName = detectedProcess.toString().trim().toLowerCase();

      const isFileValid = this.uploadedFiles.some(f =>
        f.rowIndex === this.currentRowIndex &&
        f.file.name === file.name &&
        f.processKeyName.trim().toLowerCase() === popupProcessName
      );

      if (isFileValid) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}`;

        if ('AddedDate' in row) row.AddedDate = formattedDate;
        else if ('addedDate' in row) row.addedDate = formattedDate;
        else if ('addeddate' in row) row.addeddate = formattedDate;
        else row['AddedDate'] = formattedDate;

        row['File'] = file.name;
        row['isFromServer'] = false; 
      }
      else {
        fileInput.value = '';

        if ('AddedDate' in row) row.AddedDate = previousDate;
        else if ('addedDate' in row) row.addedDate = previousDate;
        else if ('addeddate' in row) row.addeddate = previousDate;

        if ('File' in row) row.File = previousFile;
        else if ('file' in row) row.file = previousFile;
      }

      this.cdr.detectChanges();
    }, 200);
  }

  @Input()
  set projectId(value: number) { this._projectId = value; this.checkAndFetch(); }
  get projectId(): number { return this._projectId; }

  @Input()
  set orderNumber(value: string) { this._orderNumber = value; this.checkAndFetch(); }
  get orderNumber(): string { return this._orderNumber; }

  @Input()
  set OrderDate(value: string) { this._OrderDate = value; this.checkAndFetch(); }
  get OrderDate(): string { return this._OrderDate; }

  packageDetails: any[] = [];
  columnHeaders: string[] = [];
  isLoading: boolean = false;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef,private authService: AuthService) { }

  private checkAndFetch(): void {
    if (this._projectId && this._orderNumber && this._pqaProcess) {
      this.fetchPackageDetails();
    }
  }
@ViewChild('firstUploadBtn') firstUploadBtn!: ElementRef<HTMLButtonElement>;

  private focusUploadButton(): void {
    setTimeout(() => {
      this.firstUploadBtn?.nativeElement?.focus();
    }, 150);
  }
  fetchPackageDetails(): void {
    this.isLoading = true;
    this.packageDetails = [];
    this.columnHeaders = [];
    this.cdr.detectChanges();

    const apiUrl = `${this.authService.baseUrl}/TrackingSheet/BindPackageDetails?projectId=${this.projectId}&orderNumber=${this.orderNumber}&pqaprocess=${this.pqaProcess}`;

    this.http.get<any[]>(apiUrl).subscribe({
      next: (response) => {
        const rawData = response || [];

        this.packageDetails = rawData.map(row => {
          const dateKey = 'AddedDate' in row ? 'AddedDate' :
            'addedDate' in row ? 'addedDate' :
              'addeddate' in row ? 'addeddate' : null;

          if (dateKey && row[dateKey]) {
            const dateObj = new Date(row[dateKey]);
            if (!isNaN(dateObj.getTime())) {
              const year = dateObj.getFullYear();
              const month = String(dateObj.getMonth() + 1).padStart(2, '0');
              const day = String(dateObj.getDate()).padStart(2, '0');
              const hours = String(dateObj.getHours()).padStart(2, '0');
              const minutes = String(dateObj.getMinutes()).padStart(2, '0');
              row[dateKey] = `${year}-${month}-${day} ${hours}:${minutes}`;
            }
          }

          const dbFile = row['File'] || row['file'];
          if (dbFile && dbFile.toString().trim() !== '' && dbFile.toString().trim() !== 'N/A') {
            row['isFromServer'] = true;
          } else {
            row['isFromServer'] = false;
          }

          const popupProcessName = (row['Process Name'] || row['ProcessName'] || row['Process'] || '').toString().trim().toLowerCase();
          const matchingMemoryFile = this.uploadedFiles.find(f =>
            f.rowIndex === this.currentRowIndex &&
            f.processKeyName.trim().toLowerCase() === popupProcessName
          );

          if (matchingMemoryFile) {
            row['File'] = matchingMemoryFile.file.name;
            row['isFromServer'] = false;
            const memDate = matchingMemoryFile.rowData.AddedDate || matchingMemoryFile.rowData.addedDate || matchingMemoryFile.rowData.addeddate;
            if (dateKey) {
              row[dateKey] = memDate;
            } else {
              row['AddedDate'] = memDate;
            }
          }

          return row;
        });

        if (this.packageDetails.length > 0) {
          this.columnHeaders = Object.keys(this.packageDetails[0]);
          const allKeys = Object.keys(this.packageDetails[0]);
          this.columnHeaders = allKeys.filter(key => key !== 'isFromServer');
        }

        this.isLoading = false;
        this.cdr.detectChanges();

        this.focusUploadButton();
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }
  downloadFile(row: any, File: string): void {
    if (!File) {
      return;
    }
    const popupProcessName = (row['Process Name'] || row['ProcessName'] || row['Process'] || '').toString().trim().toLowerCase();
    const matchingMemoryFile = this.uploadedFiles.find(f =>
      f.rowIndex === this.currentRowIndex &&
      f.processKeyName.trim().toLowerCase() === popupProcessName
    );

    if (matchingMemoryFile && matchingMemoryFile.file) {
      const blob = new Blob([matchingMemoryFile.file], { type: matchingMemoryFile.file.type });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = matchingMemoryFile.file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return;
    }
    const downloadUrl = `${this.authService.baseUrl}/TrackingSheet/DownloadFile?relativePath=${encodeURIComponent(File)}`;

    this.http.get(downloadUrl, { responseType: 'blob' }).subscribe({
      next: (blobData: Blob) => {
        const fileName = File.split('\\').pop() || File.split('/').pop() || 'downloaded_file';
        const blob = new Blob([blobData], { type: blobData.type });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();

        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      },
      error: (err) => {
        console.error("Download Error:", err);
        alert("erroe show ");
      }
    });
  }
}


