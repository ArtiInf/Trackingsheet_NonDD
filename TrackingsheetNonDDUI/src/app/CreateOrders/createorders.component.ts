import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/login.service';
import { OrderService } from '../services/order.service';
import { HttpClientModule } from '@angular/common/http';
import Swal from 'sweetalert2';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HttpClientModule],
  templateUrl: './createorders.component.html',
  styleUrls: ['./createorders.component.css']
})
export class CreateOrder implements OnInit {

  activeTab: string = 'single';
  isDragging: boolean = false;
  projectsList: any[] = [];
  currentEmpId: string = '';
  currentusercode: string = '';

  maxDate: string = new Date().toISOString().split('T')[0];

  singleOrder = {
    projectId: '',
    orderDate: '',
    orderNo: '',
    files: [] as File[]
  };

  bulkOrder = {
    projectId: '',
    projectName: '',
    orderDate: '',
    files: [] as File[]
  };

  existingOrders: any[] = [];

  constructor(
    private authService: AuthService,
    private orderService: OrderService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    const localEmpId = localStorage.getItem('EmployeeID');
    const localCode = localStorage.getItem('Code');

    if (localEmpId) this.currentEmpId = localEmpId;
    if (localCode) this.currentusercode = localCode;

    this.authService.EmployeeID$.subscribe({
      next: (empId) => {
        if (empId && empId !== 'N/A') {
          this.currentEmpId = empId;
          this.loadEmployeeProjects(empId);
        }
      },
    });

    this.authService.Code$.subscribe({
      next: (code) => {
        if (code && code !== 'N/A') {
          this.currentusercode = code;
          this.cdr.detectChanges();
        }
      },
    });
  }

  loadEmployeeProjects(empId: string) {
    this.authService.getProjects(empId).subscribe({
      next: (data) => {
        console.log('Orders Page - API data:', data);
        this.projectsList = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('error', err);
      }
    });
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave() {
    this.isDragging = false;
  }

  onDrop(event: DragEvent, type: 'single' | 'bulk') {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer) {
      if (type === 'bulk' && event.dataTransfer.items) {
        this.bulkOrder.files = [];
        this.parseDroppedItems(event.dataTransfer.items);
      } else if (event.dataTransfer.files.length > 0) {
        this.handleMultipleFiles(event.dataTransfer.files, type);
      }
    }
  }

  async parseDroppedItems(items: DataTransferItemList) {
    const filePromises: Promise<File>[] = [];

    const traverseFileTree = (item: any) => {
      return new Promise<void>((resolve) => {
        if (item.isFile) {
          item.file((file: File) => {
            const fileExtension = file.name.split('.').pop()?.toLowerCase();
            if (!file.name.startsWith('.') && file.name !== 'Thumbs.db' && fileExtension === 'zip') {
              this.bulkOrder.files.push(file);
            }
            resolve();
          });
        } else if (item.isDirectory) {
          const dirReader = item.createReader();
          const readEntries = () => {
            dirReader.readEntries((entries: any[]) => {
              if (entries.length === 0) {
                resolve();
              } else {
                const promises = entries.map(entry => traverseFileTree(entry));
                Promise.all(promises).then(() => readEntries());
              }
            });
          };
          readEntries();
        } else {
          resolve();
        }
      });
    };

    const traversePromises = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i].webkitGetAsEntry();
      if (item) {
        traversePromises.push(traverseFileTree(item));
      }
    }

    await Promise.all(traversePromises);

    if (this.bulkOrder.files.length === 0) {
      this.showValidationError('Dropped folder does not contain any valid .zip files.');
    }

    this.cdr.detectChanges();
  }

  onFileSelected(event: any, type: 'single' | 'bulk') {
    if (event.target.files && event.target.files.length > 0) {
      this.handleMultipleFiles(event.target.files, type);
    }
  }

  handleMultipleFiles(fileList: FileList, type: 'single' | 'bulk') {
    if (type === 'single') {
      this.singleOrder.files = [];
    } else if (type === 'bulk') {
      this.bulkOrder.files = [];
    }

    const targetArray = type === 'single' ? this.singleOrder.files : this.bulkOrder.files;
    const orderNo = type === 'single' ? this.singleOrder.orderNo : '';
    const limit = type === 'single' ? Math.min(1, fileList.length) : fileList.length;

    for (let i = 0; i < limit; i++) {
      const file = fileList[i];
      if (!file) continue;
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (file.name.startsWith('.') || file.name === 'Thumbs.db') {
        continue;
      }

      if (type === 'single') {

        if (orderNo.trim()) {
          const fileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
          if (fileNameWithoutExt !== orderNo.trim()) {
            this.showValidationError(`File name should be same as Order# Please Verify`);
            this.resetFileInputs();
            return;
          }
        }
        targetArray.push(file);
      }

      else if (type === 'bulk') {
        if (fileExtension === 'zip') {
          targetArray.push(file);
        }
      }
    }

    if (type === 'bulk' && this.bulkOrder.files.length === 0) {
      this.showValidationError('Dropped folder/files do not contain any valid .zip files.');
    }

    this.resetFileInputs();
    this.cdr.detectChanges();
  }

  resetFileInputs() {
    const singleInput = document.getElementById('fileInputSingle') as HTMLInputElement;
    const bulkInput = document.getElementById('fileInputBulk') as HTMLInputElement;
    if (singleInput) singleInput.value = '';
    if (bulkInput) bulkInput.value = '';
  }

  validateAndSaveSingle() {
    if (!this.singleOrder.projectId) {
      this.showValidationError('Please select a Project Name.');
      return;
    }

    if (this.singleOrder.orderDate > this.maxDate) {
      this.showValidationError('Future dates are not allowed for Order Date.');
      return;
    }
    if (!this.singleOrder.orderDate) {
      this.showValidationError('Please select an Order Date.');
      return;
    }
    if (!this.singleOrder.orderNo || !this.singleOrder.orderNo.trim()) {
      this.showValidationError('Please enter an Order Number.');
      return;
    }
    if (this.singleOrder.files.length === 0) {
      this.showValidationError('Please attach a valid  document matching the Order Number.');
      return;
    }

    const file = this.singleOrder.files[0];
    const fileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
    if (fileNameWithoutExt !== this.singleOrder.orderNo.trim()) {
      this.showValidationError('File name should be same as Order# Please Verify');
      return;
    }

    this.saveSingleOrder();
  }

  saveSingleOrder() {
    const formData = new FormData();

    formData.append('strProejctId', this.singleOrder.projectId);
    formData.append('txtOrderNo', this.singleOrder.orderNo.trim());
    formData.append('dEFromDate', this.singleOrder.orderDate);

    const empId = this.currentEmpId || localStorage.getItem('EmployeeID') || '0';
    const usercode = this.currentusercode || localStorage.getItem('Code') || '0';

    formData.append('username', usercode);
    formData.append('employeeId', empId);

    if (this.singleOrder.files.length > 0) {
      formData.append('uploadFile', this.singleOrder.files[0]);
    }

    this.orderService.saveOrder(formData).subscribe({
      next: (response) => {
        Swal.fire({
          icon: 'success',
          title: 'Saved Successfully!',
          text: `Single Order registered.`,
          confirmButtonColor: '#297a19'
        });
        this.resetSingleForm();
      },
error: (err) => {
  let exactError = '';

  if (err.error instanceof ErrorEvent) {
    exactError = `Client Error: ${err.error.message}`;
  } else {
    exactError = `Status: ${err.status} | Text: ${err.statusText} | Message: ${err.message} | Server Response: ${JSON.stringify(err.error)}`;
  }

  Swal.fire({
    icon: 'error',
    title: 'Error',
    text: exactError,
    confirmButtonColor: '#d33'
  });
}
    });
  }

  onFolderSelected(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.bulkOrder.files = [];
      const filesList: FileList = event.target.files;

      for (let i = 0; i < filesList.length; i++) {
        const file = filesList[i];
        const fileExtension = file.name.split('.').pop()?.toLowerCase();

        if (file.name.startsWith('.') || file.name === 'Thumbs.db') {
          continue;
        }

        if (fileExtension === 'zip') {
          this.bulkOrder.files.push(file);
        }
      }

      if (this.bulkOrder.files.length === 0) {
        this.showValidationError('Selected folder does not contain any valid .zip, .pdf, or .rar files.');
      }

      this.cdr.detectChanges();
    }
  }

  validateAndSaveBulk() {
    if (!this.bulkOrder.projectId) {
      this.showValidationError('Please select a Project Name.');
      return;
    }
    if (this.bulkOrder.orderDate > this.maxDate) {
      this.showValidationError('Future dates are not allowed for Order Date.');
      return;
    }

    if (!this.bulkOrder.orderDate) {
      this.showValidationError('Please select an Order Date.');
      return;
    }
    if (this.bulkOrder.files.length === 0) {
      this.showValidationError('Please select a folder that has valid files.');
      return;
    }

    this.saveBulkOrder();
  }

  async saveBulkOrder() {
    Swal.fire({
      title: 'Processing Orders...',
      text: 'Please wait while we process your folder...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const empId = this.currentEmpId || localStorage.getItem('EmployeeID') || '0';
    const usercode = this.currentusercode || localStorage.getItem('Code') || '0';

    let successCount = 0;
    let failCount = 0;
    let duplicateOrdersList: string[] = [];
    let processingError = '';

    for (const file of this.bulkOrder.files) {
      const orderNoFromFile = file.name.substring(0, file.name.lastIndexOf('.')).trim();

      const formData = new FormData();
      formData.append('strProejctId', this.bulkOrder.projectId);
      formData.append('txtOrderNo', orderNoFromFile);
      formData.append('dEFromDate', this.bulkOrder.orderDate);
      formData.append('username', usercode);
      formData.append('employeeId', empId);
      formData.append('uploadFile', file);

      try {
        await this.orderService.saveOrder(formData).toPromise();
        successCount++;
      } catch (err: any) {
        failCount++;

        if (err.status === 0) {
          processingError = 'CORS Error or Server Unreachable.';
        } else {
          const apiError = typeof err.error === 'string' ? err.error : (err.error?.message || '');

          if (apiError.toLowerCase().includes('exist') || apiError.toLowerCase().includes('check')) {
            duplicateOrdersList.push(orderNoFromFile);
          } else {
            processingError = apiError || 'Failed to process some orders.';
          }
        }
      }
    }

    Swal.close();

    if (failCount === 0) {
      Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: `All ${successCount} orders created successfully.`,
        confirmButtonColor: '#297a19'
      });
      this.resetBulkForm();
    }
    else if (duplicateOrdersList.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Orders Already Exist!',
        text: `Order Already Exists..!! Please Check.....`,
        confirmButtonColor: '#297a19'
      });
      this.resetBulkForm();
    }
    else {
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: processingError || 'Operation failed.',
        confirmButtonColor: '#d33'
      });
    }
  }


  resetSingleForm() {
    this.singleOrder = { projectId: '', orderDate: '', orderNo: '', files: [] };
    this.cdr.detectChanges();
  }

  resetBulkForm() {
    this.bulkOrder = { projectId: '', projectName: '', orderDate: '', files: [] };
    this.cdr.detectChanges();
  }

  showValidationError(message: string) {
    Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: message,
      confirmButtonColor: '#297a19'
    });
  }
}