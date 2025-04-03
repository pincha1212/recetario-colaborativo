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
import { Recipe } from '../../models/recipe.model';

@Component({
  selector: 'app-recipe-form',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './recipe-form.component.html',
  styleUrl: './recipe-form.component.css',
})
export class RecipeFormComponent implements OnInit {
  newCategory = '';
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
    title: ['', [Validators.minLength(3)]],
    description: ['', [Validators.minLength(10)]],
    ingredients: [''],
    steps: [''],
  });

  private recipeService = inject(RecipeService);

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
    this.recipeService.getCategories().subscribe({
      next: (cats: string[]) => {
        // ← Agrega el tipo aquí
        this.allCategories = cats;
        if (this.editando && this.id) this.cargarRecetaParaEdicion();
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

  toggleCategory(category: string) {
    this.selectedCategories = this.selectedCategories.includes(category)
      ? this.selectedCategories.filter((c) => c !== category)
      : [...this.selectedCategories, category];

    this.updateRelatedCategories(); // Actualizar tras cada cambio
  }

  private cargarRecetaParaEdicion() {
    this.recipeService.getRecipe(this.id!).subscribe({
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
    const updateData: Partial<Recipe> = {};
    const form = this.form;

    // Detectar cambios solo en campos modificados (Dirty)
    if (form.get('title')?.dirty) {
      updateData.title = form.value.title?.trim();
    }

    if (form.get('description')?.dirty) {
      updateData.description = form.value.description?.trim();
    }

    if (form.get('ingredients')?.dirty) {
      updateData.ingredients = form.value.ingredients
        ?.split(',')
        .map((i) => i.trim());
    }

    if (form.get('steps')?.dirty) {
      updateData.steps = form.value.steps?.split('\n').map((p) => p.trim());
    }

    // Siempre incluir categorías (asumiendo que pueden cambiar)
    updateData.categories = this.selectedCategories;

    // Validar si hay datos para actualizar
    if (this.editando && this.id) {
      if (Object.keys(updateData).length === 0) {
        alert('No hay cambios para guardar');
        return;
      }

      const recipeToUpdate: Recipe = {
        ...updateData,
        _id: this.id,
      } as Recipe;

      this.recipeService.updateRecipe(recipeToUpdate).subscribe({
        next: () => this.router.navigate(['/recipes']),
        error: (err) => alert('Error: ' + err.message),
      });
    } else {
      // Lógica para nueva receta (original)
      const newRecipe: Omit<Recipe, '_id'> = {
        title: form.value.title!.trim(),
        description: form.value.description!.trim(),
        ingredients: form.value.ingredients!.split(',').map((i) => i.trim()),
        steps: form.value.steps!.split('\n').map((p) => p.trim()),
        categories: this.selectedCategories,
      };

      this.recipeService.addRecipe(newRecipe).subscribe({
        next: () => this.router.navigate(['/recipes']),
        error: (err) => alert('Error: ' + err.message),
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
