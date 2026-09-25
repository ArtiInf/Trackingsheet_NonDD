import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { OrderTrackingComponent } from '../FileProcess/FileProcess.component';
import Swal from 'sweetalert2';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';
import { FeedbackProcess } from '../FeedbackProcess/FeedbackProcess.component';
import { AuthService } from '../services/login.service';
@Component({
  selector: 'app-tracking-sheet',
  standalone: true,
  imports: [CommonModule, OrderTrackingComponent, FormsModule, FeedbackProcess],
  templateUrl: './TrackingSheet.component.html',
  styleUrls: ['./TrackingSheet.component.css']
})
export class TrackingSheetComponent implements OnInit, OnDestroy {
  projectId: number = 0;
  isOrderTrackingPopupOpen: boolean = false;
  selectedRowData: any = null;
  selectedFileToUpload: File | null = null;
  selectedFileRowIndex: number = -1;
  popupRowData: any = null;
  trackingData: any[] = [];
  dynamicColumns: any[] = [];
  objectKeys: string[] = [];
  selectedProjectName: string = '';
  selectedFromDate: string = '';
  selectedToDate: string = '';
  currentRowIndex: number = -1;
  isFileMenuOpen: boolean = false;
  reportFileMenuOpen: boolean = false;
  loggedInUserCode: string = '';
  isUploadRequired: boolean = false;
  isFileUploaded: boolean = false;
  currentEmpId: string = '';
  popupTriggerSource: 'name' | 'status' | null = null;
  uploadedFilesList: Array<{ file: File, rowData: any, rowIndex: number, processKeyName: string }> = [];
  isLoading: boolean = false;
  loadingMessage: string = 'Your data is updating...';
  isRefreshing: boolean = false;
  searchText: string = '';
  originalTrackingData: any[] = [];
  loggedInEmpId: string = '';
  currentFeedbackProcessName: string = '';
  isFeedbackPopupOpen: boolean = false;
  currentPreviousProcessName: string = '';
  currentFeedbackText: string = '';
  isProjectManager: boolean = false;
  projectUserCodes: string[] = [];
today = new Date().toISOString().split('T')[0];
  @ViewChild(FeedbackProcess) feedbackProcessComponent!: FeedbackProcess;
  @ViewChild('dropdownContainer') dropdownContainer!: ElementRef;
  private routerSubscription!: Subscription;


  constructor(private router: Router, private http: HttpClient, private cdr: ChangeDetectorRef, private authService: AuthService) {

    this.loadStateData();
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.loadStateData();
    });
  }
  ngAfterViewInit() {
    this.focusInput(false);
  }
  ngOnInit(): void {
    const empCode = localStorage.getItem('Code');
    console.log("employeecode", empCode);
    this.loggedInUserCode = empCode || '';
    const EmployeeId = localStorage.getItem('EmployeeID') || '0';
    this.loggedInEmpId = EmployeeId || '';

    this.authService.isProjectManager$.subscribe(isPm => {
      this.isProjectManager = isPm;
      console.log('isProjectManager:', this.isProjectManager);
    });


    if (this.projectId > 0) {
      this.fetchUserCode(this.projectId);
    }
  }
  @HostListener('document:click', ['$event'])

  clickout(event: Event): void {
    if (this.dropdownContainer && !this.dropdownContainer.nativeElement.contains(event.target)) {
      this.isFileMenuOpen = false;
    }
  }

  private loadStateData(): void {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.parseTrackingSheetData(navigation.extras.state);
    } else if (history.state && history.state.trackingData) {
      this.parseTrackingSheetData(history.state);
    } else {
      const savedState = localStorage.getItem('cached_tracking_state');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        this.parseTrackingSheetData(parsedState);
      }
    }
  }
  checkPqaKeyboard(event: KeyboardEvent, rowData: any): void {
    const pqaProcessValue = rowData['PQA Process'] || rowData['pqa_process'];
    if (!pqaProcessValue || pqaProcessValue.trim() === '') {
      if (event.key !== 'Tab') {
        event.preventDefault();
        this.showPqaErrorAlert();
      }
    }
  }
  onFileSelectedForUpload(eventData: { file: File, rowData: any }): void {
    let fileProcessName = '';
    if (eventData && eventData.rowData) {
      fileProcessName = eventData.rowData['Process Name'] ||
        eventData.rowData['ProcessName'] ||
        eventData.rowData['Process'] ||
        eventData.rowData['processKeyName'] || '';
    }

    const savedRowIndex = this.currentRowIndex;
    let activePrefix = '';

    if (savedRowIndex !== -1 && this.trackingData[savedRowIndex]) {
      const currentRow = this.trackingData[savedRowIndex];

      if (currentRow['Disp'] && currentRow['Disp'].toString().trim() !== '') {
        activePrefix = 'Disp';
      } else if (currentRow['YQA'] && currentRow['YQA'].toString().trim() !== '') {
        activePrefix = 'YQA';
      } else {
        activePrefix = 'PQA';
      }
    } else {
      activePrefix = 'PQA';
    }

    console.log('Active Process Prefix:', activePrefix);
    console.log('File Process Name:', fileProcessName);
    console.log('Popup Trigger Source:', this.popupTriggerSource);
    const isPqaStatusValidation = (activePrefix === 'PQA' && this.popupTriggerSource === 'status');
    const isOtherProcessValidation = (activePrefix !== 'PQA');

    if ((isPqaStatusValidation || isOtherProcessValidation) &&
      fileProcessName && fileProcessName.trim().toUpperCase() !== activePrefix.toUpperCase()) {

      Swal.fire({
        icon: 'error',
        title: 'Invalid Process File',
        text: `Please upload the required file for '${activePrefix}' process! The selected file belongs to '${fileProcessName}'.`,
        confirmButtonColor: '#d33',
        target: (document.querySelector('.custom-modal-content') as HTMLElement) || 'body'
      });

      this.isFileUploaded = false;
      return;
    }

    this.isFileUploaded = true;
    const processKeyName = fileProcessName ? fileProcessName : activePrefix;

    const existingFileIndex = this.uploadedFilesList.findIndex(f =>
      f.rowIndex === this.currentRowIndex &&
      f.processKeyName.trim().toLowerCase() === processKeyName.trim().toLowerCase()
    );

    if (existingFileIndex > -1) {
      this.uploadedFilesList[existingFileIndex].file = eventData.file;
      this.uploadedFilesList[existingFileIndex].rowData = eventData.rowData;
      this.uploadedFilesList[existingFileIndex].processKeyName = processKeyName;
    } else {
      this.uploadedFilesList.push({
        file: eventData.file,
        rowData: eventData.rowData,
        rowIndex: this.currentRowIndex,
        processKeyName: processKeyName
      });
    }

    Swal.fire({
      icon: 'success',
      title: 'Success!',
      text: `File selected successfully for ${processKeyName}.`,
      confirmButtonColor: '#3085d6',
      confirmButtonText: 'OK',
      target: (document.querySelector('.custom-modal-content') as HTMLElement) || 'body'
    }).then((result) => {
      if (result.isConfirmed) {
        const triggerSource = this.popupTriggerSource;

        this.closeOrderTrackingPopup();
        if (triggerSource === 'status') {
          Swal.fire({
            title: 'Confirmation',
            text: 'Do you want to save record?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes',
            cancelButtonText: 'No'
          }).then((confirmResult) => {
            if (confirmResult.isConfirmed) {
              this.saveOrUpdateRow(savedRowIndex);
            }
          });
        }
      }
    });
  }
  checkProcessKeyboard(event: KeyboardEvent, rowData: any): void {
    if (event.key !== 'Tab') {
      const pqaProcessValue = rowData['PQA Process'] || rowData['pqa_process'];
      if (!pqaProcessValue || pqaProcessValue.trim() === '') {
        event.preventDefault();
        this.showPqaErrorAlert();
      }
    }
  }

  checkProcessClick(event: MouseEvent, rowData: any): void {
    
    const pqaProcessValue = rowData['PQA Process'] || rowData['pqa_process'];
    if (!pqaProcessValue || pqaProcessValue.trim() === '') {
      event.preventDefault();
      this.showPqaErrorAlert();
    }

    
  }

  onProcessChange(event: any, rowIndex: number, key: string, rowData: any): void {
    const pqaProcessValue = rowData['PQA Process'] || rowData['pqa_process'];
    if (!pqaProcessValue || pqaProcessValue.trim() === '') {
      event.target.value = this.loggedInUserCode;
      this.showPqaErrorAlert();
      return;
    }
    this.updateSelectValue(event, rowIndex, key);
    this.onProcessBlur(key, rowData);
  }

  onProcessBlur(columnKey: string, rowData: any): void {
    const lowerKey = columnKey.toLowerCase();
    if (lowerKey === 'pqa' || lowerKey === 'yqa' || lowerKey === 'disp') {
      const rowIndex = this.trackingData.indexOf(rowData);
      const pqaProcessValue = rowData['PQA Process'] || rowData['pqa_process'];
      if (!pqaProcessValue || pqaProcessValue.trim() === '') {
        rowData[columnKey] = this.loggedInUserCode;
        return;
      }
      const cellValue = rowData[columnKey];
      const prefix = columnKey === 'PQA' ? 'PQA' : (columnKey === 'YQA' ? 'YQA' : 'Disp');
      const isDateAlreadySet = rowData[`${prefix} Assigned Datetime`] || rowData[`${prefix} Start Datetime`];
      if (isDateAlreadySet) {
        return;
      }
      if (cellValue && cellValue.toString().trim() !== '') {
        this.selectedRowData = rowData;
        this.currentRowIndex = rowIndex;
        this.popupTriggerSource = 'name';
        this.isOrderTrackingPopupOpen = true;
      }
    }
  }

  onPqaChange(event: any, rowIndex: number, key: string, rowData: any): void {
    const pqaProcessValue = rowData['PQA Process'] || rowData['pqa_process'];
    if (!pqaProcessValue || pqaProcessValue.trim() === '') {
      event.target.value = this.loggedInUserCode;
      this.showPqaErrorAlert();
      return;
    }
    this.updateSelectValue(event, rowIndex, key);
    this.onPqaBlur(key, rowData);
  }

  showPqaErrorAlert(): void {
    Swal.fire({
      icon: 'warning',
      title: 'Error',
      text: "Please Check PQA Process...It Should Be 'PQA' or 'SPQA'",
      confirmButtonColor: '#3085d6',
      confirmButtonText: 'OK'
    });
  }
  onPqaClick(columnKey: string, rowData: any): void {
    if (columnKey && columnKey.toLowerCase() === 'pqa') {
      const orderNo = this.getOrderNumber(rowData);
      console.log("New Row Order Number:", orderNo);
      if (!orderNo || orderNo.toString().trim() === '') {
        Swal.fire({
          icon: 'warning',
          title: 'Validation Error',
          text: 'Please enter Order Number first!',
          confirmButtonColor: '#3085d6'
        });
        return;
      }
      this.selectedRowData = rowData;
      this.currentRowIndex = this.trackingData.indexOf(rowData);
      this.isOrderTrackingPopupOpen = true;
    }
  }

  onPqaBlur(columnKey: string, rowData: any): void {
    if (columnKey && columnKey.toLowerCase() === 'pqa') {
      const rowIndex = this.trackingData.indexOf(rowData);
      const pqaProcessValue = rowData['PQA Process'] || rowData['pqa_process'];
      if (!pqaProcessValue || pqaProcessValue.trim() === '') {
        rowData[columnKey] = this.loggedInUserCode;
        return;
      }
      const pqaValue = rowData[columnKey];
      const isDateAlreadySet = rowData['PQA Assigned Datetime'] || rowData['PQA Start Datetime'];
      if (isDateAlreadySet) {
        return;
      }
      if (pqaValue && pqaValue.toString().trim() !== '') {
        this.selectedRowData = rowData;
        this.currentRowIndex = rowIndex;
        this.isOrderTrackingPopupOpen = true;
      }
    }
  }

  checkPqaClick(event: MouseEvent, rowData: any): void {
    const pqaProcessValue = rowData['PQA Process'] || rowData['pqa_process'];
    if (!pqaProcessValue || pqaProcessValue.trim() === '') {
      event.preventDefault();
      Swal.fire({
        icon: 'warning',
        title: 'Error',
        text: "Please Check PQA Process...It Should Be 'PQA' or 'SPQA'",
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK'
      });
    }
  }

  getOrderNumber(rowData: any): string {
    if (!rowData) return '';
    return rowData['Order Number'] || rowData['orderNumber'] || rowData['OrderNo'] || rowData['order_no'] || rowData['Order#'] || '';
  }

  getOrderDate(rowData: any): string {
    if (!rowData) return '';
    return rowData['Order Date'];
  }

  closeOrderTrackingPopup(): void {
    const savedRowIndex = this.currentRowIndex;
    let activePrefix = 'PQA';

    if (savedRowIndex !== -1 && this.trackingData[savedRowIndex]) {
      const currentRow = this.trackingData[savedRowIndex];
      if (currentRow['Disp'] && currentRow['Disp'].toString().trim() !== '') {
        activePrefix = 'Disp';
      } else if (currentRow['YQA'] && currentRow['YQA'].toString().trim() !== '') {
        activePrefix = 'YQA';
      } else {
        activePrefix = 'PQA';
      }
    }

    const isUploadMandatory = this.isUploadRequired && (this.popupTriggerSource === 'status' || activePrefix !== 'PQA');
    const isFileCorrectlyUploaded = this.uploadedFilesList.some(f =>
      f.rowIndex === savedRowIndex &&
      f.processKeyName.trim().toUpperCase() === activePrefix.toUpperCase()
    );

    if (isUploadMandatory && !isFileCorrectlyUploaded) {
      Swal.fire({
        icon: 'error',
        title: 'Action Required',
        text: `Please upload the required file for ${activePrefix} before closing!`,
        confirmButtonColor: '#d33',
        target: document.querySelector('.custom-modal-content') as HTMLElement
      });
      return;
    }

    this.isOrderTrackingPopupOpen = false;

    if (savedRowIndex !== -1 && this.trackingData[savedRowIndex]) {
      const currentRow = this.trackingData[savedRowIndex];
      const currentDateTime = this.getCurrentDateTimeString();

      if (this.isUploadRequired) {
        currentRow[`${activePrefix} End Datetime`] = currentDateTime;
        this.calculateProcessTAT(savedRowIndex, activePrefix);
      }

      if (this.popupTriggerSource === 'name') {
        const selectedUserCode = (currentRow[activePrefix] || '').toString().trim();
        const currentLoggedInUser = (this.loggedInUserCode || '').toString().trim();
        const isPmAssigningToOther = this.isProjectManager && (selectedUserCode !== currentLoggedInUser);
        if (!currentRow[`${activePrefix} Assigned Datetime`]) {
          currentRow[`${activePrefix} Assigned Datetime`] = currentDateTime;
        }
        if (!isPmAssigningToOther) {
          if (!currentRow[`${activePrefix} Start Datetime`]) {
            currentRow[`${activePrefix} Start Datetime`] = currentDateTime;
          }
        } else {
          currentRow[`${activePrefix} Start Datetime`] = '';
        }
      }
      const currentTriggerSource = this.popupTriggerSource;
      this.popupTriggerSource = null;
      setTimeout(() => {
        let targetElement: HTMLElement | null = null;

        if (currentTriggerSource === 'name') {
          const idKey = `${activePrefix.toLowerCase()}-status-${savedRowIndex}`;
          targetElement = document.getElementById(idKey);
        } else if (currentTriggerSource === 'status') {
          if (activePrefix === 'PQA') {
            targetElement = document.getElementById(`yqa-${savedRowIndex}`);
          } else if (activePrefix === 'YQA') {
            targetElement = document.getElementById(`disp-${savedRowIndex}`);
          } else if (activePrefix === 'Disp') {
            targetElement = document.getElementById(`disp-${savedRowIndex}`);
          }
        }

        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
          if (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLSelectElement) {
            targetElement.focus();
            targetElement.scrollLeft = 0;
          }
        }
      }, 250);
    }

    this.isUploadRequired = false;
    this.isFileUploaded = false;
    this.selectedRowData = null;
    this.currentRowIndex = -1;
  }

  private parseTrackingSheetData(state: any): void {
    this.projectId = state['projectId'] || 0;
    if (this.isProjectManager && this.projectId > 0) {
      this.fetchUserCode(this.projectId);
    }

    this.selectedProjectName = state['projectName'] || '';
    this.selectedFromDate = state['fromDate'] || '';
    this.selectedToDate = state['toDate'] || '';
    const responseData = state['trackingData'];

    if (responseData && responseData.columns) {
      localStorage.setItem('cached_tracking_state', JSON.stringify(state));
      this.dynamicColumns = responseData.columns.map((item: any) => {
        let options: string[] = [];
        if (item.OptionsText) {
          options = item.OptionsText.trim()
            .split(/\s{2,}/)
            .map((opt: string) => opt.trim())
            .filter((opt: string) => opt !== "");
        }
        return {
          fieldConfigId: item.FieldConfigId || item.fieldConfigId,
          key: item.FieldName,
          label: item.FieldName,
          dataType: item.DataType ? item.DataType.toLowerCase() : 'string',
          options: options,
          isRequired: item.IsRequired === true || item.isRequired === true || item.IsRequired === 1 || item.IsRequired === 'true'
        };
      });
      this.objectKeys = this.dynamicColumns.map(col => col.key);
      this.trackingData = (responseData.data || responseData || []).map((row: any) => {
        if (row['PQA'] === null || row['PQA'] === undefined || row['PQA'].toString().trim() === '') {
          row['PQA'] = '';
        }
        return row;
      });
    } else {
      this.dynamicColumns = [];
      this.trackingData = [];
      this.objectKeys = [];
    }
    this.originalTrackingData = [...this.trackingData];
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  addRow(): void {
    if (this.objectKeys.length === 0) return;

    const inprocessRow = this.trackingData.find(row => {
      const pqaStatus = (row['PQA Status'] || row['pqa_status'] || '').trim().toLowerCase();
      const yqaStatus = (row['YQA Status'] || row['yqa_status'] || '').trim().toLowerCase();
      const dispStatus = (row['Disp Status'] || row['disp_status'] || '').trim().toLowerCase();

      const pqaAssignedUser = (row['PQA'] || '').toString().trim().toLowerCase();
      const yqaAssignedUser = (row['YQA'] || '').toString().trim().toLowerCase();
      const dispAssignedUser = (row['Disp'] || row['disp'] || '').toString().trim().toLowerCase();

      const currentUser = this.loggedInUserCode
        .toString()
        .trim()
        .toLowerCase();
      const isYqaActiveForMe = (
        (yqaStatus === 'in progress' || yqaStatus === 'inprocess' || yqaStatus === 'pending') &&
        yqaAssignedUser === currentUser
      );

      const isDispActiveForMe = (
        (dispStatus === 'in progress' || dispStatus === 'inprocess' || dispStatus === 'pending') &&
        dispAssignedUser === currentUser
      );
      const isPqaActiveForMe = (
        (pqaStatus === 'in progress' || pqaStatus === 'inprocess' || pqaStatus === 'pending') &&
        pqaAssignedUser === currentUser
      );

      return isPqaActiveForMe || isYqaActiveForMe || isDispActiveForMe;
    });
    const modifiedRowIndex = this.trackingData.findIndex(row => row.isModify);
    if (modifiedRowIndex !== -1) {
      const modifiedRow = this.trackingData[modifiedRowIndex];
      const modifiedOrderNo = this.getOrderNumber(modifiedRow) || 'Unknown';
      const columnName = modifiedRow.modifiedColumn || 'Unknown Column';
      Swal.fire({
        icon: 'warning',
        title: 'Unsaved Changes Found',
        text: `Order Number '${modifiedOrderNo}' has changes in column '${columnName}' which are not saved. Please save the changes before creating a new order.`,
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
        returnFocus: false
      }).then(() => {
        setTimeout(() => {
          const orderColumn = this.dynamicColumns.find(col =>
            col.key.toLowerCase() === 'order number' ||
            col.key.toLowerCase() === 'order#'
          );

          if (orderColumn) {
            const elementId = orderColumn.key
              .replace(/ /g, '-')
              .toLowerCase() + '-' + modifiedRowIndex;
            const targetElement = document.getElementById(elementId) as HTMLElement;
            if (targetElement) {
              targetElement.focus();
              if (targetElement instanceof HTMLInputElement) {
                targetElement.select();
              }
            }
          }
        }, 150);
      });
      return;
    }

    if (inprocessRow) {
      const restrictedOrderNo =
        this.getOrderNumber(inprocessRow) || 'Unknown';


      Swal.fire({
        icon: 'warning',
        title: 'Action Restricted',
        text: `Order Number '${restrictedOrderNo}' is currently In Progress by you. Please complete this process before creating a new order.`,
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'OK',
        returnFocus: false
      }).then(() => {

        const rowIndex = this.trackingData.indexOf(inprocessRow);

        setTimeout(() => {
          const firstInput = document
            .querySelectorAll('.feedback-table tbody tr')[rowIndex]
            ?.querySelector('input') as HTMLElement;

          firstInput?.focus();

        }, 150);

      });

      return;
    }
    const newRow: any = { isNew: true, RowId: 0 };
    this.dynamicColumns.forEach((col) => {
      newRow[col.key] = '';
    });
    this.trackingData = [...this.trackingData, newRow];

    this.focusInput(true);
  }

  focusInput(isNewRow: boolean = false) {
    setTimeout(() => {
      let selector = '.feedback-table tbody tr:first-child td .table-input';

      if (isNewRow) {
        selector = '.feedback-table tbody tr:last-child td .table-input';
      }

      const inputEl = document.querySelector(selector) as HTMLElement;
      if (inputEl) {
        inputEl.focus();
        inputEl.scrollLeft = 0;
      }
    }, 100);
  }

  setDefaultDate(event: any, rowIndex: number, col: any): void {
    if (this.trackingData[rowIndex][col.key]) return;
    if (col.dataType === 'date') {
      this.trackingData[rowIndex][col.key] = this.getTodayDate();
    }
    else if (col.dataType === 'datetime') {
      const today = new Date();
      const hours = String(today.getHours()).padStart(2, '0');
      const minutes = String(today.getMinutes()).padStart(2, '0');
      this.trackingData[rowIndex][col.key] = `${this.getTodayDate()} ${hours}:${minutes}`;
    }
  }

  updateSelectValue(event: any, rowIndex: number, key: string): void {

    const newValue = event.target.value;
    const currentRow = this.trackingData[rowIndex];
    currentRow.isModify = true;
    currentRow.modifiedColumn = key;
    const lowerKey = key.toLowerCase();
    if (key.toLowerCase() === 'pqa process' || key.toLowerCase() === 'pqa_process') {
      const orderNo = this.getOrderNumber(currentRow);
      if (!orderNo || orderNo.toString().trim() === '') {
        event.target.value = '';
        this.trackingData[rowIndex][key] = '';
        this.showOrderNumberRequiredAlert();
        return;
      }
    }

    if (['pqa', 'yqa', 'disp'].includes(lowerKey) && newValue !== '') {
      const pqaUser = currentRow['PQA'] || '';
      const yqaUser = currentRow['YQA'] || '';
      const dispUser = currentRow['Disp'] || '';

      if (
        (lowerKey !== 'pqa' && pqaUser === newValue) ||
        (lowerKey !== 'yqa' && yqaUser === newValue) ||
        (lowerKey !== 'disp' && dispUser === newValue)
      ) {
        event.target.value = '';
        this.trackingData[rowIndex][key] = '';

        Swal.fire({
          icon: 'warning',
          title: 'Process Restriction',
          text: 'A user cannot handle multiple processes for the same order. Please assign a different user',
          confirmButtonColor: '#3085d6',
          confirmButtonText: 'OK'
        });
        return;
      }
    }
    if (key.toLowerCase() === 'pqa' && newValue !== '') {
      const pqaProcessValue = this.trackingData[rowIndex]['PQA Process'] || this.trackingData[rowIndex]['pqa_process'];
      if (!pqaProcessValue || pqaProcessValue.trim() === '') {
        event.target.value = this.loggedInUserCode;
        return;
      }
    }
    this.trackingData[rowIndex][key] = newValue;
    console.log('Updated Data:', this.trackingData);
  }

  showOrderNumberRequiredAlert(): void {
    Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Please enter Order Number first before selecting PQA Process!',
      confirmButtonColor: '#3085d6',
      confirmButtonText: 'OK'
    });
  }

  updateDateTimeValue(event: any, rowIndex: number, key: string): void {
    const selectedDate = event.target.value;
    if (selectedDate) {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const finalDateTime = `${selectedDate} ${hours}:${minutes}`;
      this.trackingData[rowIndex][key] = finalDateTime;
    } else {
      this.trackingData[rowIndex][key] = '';
    }
    console.log('Updated DateTime Data:', this.trackingData);
  }

  convertToDateTimeLocal(value: string): string {
    if (!value) return '';
    return value.replace(' ', 'T');
  }

  goBack(event: Event): void {
    event.preventDefault();
    const hasUnsavedChanges = this.trackingData.some(row => row.isNew || row.isModify);

    if (hasUnsavedChanges) {
      Swal.fire({
        title: 'Unsaved Changes',
        text: 'You have unsaved changes. Do you want to save them before going back?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes',
        cancelButtonText: 'No'
      }).then((result) => {
        if (result.isConfirmed) {
          const dirtyRowIndex = this.trackingData.findIndex(row => row.isNew || row.isModify);
          if (dirtyRowIndex !== -1) {
            this.saveOrUpdateRow(dirtyRowIndex);
          }
        } else if (result.dismiss === Swal.DismissReason.cancel) {
          localStorage.removeItem('cached_tracking_state');
          this.router.navigate(['/dashboard']);
        }
      });
    } else {
      localStorage.removeItem('cached_tracking_state');
      this.router.navigate(['/dashboard']);
    }
  }

  toggleFileMenu(): void {
    this.isFileMenuOpen = !this.isFileMenuOpen;
  }

  reportFileMenu(): void {
    this.reportFileMenuOpen = !this.reportFileMenuOpen;
  }

  handleFileAction(actionType: string): void {
    this.isFileMenuOpen = false;

    if (actionType === 'All orders') {
    } else if (actionType === 'Instruction') {
    }
  }

  ReportfileAction(actionType: string): void {
    this.reportFileMenuOpen = false;
  }

  getTodayDate(): string {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    return formattedDate.replace(/ /g, '-');
  }

  getTodayDateTimeLocal(): string {
    const today = new Date();
    const hours = String(today.getHours()).padStart(2, '0');
    const minutes = String(today.getMinutes()).padStart(2, '0');
    return `${this.getTodayDate()}T${hours}:${minutes}`;
  }

  onDateTimeFocus(event: any, rowIndex: number, columnKey: string): void {
    const inputElement = event.target;
    if (columnKey === 'PQA Assigned Datetime' || columnKey === 'PQA Start Datetime') {
      setTimeout(() => {
        inputElement.select();
      }, 20);
    }
  }

  onDropdownChange(event: any, rowIndex: number, columnKey: string, row?: any): void {
    const selectedValue = event.target.value;
    const currentRow = this.trackingData[rowIndex];
    currentRow.modifiedColumn = columnKey;
    currentRow.isModify = true;
    const lowerKey = columnKey.toLowerCase();


    const isYqaColumn = lowerKey === 'yqa' || lowerKey === 'yqa status' || lowerKey === 'yqa tat' || lowerKey === 'disp' || lowerKey === 'disp status';
    if (isYqaColumn && (selectedValue === 'Completed' || selectedValue === 'Complete')) {

      const prefix = columnKey.split(' ')[0];
      const startStr = currentRow[`${prefix} Start Datetime`];
      if (!startStr || startStr.toString().trim() === '') {
        event.target.value = '';
        this.trackingData[rowIndex][columnKey] = '';
        Swal.fire({
          icon: 'warning',
          title: 'Validation Error',
          text: `Please start the ${prefix} process first! (${prefix} Start Datetime is required)`,
          confirmButtonColor: '#3085d6'
        });
        return;
      }

      this.trackingData[rowIndex][columnKey] = selectedValue;
      this.selectedRowData = currentRow;
      this.currentRowIndex = rowIndex;

      if (lowerKey.includes('disp')) {
        this.currentFeedbackProcessName = 'DISP';
        this.currentPreviousProcessName = 'YQA';
      } else if (lowerKey.includes('yqa')) {
        this.currentFeedbackProcessName = 'YQA';
        this.currentPreviousProcessName = 'PQA';
      } else {
        const currentStreamCol = this.dynamicColumns.find(c => c.key && c.key.toLowerCase() === lowerKey);
        let currentRaw = currentStreamCol ? (currentStreamCol.label || currentStreamCol.key) : columnKey;
        this.currentFeedbackProcessName = currentRaw.replace(/status|tat/gi, '').trim();

        const currentIndex = this.dynamicColumns.findIndex(c =>
          c.key && (c.key.toLowerCase().includes('yqa'))
        );
        if (currentIndex > 0) {
          const prevCol = this.dynamicColumns[currentIndex - 1];
          let prevRaw = prevCol.label || prevCol.key;
          this.currentPreviousProcessName = prevRaw.replace(/status|tat/gi, '').trim();
        } else {
          this.currentPreviousProcessName = '';
        }
      }

      this.isFeedbackPopupOpen = true;
      return;
    }


    if (lowerKey === 'pqa process' || lowerKey === 'pqa_process') {
      const orderNo = this.getOrderNumber(currentRow);
      if (!orderNo || orderNo.toString().trim() === '') {
        event.target.value = '';
        this.trackingData[rowIndex][columnKey] = '';
        this.showOrderNumberRequiredAlert();
        return;
      }
    }

    if ((columnKey === 'PQA Status' || columnKey === 'YQA Status' || columnKey === 'Disp Status') && selectedValue && selectedValue.trim() !== '') {
      const prefix = columnKey.split(' ')[0];
      const startStr = currentRow[`${prefix} Start Datetime`];
      if (!startStr || startStr.toString().trim() === '') {
        event.target.value = '';
        this.trackingData[rowIndex][columnKey] = '';
        Swal.fire({
          icon: 'warning',
          title: 'Validation Error',
          text: `Please start the ${prefix} process first! (${prefix} Start Datetime is required)`,
          confirmButtonColor: '#3085d6'
        });
        return;
      }
      this.trackingData[rowIndex][columnKey] = selectedValue;
      if (selectedValue === 'Completed') {
        let missingFields: string[] = [];

        this.dynamicColumns.forEach(col => {
          const isFinalTat = col.key.toLowerCase() === 'finaltat' || col.label.toLowerCase().includes('final tat');
          const isFinalStatus = col.key.toLowerCase() === 'finalstatus' || col.label.toLowerCase().includes('final status');
          if (!isFinalTat && !isFinalStatus && col.isRequired) {
            const colValue = currentRow[col.key];
            if (!colValue || colValue.toString().trim() === '') {
              missingFields.push(`"${col.label}"`);
            }
          }
        });

        if (missingFields.length > 0) {
          event.target.value = '';
          this.trackingData[rowIndex][columnKey] = '';
          const missingFieldsText = missingFields.join(', ');

          const originalColumnKey = columnKey;
          const originalRowIndex = rowIndex;

          Swal.fire({
            icon: 'warning',
            title: 'Required Fields Missing',
            text: `Please fill ${missingFieldsText} before completing!`,
            confirmButtonColor: '#3085d6'
          }).then((result) => {
            if (result.isConfirmed) {
              const findAndFocusNextMissing = () => {
                let currentMissingCol = missingFields.find(fieldLabel => {
                  let cleanKey = fieldLabel.replace(/"/g, '').trim();
                  let colObj = this.dynamicColumns.find(c => c.label.toLowerCase() === cleanKey.toLowerCase());
                  if (colObj) {
                    let val = this.trackingData[originalRowIndex][colObj.key];
                    return (!val || val.toString().trim() === '');
                  }
                  return false;
                });

                if (currentMissingCol) {
                  let cleanKey = currentMissingCol.replace(/"/g, '').trim();
                  let baseId = cleanKey.replace(/ /g, '-').toLowerCase();

                  setTimeout(() => {
                    const targetElement = document.getElementById(`${baseId}-${originalRowIndex}`) ||
                      document.querySelector(`[id*="${baseId}-${originalRowIndex}"]`) as HTMLElement;

                    if (targetElement) {
                      if (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLSelectElement) {
                        targetElement.focus();

                        if (targetElement instanceof HTMLInputElement) {
                          targetElement.select();
                        }
                        const handleKeyDown = (e: KeyboardEvent) => {
                          if (e.key === 'Tab') {
                            const currentVal = (targetElement as HTMLInputElement).value;
                            if (currentVal && currentVal.toString().trim() !== '') {
                              targetElement.removeEventListener('keydown', handleKeyDown as EventListener);

                              setTimeout(() => {
                                findAndFocusNextMissing();
                              }, 100);
                            }
                          }
                        };
                        targetElement.addEventListener('keydown', handleKeyDown as EventListener);
                      }

                      let scrollContainer = targetElement.parentElement;
                      while (scrollContainer && scrollContainer.scrollWidth <= scrollContainer.clientWidth) {
                        scrollContainer = scrollContainer.parentElement;
                      }
                      if (scrollContainer) {
                        const containerRect = scrollContainer.getBoundingClientRect();
                        const elementRect = targetElement.getBoundingClientRect();
  const stickyOffset = 680; 
  const scrollLeftOffset = elementRect.left - containerRect.left;

  scrollContainer.scrollBy({
    left: scrollLeftOffset - stickyOffset,
    behavior: 'smooth'
  });
} else {
  targetElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}
                    }
                  }, 350);
                } else {
                  setTimeout(() => {
                    let originalBaseId = originalColumnKey.replace(/ /g, '-').toLowerCase();
                    const originalElement = document.getElementById(`${originalBaseId}-${originalRowIndex}`) ||
                      document.querySelector(`[id*="${originalBaseId}-${originalRowIndex}"]`) as HTMLElement;

                    if (originalElement) {
                      if (originalElement instanceof HTMLInputElement || originalElement instanceof HTMLSelectElement) {
                        originalElement.focus();
                      }
                    }
                  }, 100);
                }
              };
              findAndFocusNextMissing();
            }
          });
          return;
        }

        currentRow.isSavingProcess = true;
        this.selectedRowData = currentRow;
        this.currentRowIndex = rowIndex;
        this.isUploadRequired = true;
        this.isFileUploaded = false;
        this.popupTriggerSource = 'status';
        this.isOrderTrackingPopupOpen = true;
      } else {
        currentRow[`${prefix} End Datetime`] = this.getCurrentDateTimeString();
        this.calculateProcessTAT(rowIndex, prefix);
      }
    } else {
      this.trackingData[rowIndex][columnKey] = selectedValue;
    }
  }

  calculateProcessTAT(rowIndex: number, prefix: string): void {
    const startStr = this.trackingData[rowIndex][`${prefix} Start Datetime`];
    const endStr = this.trackingData[rowIndex][`${prefix} End Datetime`];

    if (startStr && endStr) {
      const start = this.parseMmDdYyyyDate(startStr);
      const end = this.parseMmDdYyyyDate(endStr);

      if (start && end) {
        const differenceInMs = end.getTime() - start.getTime();
        if (differenceInMs > 0) {
          const totalMinutes = Math.floor(differenceInMs / (1000 * 60));
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          this.trackingData[rowIndex][`${prefix} TAT`] = `${hours}h ${minutes}m`;
        } else {
          this.trackingData[rowIndex][`${prefix} TAT`] = '0h 0m';
        }
      } else {
        this.trackingData[rowIndex][`${prefix} TAT`] = '';
      }
    } else {
      this.trackingData[rowIndex][`${prefix} TAT`] = '';
    }
    this.calculateFinalTAT(rowIndex);
  }

  calculateTAT(rowIndex: number): void {
    const startStr = this.trackingData[rowIndex]['PQA Start Datetime'];
    const endStr = this.trackingData[rowIndex]['PQA End Datetime'];

    if (startStr && endStr) {
      const start = this.parseMmDdYyyyDate(startStr);
      const end = this.parseMmDdYyyyDate(endStr);

      if (start && end) {
        const differenceInMs = end.getTime() - start.getTime();
        if (differenceInMs > 0) {
          const totalMinutes = Math.floor(differenceInMs / (1000 * 60));
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          this.trackingData[rowIndex]['PQA TAT'] = `${hours}h ${minutes}m`;
        } else {
          this.trackingData[rowIndex]['PQA TAT'] = '0h 0m';
        }
      } else {
        this.trackingData[rowIndex]['PQA TAT'] = '';
      }
    } else {
      this.trackingData[rowIndex]['PQA TAT'] = '';
    }
    this.calculateFinalTAT(rowIndex);
  }

  private parseMmDdYyyyDate(dateStr: string): Date | null {
    try {
      const parts = dateStr.trim().split(' ');
      const dateParts = parts[0].split('/');
      const timeParts = (parts[1] || '00:00').split(':');

      if (dateParts.length === 3) {
        const mm = parseInt(dateParts[0], 10) - 1;
        const dd = parseInt(dateParts[1], 10);
        const yyyy = parseInt(dateParts[2], 10);
        const hours = parseInt(timeParts[0] || '0', 10);
        const minutes = parseInt(timeParts[1] || '0', 10);

        return new Date(yyyy, mm, dd, hours, minutes);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  getCurrentDateTimeString(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${mm}/${dd}/${yyyy} ${hours}:${minutes}`;
  }

  onFileUploadedSuccess(status: boolean): void {
    if (status) {
      this.isFileUploaded = true;
    }
  }

isColumnInRangeToDisable(colKey: string, row: any): boolean {
    const keyLower = colKey.toLowerCase();
    /////
if (keyLower === 'finaltat' || keyLower === 'final tat') {
    return true;
  }

  const columnDefinition = this.dynamicColumns.find(
    c => (c.key && c.key.toLowerCase() === keyLower) || (c.label && c.label.toLowerCase() === keyLower)
  );
  if (columnDefinition && columnDefinition.isRequired) {
    return false;
  }
    /////
    if (keyLower === 'receiveddatetime' || keyLower === 'received date time' || keyLower === 'received_date_time') {
      return true;
    }
    const pqaProcessValue = row['PQA Process'] || row['pqa_process'] || '';
    if (pqaProcessValue && pqaProcessValue.toString().trim() === 'SPQA') {
      const colKeys = this.dynamicColumns.map(c => c.key);
      const currentIndex = colKeys.indexOf(colKey);
      const pqaStatusIndex = colKeys.findIndex(k => k.toLowerCase() === 'pqa status');
      
     const finalTatIndex = colKeys.findIndex(k => k.toLowerCase() === 'finaltat' || k.toLowerCase() === 'final tat'); 
  
  if (pqaStatusIndex !== -1 && finalTatIndex !== -1) {
    if (currentIndex > pqaStatusIndex && currentIndex <= finalTatIndex) {
      return true; 
    }
  }
  return false;
}

    

    const pqaStatus = row['PQA Status'] ? row['PQA Status'].toString().trim().toLowerCase() : '';
    const yqaStatus = row['YQA Status'] ? row['YQA Status'].toString().trim().toLowerCase() : '';

    const isPqaDone = (pqaStatus === 'completed' || pqaStatus === 'done');
    const isYqaDone = (yqaStatus === 'completed' || yqaStatus === 'done');

    if (keyLower.includes('yqa') && !isPqaDone) {
      return true; 
    }

    if (keyLower.includes('disp') && (!isPqaDone || !isYqaDone)) {
      return true; 
    }

    if (!this.isProjectManager) {
      let processUserCode = '';
      if (keyLower.includes('pqa')) {
        processUserCode = row['PQA'] || row['pqa'] || '';
      } else if (keyLower.includes('yqa')) {
        processUserCode = row['YQA'] || row['yqa'] || '';
      } else if (keyLower.includes('disp')) {
        processUserCode = row['Disp'] || row['disp'] || '';
      }

      if (processUserCode && processUserCode.toString().trim() !== '') {
        if (processUserCode.toString().trim() !== this.loggedInUserCode.toString().trim()) {
          return true; 
        }
      }
    }

    if (keyLower === 'pqa' || keyLower === 'yqa' || keyLower === 'disp') {
      if (row.isNew) return false;
      const dropdownValue = row[colKey];
      let dateKey = 'PQA Start Datetime';
      if (keyLower === 'yqa') dateKey = 'YQA Start Datetime';
      if (keyLower === 'disp') dateKey = 'Disp Start Datetime';
      const startDatetime = row[dateKey];
      const isDateEmpty = !startDatetime ||
        startDatetime.toString().trim() === '' ||
        startDatetime.toString().includes('0000') ||
        startDatetime.toString().length < 5;

      if (isDateEmpty) {
        return false;
      }

      if (this.isProjectManager && dropdownValue && dropdownValue !== this.loggedInUserCode) {
        return true;
      }
    }

    if (this.isProjectManager && (keyLower === 'order#' || keyLower === 'order number' || keyLower === 'order date')) {
      return false;
    }
    
    if (keyLower === 'order#' || keyLower === 'order number') return false;

    if (keyLower === 'finaltat' || keyLower === 'final tat') {
      return true;
    }

    const pqaStatusValue = row['PQA Status'] || row['pqa_status'];
    const yqaStatusValue = row['YQA Status'] || row['YQA Status'];
    const dispStatusValue = row['Disp Status'] || row[' Disp Status'];

    const colKeys = this.dynamicColumns.map(c => c.key);
    const currentIndex = colKeys.indexOf(colKey);
    const pqaStatusIndex = colKeys.findIndex(k => k.toLowerCase() === 'pqa status');
    const yqaStatusIndex = colKeys.findIndex(k => k.toLowerCase() === 'yqa status');
    const dispStatusIndex = colKeys.findIndex(k => k.toLowerCase() === 'disp status');
    const yqaIndex = colKeys.findIndex(k => k.toLowerCase() === 'yqa');

    if ((pqaStatusValue === 'Completed' || pqaStatusValue === 'Complete') && !row.isNew && !row.isSavingProcess) {
      if (pqaStatusIndex !== -1 && currentIndex <= pqaStatusIndex) {
        return true;
      }
    }
    
    if ((yqaStatusValue === 'Completed' || yqaStatusValue === 'Complete') && !row.isNew && !row.isSavingProcess) {
      if (yqaStatusIndex !== -1 && currentIndex <= yqaStatusIndex) {
        return true;
      }
    }

    if ((dispStatusValue === 'Completed' || dispStatusValue === 'Complete') && !row.isNew && !row.isSavingProcess) {
      if (dispStatusIndex !== -1 && currentIndex <= dispStatusIndex) {
        return true;
      }
    }

    return false;
  }

  saveOrUpdateRow(rowIndex: number): void {
    const currentRow = this.trackingData[rowIndex];

    const orderNo = this.getOrderNumber(currentRow);
    if (!orderNo || orderNo.toString().trim() === '') {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: "Please enter 'Order Number' before saving the data!",
        confirmButtonColor: '#3085d6',
        returnFocus: false
      }).then(() => {
        setTimeout(() => {
          (document.querySelectorAll('.feedback-table tbody tr')[rowIndex]?.querySelector('input') as HTMLElement)?.focus();
        }, 150);
      });
      return;
    }

    const orderDate = this.getOrderDate(currentRow);
    if (!orderDate || orderDate.toString().trim() === '') {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: "Please enter 'Order Date' before saving the data!",
        confirmButtonColor: '#3085d6',
        returnFocus: false
      }).then(() => {
        setTimeout(() => {
          (document.querySelectorAll('.feedback-table tbody tr')[rowIndex]?.querySelector('input') as HTMLElement)?.focus();
        }, 150);
      });
      return;
    }

    if (!currentRow.isNew) {
      const inprocessRow = this.trackingData.find((row, index) => {
        if (index === rowIndex) return false;

        const pqaStatus = (row['PQA Status'] || row['pqa_status'] || '').trim().toLowerCase();
        const yqaStatus = (row['YQA Status'] || row['yqa_status'] || '').trim().toLowerCase();
        const dispStatus = (row['Disp Status'] || row['disp_status'] || '').trim().toLowerCase();

        const pqaAssignedUser = (row['PQA'] || '').toString().trim().toLowerCase();
        const yqaAssignedUser = (row['YQA'] || '').toString().trim().toLowerCase();
        const dispAssignedUser = (row['Disp'] || row['disp'] || '').toString().trim().toLowerCase();

        const currentUser = this.loggedInUserCode
          .toString()
          .trim()
          .toLowerCase();

        const isYqaActiveForMe = (
          (yqaStatus === 'in progress' || yqaStatus === 'inprocess' || yqaStatus === 'pending') &&
          yqaAssignedUser === currentUser
        );

        const isDispActiveForMe = (
          (dispStatus === 'in progress' || dispStatus === 'inprocess' || dispStatus === 'pending') &&
          dispAssignedUser === currentUser
        );

        const isPqaActiveForMe = (
          (pqaStatus === 'in progress' || pqaStatus === 'inprocess' || pqaStatus === 'pending') &&
          pqaAssignedUser === currentUser
        );

        return isPqaActiveForMe || isYqaActiveForMe || isDispActiveForMe;
      });


      if (inprocessRow) {
        const restrictedOrderNo = this.getOrderNumber(inprocessRow) || 'Unknown';
        Swal.fire({
          icon: 'error',
          title: 'Action Restricted',
          text: `Order Number '${restrictedOrderNo}' is currently In Progress and cannot be updated at this time!`,
          confirmButtonColor: '#d33',
          confirmButtonText: 'OK',

        }).then((result) => {
         const rowIndex = this.trackingData.indexOf(inprocessRow);

        setTimeout(() => {
          const firstInput = document
            .querySelectorAll('.feedback-table tbody tr')[rowIndex]
            ?.querySelector('input') as HTMLElement;

          firstInput?.focus();

        }, 150);

      });

      return;
    }
  }



    if (!currentRow.isNew) {
      const pqaProcessValue = currentRow['PQA Process'] || currentRow['pqa_process'];
      if (!pqaProcessValue || pqaProcessValue.toString().trim() === '') {
        Swal.fire({
          icon: 'warning',
          title: 'Validation Error',
          text: "Please select 'PQA Process' before updating the data!",
          confirmButtonColor: '#3085d6',
          returnFocus: false
        }).then(() => {
          setTimeout(() => {
            (document.querySelectorAll('.feedback-table tbody tr')[rowIndex]?.querySelector('input') as HTMLElement)?.focus();
          }, 150);
        });
        return;
      }
    }
    const rowId = currentRow['RowId'] || currentRow['id'] || currentRow['Id'];
    const updatePayload: any[] = [];

    this.dynamicColumns.forEach(col => {
      const columnName = col.key;
      const fieldConfigId = col.fieldConfigId;
      const dataType = col.dataType;
      if (columnName === 'Dispatched Date') {
    currentRow[columnName] = (currentRow['PQA Process']?.trim() === 'SPQA') ? (currentRow['PQA End Datetime'] || '') : (currentRow['Disp End Datetime'] || '');
  }
  if (columnName === 'Final Status') {
    currentRow[columnName] = (currentRow['PQA Process']?.trim() === 'SPQA') ? (currentRow['PQA Status'] || '') : (currentRow['Disp Status'] || '');
  }
      const currentValue = currentRow[columnName];
      const EmployeeId = localStorage.getItem('EmployeeID') || '0';

      if (currentValue !== undefined && currentValue !== null) {
        updatePayload.push({
          RowId: rowId,
          FieldConfigId: fieldConfigId,
          FieldName: columnName,
          DataType: dataType,
          FieldValue: currentValue.toString(),
          ProjectId: this.projectId,
          EmployeeId: EmployeeId
        });
      }
    });

    if (updatePayload.length === 0) {
      this.isLoading = false;
      Swal.fire('Info', 'No changes detected to update.', 'info');
      return;
    }

const baseUrl = this.authService.baseUrl;
    this.executeGridUpdate(baseUrl, updatePayload, currentRow, rowIndex);
  }

  private executeGridUpdate(baseUrl: string, payload: any[], currentRow: any, rowIndex: number): void {
    const apiUrl = `${baseUrl}/TrackingSheet/UpdateTrackingSheetValues`;
    this.http.post(apiUrl, payload).subscribe({
      next: (response: any) => {
        if (response.success || response.Success) {
          const rowFiles = this.uploadedFilesList.filter(f => f.rowIndex === rowIndex);
          if (rowFiles.length > 0) {
            this.uploadRowFilesSequentially(baseUrl, rowFiles, currentRow, rowIndex);
          } else {
            this.isLoading = false;
            Swal.fire({
              icon: 'success',
              title: 'Success',
              text: 'Data saved successfully!',
              confirmButtonColor: '#3085d6'
            }).then((result) => {
              if (result.isConfirmed) {
                this.loadingMessage = 'Refreshing data, please wait...';
                this.isLoading = true;

                setTimeout(() => {
                  this.resetRowState(currentRow);
                  this.refreshCurrentData();
                  this.isLoading = false;
                }, 1500);
              }
            });
          }
        }
      },
      error: (err) => {
        console.error('API Error:', err);
        currentRow.isSavingProcess = false;
        this.isLoading = false;
        const errorMessage = err.error && err.error.message ? err.error.message : 'Failed to update database';
        Swal.fire('Error', errorMessage, 'error');
      }
    });
  }

  private uploadRowFilesSequentially(baseUrl: string, rowFiles: any[], currentRow: any, rowIndex: number): void {
    let uploadCount = 0;
    const empId = localStorage.getItem('EmployeeID') || '0';
    const uploadSingleFile = (fileObj: any) => {
      const processName = fileObj.processKeyName || fileObj.rowData['Process Name'] || fileObj.rowData['Process'] || 'DefaultFolder';
      let rawOrderDate = this.getOrderDate(currentRow) || '';
      let formattedOrderDate = rawOrderDate;
      if (rawOrderDate.includes('-') && rawOrderDate.split('-')[0].length === 4) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const parts = rawOrderDate.split('-');
        const year = parts[0];
        const month = months[parseInt(parts[1]) - 1];
        const day = parseInt(parts[2]).toString();
        formattedOrderDate = `${day}-${month}-${year}`;
      }
      const fileFormData = new FormData();
      fileFormData.append('uploadFile', fileObj.file, fileObj.file.name);
      fileFormData.append('projectId', this.projectId.toString());
      fileFormData.append('orderNumber', this.getOrderNumber(currentRow));
      fileFormData.append('processName', processName);
      fileFormData.append('employeeId', empId);
      fileFormData.append('OrderDate', formattedOrderDate);
      this.http.post(`${baseUrl}/TrackingSheet/UploadRowFile`, fileFormData).subscribe({
        next: (fileResponse: any) => {
          uploadCount++;
          if (uploadCount === rowFiles.length) {
            this.isLoading = false;
            Swal.fire({
              icon: 'success',
              title: 'Success',
              text: 'Data and Files saved successfully!',
              confirmButtonColor: '#3085d6'
            }).then((result) => {
              if (result.isConfirmed) {
                this.loadingMessage = 'Refreshing data, please wait...';
                this.isLoading = true;

                setTimeout(() => {
                  this.uploadedFilesList = this.uploadedFilesList.filter(f => f.rowIndex !== rowIndex);
                  this.resetRowState(currentRow);
                  this.refreshCurrentData();
                  this.isLoading = false;
                }, 1500);
              }
            });
          } else {
            uploadSingleFile(rowFiles[uploadCount]);
          }
        },
        error: (err) => {
          console.error('File Upload Error:', err);
          this.isLoading = false;
          Swal.fire('Error', `Data saved but failed to upload file for process: ${processName}`, 'error');
        }
      });
    };
    uploadSingleFile(rowFiles[0]);
  }

  private resetRowState(currentRow: any): void {
    currentRow.isNew = false;
    currentRow.isSavingProcess = false;
    this.selectedFileToUpload = null;
    this.popupRowData = null;
    this.selectedFileRowIndex = -1;
  }

  calculateFinalTAT(rowIndex: number): void {
    if (rowIndex < 0 || !this.trackingData[rowIndex]) return;

    const currentRow = this.trackingData[rowIndex];

    ['PQA', 'YQA', 'Disp'].forEach(prefix => {
      const startStr = currentRow[`${prefix} Start Datetime`];
      const endStr = currentRow[`${prefix} End Datetime`];
      if (startStr && endStr && (!currentRow[`${prefix} TAT`] || currentRow[`${prefix} TAT`] === '')) {
        const start = this.parseMmDdYyyyDate(startStr);
        const end = this.parseMmDdYyyyDate(endStr);
        if (start && end) {
          const diffMs = end.getTime() - start.getTime();
          if (diffMs > 0) {
            const totalMins = Math.floor(diffMs / (1000 * 60));
            currentRow[`${prefix} TAT`] = `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`;
          } else {
            currentRow[`${prefix} TAT`] = '0h 0m';
          }
        }
      }
    });

    const pqaTat = currentRow['PQA TAT'] || '';
    const yqaTat = currentRow['YQA TAT'] || '';
    const dispTat = currentRow['Disp TAT'] || '';

    const parseTatToMinutes = (tatStr: string): number => {
      if (!tatStr || tatStr.trim() === '') return 0;
      const hoursMatch = tatStr.match(/(\d+)\s*h/);
      const minutesMatch = tatStr.match(/(\d+)\s*m/);
      const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
      const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
      return (hours * 60) + minutes;
    };

    const totalMinutes = parseTatToMinutes(pqaTat) + parseTatToMinutes(yqaTat) + parseTatToMinutes(dispTat);

    const finalValue = totalMinutes > 0
      ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
      : '0h 0m';

    currentRow['Final TAT'] = finalValue;
    currentRow['FinalTAT'] = finalValue;

    if (this.cdr) {
      this.cdr.detectChanges();
    }
  }
  refreshCurrentData(): void {
    const apiUrl = `${this.authService.baseUrl}/TrackingSheet/GetTrackingSheetData?projectId=${this.projectId}&fromDate=${this.selectedFromDate}&toDate=${this.selectedToDate}`;
    this.http.get(apiUrl).subscribe({
      next: (response: any) => {
        this.trackingData = [];
        this.cdr.detectChanges();
        setTimeout(() => {
          if (response) {
            const currentState = {
              projectId: this.projectId,
              projectName: this.selectedProjectName,
              fromDate: this.selectedFromDate,
              toDate: this.selectedToDate,
              trackingData: (response.columns && response.data) ? response : (response.trackingData || response)
            };
            localStorage.setItem('cached_tracking_state', JSON.stringify(currentState));
            this.parseTrackingSheetData(currentState);
            this.originalTrackingData = [...this.trackingData];
            this.isRefreshing = false;
            this.isLoading = false;
            this.cdr.detectChanges();
            setTimeout(() => {
              if (this.trackingData && this.trackingData.length > 0 && this.dynamicColumns && this.dynamicColumns.length > 0) {
                const firstColKey = this.dynamicColumns[0].key;
                const firstElementId = firstColKey.replace(/ /g, '-').toLowerCase() + '-0';

                const firstElement = document.getElementById(firstElementId);
                if (firstElement) {
                  firstElement.focus();
                  firstElement.scrollLeft = 0;
                  if (firstElement instanceof HTMLInputElement) {
                    firstElement.select();
                  }
                }
              }
            }, 100);

          }
        }, 300);
      },
      error: (err) => {
        console.error('Refresh Error:', err);
        this.isRefreshing = false;
        this.isLoading = false;
      }
    });
  }

  onRefreshClick(): void {
    this.isRefreshing = true;
    this.isLoading = true;
    this.loadingMessage = 'Refreshing data, please wait...';
    this.searchText = '';
    this.refreshCurrentData();

    setTimeout(() => {
      this.isRefreshing = false;
      this.isLoading = false;
    }, 200);
  }
  onSearchChange(): void {
    if (!this.searchText || this.searchText.trim() === '') {
      this.trackingData = [...this.originalTrackingData];
      return;
    }
    const keyword = this.searchText.toLowerCase().trim();
    this.trackingData = this.originalTrackingData.filter(row => {
      return Object.keys(row).some(key => {
        const val = row[key];
        if (val !== null && val !== undefined) {
          return val.toString().toLowerCase().includes(keyword);
        }
        return false;
      });
    });
  }
  checkAndOpenFeedbackPopup(row: any, colKey: string): void {
    console.log('--- checkAndOpenFeedbackPopup Called ---');
    console.log('colKey:', colKey);
    console.log('dynamicColumns:', this.dynamicColumns);
    const lowerKey = colKey.toLowerCase();

    if (lowerKey === 'yqa' || lowerKey === 'yqa status') {
      this.selectedRowData = row;
      const currentIndex = this.dynamicColumns.findIndex(c =>
        c.key && c.key.toLowerCase() === lowerKey
      );

      console.log('currentIndex of YQA:', currentIndex);

      if (currentIndex > 0) {
        const prevCol = this.dynamicColumns[currentIndex - 1];
        this.currentFeedbackProcessName = prevCol.label || prevCol.key;
      } else {
        this.currentFeedbackProcessName = 'PQA';
      }

      console.log('Final currentFeedbackProcessName:', this.currentFeedbackProcessName);

      this.isFeedbackPopupOpen = true;
    }
  }

  onFeedbackSubmitted(feedbackData: any): void {
    this.isFeedbackPopupOpen = false;

    console.log('Feedback Data Received From Popup:', feedbackData);

    const payload = {
      projectId: this.projectId,
      orderNumber: feedbackData.orderNumber,
      processName: feedbackData.processName,
      previousProcessName: feedbackData.previousProcessName,
      feedback: feedbackData.feedback,
      empId: Number(feedbackData.empId) || 0,
      rowIndex: feedbackData.rowIndex,
 
      dealNo: feedbackData.dealNo || '',
      criticality: feedbackData.criticality,
      processID: Number(feedbackData.processID) || 0,
      orderDate: feedbackData.orderDate ? new Date(feedbackData.orderDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-') : null,      errorType: feedbackData.errorType || '',
      errorField: feedbackData.errorField || '',
      feedbackType: feedbackData.feedbackType || '',
      feedbackReceivedDate: feedbackData.feedbackReceivedDate ? new Date(feedbackData.feedbackReceivedDate).toISOString() : null,      shouldBe: feedbackData.shouldBe || '',
      remark: feedbackData.remark || '',
      
    errorDoneBy: feedbackData.pqa || '',
      feedbackGivenBy: feedbackData.empcode || '',
      addedBy: feedbackData.empId || ''
    };
 
    const apiUrl = `${this.authService.baseUrl}/TrackingSheet/SaveProcessFeedback`;

    this.http.post(apiUrl, payload).subscribe({
      next: (response: any) => {
        console.log('Feedback saved successfully to database:', response);
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Feedback saved successfully.',
          confirmButtonText: 'OK'
        }).then((result) => {
          if (result.isConfirmed) {
            if (this.selectedRowData) {
              this.selectedRowData.isSavingProcess = true;
              this.isUploadRequired = true;
              this.isFileUploaded = false;
              this.popupTriggerSource = 'status';
              this.isOrderTrackingPopupOpen = true;
            }
          }
        });
      },
      error: (error) => {
        console.error('Error saving feedback:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to save feedback. Please try again.',
          confirmButtonText: 'OK'
        });
      }
    });
  }

  closeFeedbackPopup(): void {
    const enteredText = this.feedbackProcessComponent ? this.feedbackProcessComponent.errorDescription : '';

    if (!enteredText || enteredText.trim() === '') {
      Swal.fire({
        icon: 'warning',
        title: 'Feedback Required',
        text: 'Please enter feedback before closing the popup. Feedback is mandatory!',
        confirmButtonText: 'OK',
        target: document.querySelector('.custom-modal-content') as HTMLElement
      });
      return;
    }

    Swal.fire({
      title: 'Save Feedback?',
      text: 'Do you want to save the feedback before closing?',
      icon: 'question',
      confirmButtonText: 'Yes',
      target: document.querySelector('.custom-modal-content') as HTMLElement
    }).then((result) => {
      if (result.isConfirmed) {
        const feedbackData = {
          orderNumber: this.getOrderNumber(this.selectedRowData),
          processName: this.currentFeedbackProcessName,
          previousProcessName: this.currentPreviousProcessName,
          feedback: this.feedbackProcessComponent ? this.feedbackProcessComponent.errorDescription : '',
          errorType: this.feedbackProcessComponent ? this.feedbackProcessComponent.errorType : '',
          criticality: this.feedbackProcessComponent ? this.feedbackProcessComponent.criticality : '',
          feedbackType: this.feedbackProcessComponent ? this.feedbackProcessComponent.feedbackType : '',
          errorField: this.feedbackProcessComponent ? this.feedbackProcessComponent.errorField : '',
          feedbackReceivedDate: this.feedbackProcessComponent ? this.feedbackProcessComponent.feedbackReceivedDate : '',
          shouldBe: this.feedbackProcessComponent ? this.feedbackProcessComponent.shouldBe : '',
          remark: this.feedbackProcessComponent ? this.feedbackProcessComponent.remark : '',
          empId: this.loggedInEmpId,
          empcode: this.loggedInUserCode,
          rowIndex: this.trackingData.indexOf(this.selectedRowData)
        };
        this.onFeedbackSubmitted(feedbackData);
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        this.isFeedbackPopupOpen = false;
      }
    });
  }


  moveRow(e: any) {
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && e.target.tagName !== 'SELECT') {
      e.preventDefault();
      const currentCell = e.target.closest('td');
      const currentRow = e.target.closest('tr');
      const cellIndex = Array.from(currentRow.children).indexOf(currentCell);

      const targetRow = e.key === 'ArrowDown' ? currentRow.nextElementSibling : currentRow.previousElementSibling;

      if (targetRow) {
        const targetCell = targetRow.children[cellIndex];
        const input = targetCell?.querySelector('input, select') as HTMLElement;
        input?.focus();
      }
    }
  }
  onPmDateSelection(event: any, rowIndex: number, colKey: string): void {
    const dateVal = event.target.value;
    if (!dateVal) return;
    const parts = dateVal.split('-');
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parts[2];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mmm = months[monthIdx];
    const formattedDate = `${day}-${mmm}-${year}`;
    this.updateSelectValue({ target: { value: formattedDate } }, rowIndex, colKey);
  }



  fetchUserCode(projectId: number): void {
    const apiUrl = `${this.authService.baseUrl}/TrackingSheet/GetUserCode?projectId=${projectId}`;
    this.http.get<any>(apiUrl).subscribe({
      next: (response) => {
        console.log("Full Response:", response);
        if (Array.isArray(response)) {
          this.projectUserCodes = response.map(item => item.Code);
        }
        else if (response && response.data && Array.isArray(response.data)) {
          this.projectUserCodes = response.data.map((item: any) => item.Code);
        }
        else if (response && response.userCodes && Array.isArray(response.userCodes)) {
          this.projectUserCodes = response.userCodes.map((item: any) => item.Code);
        }
      },
      error: (err) => {
        console.error("Error fetching user code from API:", err);
      }
    });
  }

startUserProcess(rowIndex: number): void {
  if (rowIndex !== -1 && this.trackingData[rowIndex]) {
    const currentRow = this.trackingData[rowIndex];
    const currentDateTime = this.getCurrentDateTimeString();
    
    let processType: 'PQA' | 'YQA' | 'Disp' = 'PQA';
    
    if (currentRow['Disp Assigned Datetime'] && (!currentRow['Disp Start Datetime'] || currentRow['Disp Start Datetime'].toString().trim() === '')) {
      processType = 'Disp';
    } else if (currentRow['YQA Assigned Datetime'] && (!currentRow['YQA Start Datetime'] || currentRow['YQA Start Datetime'].toString().trim() === '')) {
      processType = 'YQA';
    }

    const columnNameMap = {
      'PQA': 'PQA Start Datetime',
      'YQA': 'YQA Start Datetime',
      'Disp': 'Disp Start Datetime'
    };

    const targetColumn = columnNameMap[processType];
    const processTitle = processType === 'Disp' ? 'Disposition' : processType;

    currentRow[targetColumn] = currentDateTime;
    currentRow.isModify = true;
    currentRow.modifiedColumn = targetColumn;
    this.cdr.detectChanges();

    Swal.fire({
      icon: 'success',
      title: `${processTitle} Process Started`,
      text: `${processTitle} Process started successfully at ${currentDateTime}. Please don't forget to save/update changes!`,
      confirmButtonColor: '#3085d6',
      timer: 2500
    }).then(() => {
      const inputId = `${processType.toLowerCase()}-start-datetime-` + rowIndex;
      const element = document.getElementById(inputId) as HTMLInputElement;
      if (element) {
        element.focus();
      }
    });
  }
}

hasStartProcessButton(): boolean {
  if (this.isProjectManager) return false;
  
  return this.trackingData.some(row =>
    !row.isNew && (
      (row['PQA Assigned Datetime'] && (!row['PQA Start Datetime'] || row['PQA Start Datetime'].toString().trim() === '')) ||
      (row['YQA Assigned Datetime'] && (!row['YQA Start Datetime'] || row['YQA Start Datetime'].toString().trim() === '')) ||
      (row['Disp Assigned Datetime'] && (!row['Disp Start Datetime'] || row['Disp Start Datetime'].toString().trim() === ''))
    )
  );
}

getpqavalue(rowData: any, processType: 'YQA' | 'DISP'): string {
  if (!rowData) return '';
  
  if (processType === 'DISP') {
    return rowData['YQA'] || '';
  } 
  else if (processType === 'YQA') {
    return rowData['PQA'] || '';
  }
  
  return '';
}

}