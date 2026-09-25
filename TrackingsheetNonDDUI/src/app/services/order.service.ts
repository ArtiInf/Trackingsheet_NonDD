import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './login.service';

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  constructor(private http: HttpClient,private authService: AuthService) { }

  saveOrder(formData: FormData) {
    return this.http.post(`${this.authService.baseUrl}/CreateNewOrder/CreateOrder`, formData);
  }
}