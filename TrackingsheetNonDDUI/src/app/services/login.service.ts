import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { LoginRequest } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
public baseUrl = 'https://localhost:7241/api';
  private getLocalItem(key: string): string | null {
    return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  }

  private userSubject = new BehaviorSubject<string | null>(this.getLocalItem('userFullName'));
  userName$ = this.userSubject.asObservable();

  private designationSubject = new BehaviorSubject<string | null>(this.getLocalItem('userDesignation'));
  userDesignation$ = this.designationSubject.asObservable();

  private EmployeeIDsubject = new BehaviorSubject<string | null>(this.getLocalItem('EmployeeID'));
  EmployeeID$ = this.EmployeeIDsubject.asObservable();

  private Code = new BehaviorSubject<string | null>(this.getLocalItem('Code'));
  Code$ = this.Code.asObservable();

  private isPmSubject = new BehaviorSubject<boolean>(this.getLocalItem('isProjectManager') === 'true');
  isProjectManager$ = this.isPmSubject.asObservable();

  constructor(private http: HttpClient) { }

  login(data: LoginRequest): Observable<any> {
    if (!data || !data.email) {
      return throwError(() => new Error('Email/Username is required'));
    }

    const userEmail = data.email.trim();
    const userPassword = data.password;

    const params = new HttpParams()
      .set('Username', userEmail)
      .set('Password', userPassword);

    return this.http.post<any>(`${this.baseUrl}/Login`, {}, { params }).pipe(
      switchMap((loginRes: any) => {
        const isProjectManager = loginRes.isProjectManager ?? false;


        return this.http.get<any[]>(`${this.baseUrl}/Login/${userEmail}`).pipe(
          tap((userInfoArray) => {
            if (userInfoArray && userInfoArray.length > 0) {
              const userObj = userInfoArray[0];

              const firstName = userObj.FirstName || userObj.firstName || '';
              const lastName = userObj.LastName || userObj.lastName || '';

              const designation = userObj.DesignationName ||
                userObj.designationName ||
                userObj.Designation ||
                userObj.designation ||
                'Employee';

              const EmployeeId = userObj.EmployeeID || userObj.employeeID || 'N/A';
              const fullName = `${firstName} ${lastName}`.trim() || 'User';
              const Code = userObj.Code || userObj.Code || 'N/A';

              console.log('=== Login Success Details ===');
              console.log('Employee ID:', EmployeeId);
              console.log('Full Name:', fullName);
              console.log('Designation:', designation);
              console.log('Code:', Code);
              console.log('isProjectManager:', isProjectManager);
              if (typeof window !== 'undefined') {
                localStorage.setItem('userFullName', fullName);
                localStorage.setItem('userDesignation', designation);
                localStorage.setItem('EmployeeID', EmployeeId);
                localStorage.setItem('Code', Code);
                localStorage.setItem('isProjectManager', isProjectManager.toString());
              }

              this.userSubject.next(fullName);
              this.designationSubject.next(designation);
              this.EmployeeIDsubject.next(EmployeeId);
              this.Code.next(Code);
              this.isPmSubject.next(isProjectManager);
            } else {
              console.warn('Login failed: User profile details not found in response.');
              throw new Error('User profile details not found');
            }
          })
        );
      })
    );
  }

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userFullName');
      localStorage.removeItem('userDesignation');
      localStorage.removeItem('EmployeeID');
      localStorage.removeItem('Code');
    }
    this.userSubject.next(null);
    this.designationSubject.next(null);
    this.EmployeeIDsubject.next(null);
    console.log('User logged out. LocalStorage and subjects cleared.');
  }

  getProjects(employeeId: string): Observable<any[]> {
    const projectApiUrl = `${this.baseUrl}/Login/GetProject`;
    const params = new HttpParams().set('EmployeeId', employeeId);

    return this.http.get<any[]>(projectApiUrl, { params });
  }


  getTrackingSheetData(projectId: number, employeeCode: string, FromDate: string, ToDate: string): Observable<any[]> {
    const trackingApiUrl = `${this.baseUrl}/TrackingSheet/GetTrackingSheetData`;
    const params = new HttpParams()
      .set('projectId', projectId.toString())
      .set('employeeCode', employeeCode)
      .set('fromDate', FromDate)
      .set('toDate', ToDate)
      ;

    return this.http.get<any[]>(trackingApiUrl, { params });
  }
}