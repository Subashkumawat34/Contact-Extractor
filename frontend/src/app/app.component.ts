import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ExtractorComponent } from './components/extractor/extractor.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ExtractorComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'frontend';
}
