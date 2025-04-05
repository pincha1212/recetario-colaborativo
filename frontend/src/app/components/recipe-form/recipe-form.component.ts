import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormsModule,
  Validators,
} from '@angular/forms';
import { RecipeService } from '../../services/recipe.service';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
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

  // Subject para manejar cambios en categorías
  private categoryChanges = new Subject<void>();

  form = this.fb.group({
    title: ['', [Validators.minLength(3)]],
    description: ['', [Validators.minLength(10)]],
    ingredients: [''],
    steps: [''],
  });

  private recipeService = inject(RecipeService);

  constructor(private cdRef: ChangeDetectorRef) {}

  ngOnInit() {
    this.id = this.route.snapshot.params['id'];
    this.editando = !!this.id;

    // Suscripción a cambios en categorías
    this.categoryChanges.pipe(debounceTime(300)).subscribe(() => {
      this.updateRelatedCategories();
    });

    // Cargar categorías
    this.recipeService.getCategories().subscribe({
      next: (cats: string[]) => {
        this.allCategories = cats;
        if (this.editando && this.id) this.cargarRecetaParaEdicion();
      },
      error: (err) => console.error('Error cargando categorías:', err),
    });
  }

  private updateRelatedCategories() {
    const searchTerms = [
      this.form.value.title || '',
      this.form.value.description || '',
      this.form.value.ingredients || '',
      this.form.value.steps || '',
    ].join(' ');

    const normalizedTerms = this.normalizeText(searchTerms);

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

  get unselectedCategories(): string[] {
    return this.allCategories.filter(
      (cat) => !this.selectedCategories.includes(cat)
    );
  }

  toggleCategory(category: string) {
    this.selectedCategories = this.selectedCategories.includes(category)
      ? this.selectedCategories.filter((c) => c !== category)
      : [...this.selectedCategories, category];

    this.categoryChanges.next();
    this.form.markAsPristine(); // Mantener el formulario como "no modificado"
    this.cdRef.detectChanges();
  }

  private cargarRecetaParaEdicion() {
    this.recipeService.getRecipe(this.id!).subscribe({
      next: (recipe) => {
        recipe.categories.forEach((cat: string) => {
          if (!this.allCategories.includes(cat.toLowerCase())) {
            this.allCategories = [...this.allCategories, cat];
          }
        });

        this.selectedCategories = [...recipe.categories];

        this.form.patchValue({
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
    // Validación inicial del formulario
    if (this.form.invalid) {
      alert('Completa todos los campos requeridos');
      return;
    }

    // Obtener valores del formulario con seguridad
    const formData = this.form.value;

    // Validación exhaustiva TypeScript-safe
    if (!formData.title?.trim() || !formData.description?.trim()) {
      alert('Título y descripción son campos obligatorios');
      return;
    }

    // Aserción TypeScript de valores no nulos
    const safeData = {
      title: formData.title!.trim(), // <-- Operador de aserción no nula
      description: formData.description!.trim(),
      ingredients: formData.ingredients?.split(',')?.map((i) => i.trim()) || [],
      steps: formData.steps?.split('\n')?.map((p) => p.trim()) || [],
    };

    // Validación adicional de arrays
    if (!Array.isArray(safeData.ingredients)) safeData.ingredients = [];
    if (!Array.isArray(safeData.steps)) safeData.steps = [];

    this.recipeService
      .addRecipe({
        title: safeData.title,
        description: safeData.description,
        ingredients: safeData.ingredients,
        steps: safeData.steps,
        categories: this.selectedCategories,
      })
      .subscribe({
        next: () => {
          // Limpieza completa del estado
          this.form.reset();
          this.selectedCategories = [];
          this.newCategory = '';
          this.filteredCategories = [];
          this.contextualCategories = [];

          // Recarga inteligente (alternativa moderna a location.reload())
          this.router
            .navigateByUrl('/', { skipLocationChange: true })
            .then(() => this.router.navigate(['/recipes']));
        },
        error: (err) => {
          console.error('Error creación receta:', err);
          alert('Error al guardar: ' + err.message);
        },
      });
  }
  volver() {
    this.router.navigate(['/recipes']);
  }

  addNewCategory() {
    const newCat = this.newCategory.trim().toLowerCase();

    if (!newCat) return;

    // Agregar a todas las categorías si no existe
    if (!this.allCategories.includes(newCat)) {
      this.allCategories = [...this.allCategories, newCat];
    }

    // Agregar a seleccionadas si no está
    if (!this.selectedCategories.includes(newCat)) {
      this.selectedCategories = [...this.selectedCategories, newCat];
    }

    // Resetear estado
    this.newCategory = '';
    this.filteredCategories = [];
    this.categoryChanges.next(); // Actualizar grid dinámico
  }

  // Cambia la firma del método
  handleCategoryEnter(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    keyboardEvent.preventDefault();
    keyboardEvent.stopPropagation();
    this.addNewCategory();
  }
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

  selectCategory(category: string): void {
    this.toggleCategory(category);
    this.newCategory = '';
    this.filteredCategories = [];
  }
}
