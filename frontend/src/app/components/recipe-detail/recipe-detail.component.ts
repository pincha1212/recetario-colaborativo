import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-recipe-detail',
  imports: [CommonModule],
  templateUrl: './recipe-detail.component.html',
  styleUrl: './recipe-detail.component.css',
})
export class RecipeDetailComponent {
  route = inject(ActivatedRoute);
  router = inject(Router);
  http = inject(HttpClient);
  receta = signal<any | null>(null);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.http.get(`http://localhost:3000/recipes/${id}`).subscribe({
        next: (receta: any) => {
          console.log('Receta recibida:', receta); // Depuración
          this.receta.set(receta);
        },
        error: (err) => console.error('Error al cargar receta:', err),
      });
    }
  }

editarReceta() {
  const id = this.route.snapshot.paramMap.get('id'); // Obtener ID de la ruta actual
  this.router.navigate(['/recipes/edit', id]); // Navegar usando parámetros de ruta
}

  volver() {
    this.router.navigate(['/recipes']);
  }

}
