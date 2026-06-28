import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'ca-navigation-page',
  standalone: true,
  imports: [],
  templateUrl: './navigation-page.component.html',
  styleUrls: ['./navigation-page.component.scss'],
})
export class NavigationPageComponent implements OnInit {
  @Input()
  navigation: string | null | undefined = '';

  destination: string | null = null;
  shouldRedirect = false;

  ngOnInit(): void {
    this.destination = this.getNavigationTarget();

    if (this.isInElementorEditor() || !this.destination) {
      return;
    }

    this.shouldRedirect = true;
    setTimeout(() => {
      if (this.destination) {
        window.location.href = this.destination;
      }
    });
  }

  private isInElementorEditor(): boolean {
    return (
      window.location.href.includes('elementor') ||
      document.body.classList.contains('elementor-editor-active') ||
      document.body.classList.contains('elementor-editor-preview')
    );
  }

  private getNavigationTarget(): string | null {
    if (this.navigation == null) {
      return null;
    }

    const target = this.navigation.trim();
    return target ? target : null;
  }
}
