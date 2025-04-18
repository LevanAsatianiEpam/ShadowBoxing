import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";

import { AppComponent } from "./app.component";
import { BoxingTimerComponent } from "./boxing-timer/boxing-timer.component";

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, FormsModule, BoxingTimerComponent],
  bootstrap: [AppComponent]
})
export class AppModule {}
