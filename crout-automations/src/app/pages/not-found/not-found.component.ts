import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavComponent } from '../../components/nav/nav.component';
import { FooterComponent } from '../../components/footer/footer.component';

@Component({
  selector: 'ca-not-found',
  standalone: true,
  imports: [RouterLink, NavComponent, FooterComponent],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss'
})
export class NotFoundComponent {}
