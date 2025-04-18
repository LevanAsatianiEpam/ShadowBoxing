import { Component } from '@angular/core';

@Component({
    selector: 'app-root',
    template: `<div>Hello {{value}}</div>`,
    standalone: false
})
export class AppComponent {
  value = 'World';
}
