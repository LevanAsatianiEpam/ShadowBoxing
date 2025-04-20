import { Component } from '@angular/core';
import { VersionInfoComponent } from './version-info/version-info.component';
import { BoxingTimerComponent } from './boxing-timer/boxing-timer.component';

@Component({
    selector: 'app-root',
    template: `
    <div class="container">
      <header>
        <h1>Shadow Boxing Training Timer</h1>
      </header>
      <main>
        <app-boxing-timer></app-boxing-timer>
      </main>
      <footer>
        <p>© 2025 Boxing Training App</p>
      </footer>      
      <app-version-info></app-version-info>
    </div>
    `,
    styles: [`
      .container {
        font-family: Arial, sans-serif;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
      }
      header {
        text-align: center;
        margin-bottom: 20px;
      }
      footer {
        text-align: center;
        margin-top: 30px;
        font-size: 0.8rem;
        color: #666;
      }
    `],
    standalone: true,
    imports: [
      VersionInfoComponent, 
      BoxingTimerComponent]
})
export class AppComponent {
  title = 'Boxing Training Timer';
}
