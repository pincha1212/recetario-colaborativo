import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  FormArray,
  Validators,
  FormBuilder,
  FormGroup,
  FormsModule,
} from '@angular/forms';
import { RecipeService } from '../../services/recipe.service';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { Observable } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-recipe-form',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './recipe-form.component.html',
  styleUrl: './recipe-form.component.css',
})
export class RecipeFormComponent {
  newCategory = '';
  http = inject(HttpClient);
  router = inject(Router);
  route = inject(ActivatedRoute);
  fb = inject(FormBuilder);
  editando = false;
  id: string | null = null;
  allCategories: string[] = [];
  selectedCategories: string[] = [];
  filteredCategories: string[] = [];
  contextualCategories: string[] = [];

  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.maxLength(200)]],
    ingredients: ['', Validators.required],
    steps: ['', Validators.required],
  });

  constructor(private cdRef: ChangeDetectorRef) {}

  ngOnInit() {
    // Obtener el ID inmediatamente del snapshot
    this.id = this.route.snapshot.params['id'];
    this.editando = !!this.id;

    this.form.valueChanges
      .pipe(
        debounceTime(300) // Optimiza el rendimiento
      )
      .subscribe(() => {
        this.updateRelatedCategories();
      });

    // Cargar categorías primero
    this.http
      .get<string[]>('http://localhost:3000/recipes/categories')
      .subscribe({
        next: (cats) => {
          this.allCategories = cats;

          // Si estamos editando, cargar la receta después de tener las categorías
          if (this.editando) {
            this.cargarRecetaParaEdicion();
          }
        },
        error: (err) => console.error('Error cargando categorías:', err),
      });
  }

  // En recipe-form.component.ts
  private updateRelatedCategories() {
    const searchTerms = [
      this.form.value.title || '',
      this.form.value.description || '',
      this.form.value.ingredients || '',
      this.form.value.steps || '',
    ].join(' ');

    const normalizedTerms = this.normalizeText(searchTerms);

    // Filtrar categorías no seleccionadas + coincidencias
    this.contextualCategories = this.allCategories.filter((cat) => {
      return (
        !this.selectedCategories.includes(cat) &&
        normalizedTerms.includes(this.normalizeText(cat))
      );
    });
  }

  private normalizeText(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9 ]/g, '')
      .toLowerCase();
  }

  // Añadir esta propiedad computada
  get unselectedCategories(): string[] {
    return this.allCategories.filter(
      (cat) => !this.selectedCategories.includes(cat)
    );
  }

  private loadCategories() {
    this.http
      .get<string[]>('http://localhost:3000/categories')
      .subscribe((cats) => {
        this.allCategories = cats;
      });
  }

  toggleCategory(category: string) {
    this.selectedCategories = this.selectedCategories.includes(category)
      ? this.selectedCategories.filter((c) => c !== category)
      : [...this.selectedCategories, category];

    this.updateRelatedCategories(); // Actualizar tras cada cambio
  }

  

  private cargarRecetaParaEdicion() {
    this.http.get<any>(`http://localhost:3000/recipes/${this.id}`).subscribe({
      next: (recipe) => {
        // Añadir categorías únicas manteniendo el orden original
        recipe.categories.forEach((cat: string) => {
          if (!this.allCategories.includes(cat.toLowerCase())) {
            this.allCategories = [...this.allCategories, cat];
          }
        });

        this.selectedCategories = [...recipe.categories];

        this.form.setValue({
          title: recipe.title,
          description: recipe.description,
          ingredients: recipe.ingredients.join(', '), 
          steps: recipe.steps.join('\n'), 
        });
      },
      error: (err) => console.error('Error cargando receta:', err),
    });
  }

  guardarReceta() {
    const data = {
      title: this.form.value.title!,
      description: this.form.value.description!, // Incluir description
      ingredients: this.form.value.ingredients!.split(',').map((i) => i.trim()),
      steps: this.form.value.steps!.split('\n').map((p) => p.trim()),
      categories: this.selectedCategories,
    };

    if (this.editando && this.id) {
      this.http
        .put(`http://localhost:3000/recipes/${this.id}`, data)
        .subscribe(() => {
          this.router.navigate(['/recipes']);
        });
    } else {
      this.http.post('http://localhost:3000/recipes', data).subscribe(() => {
        this.router.navigate(['/recipes']);
      });
    }
  }

  volver() {
    this.router.navigate(['/recipes']);
  }

  addNewCategory() {
    const newCat = this.newCategory.trim().toLowerCase();
    if (newCat) {
      // Solo añadir si no existe
      if (!this.allCategories.includes(newCat)) {
        this.allCategories = [...this.allCategories, newCat];
      }
      // Añadir a seleccionadas
      if (!this.selectedCategories.includes(newCat)) {
        this.selectedCategories = [...this.selectedCategories, newCat];
      }
      this.newCategory = '';
      this.filteredCategories = []; // Limpiar sugerencias
    }
  }

  // Método para filtrar categorías
  onCategorySearch(): void {
    const searchTerm = this.newCategory.trim().toLowerCase();

    if (!searchTerm) {
      this.filteredCategories = [];
      return;
    }

    this.filteredCategories = this.allCategories.filter((cat) =>
      cat.toLowerCase().includes(searchTerm)
    );
  }

  // Seleccionar categoría existente
  selectCategory(category: string): void {
    this.toggleCategory(category);
    this.newCategory = ''; // Limpiar input
    this.filteredCategories = []; // Ocultar sugerencias
  }
}
