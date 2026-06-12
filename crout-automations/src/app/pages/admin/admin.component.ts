import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'ca-admin',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
})
export class AdminComponent {}
