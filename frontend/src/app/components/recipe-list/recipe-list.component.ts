// recipe-list.component.ts
import { Component, inject, signal } from '@angular/core';
import { RecipeService } from '../../services/recipe.service';
import { Recipe } from '../../models/recipe.model';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, takeUntil } from 'rxjs';

@Component({
  selector: 'app-recipe-list',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './recipe-list.component.html',
  styleUrl: './recipe-list.component.css',
})
export class RecipeListComponent {
  private recipeService = inject(RecipeService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();


  // Signals
  recetas = signal<Recipe[]>([]);
  currentPage = signal<number>(1);
  pageSize = signal<number>(6);
  totalPages = signal<number>(0);
  totalRecipes = signal<number>(0);
  loading = signal<boolean>(false);

  // Filtros
  allCategories: string[] = [];
  selectedCategories: string[] = [];
  showFilters = false;
  searchQuery = '';
  searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject.pipe(debounceTime(300)).subscribe(() => {
      this.loadRecipes();
    });
    this.loadRecipes();
    this.loadCategories();
  }

  ngOnInit() {
    this.searchSubject.pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    ).subscribe(() => this.loadRecipes());
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Métodos públicos para el template
  toggleFilterPanel(): void {
    this.showFilters = !this.showFilters;
  }

  removeCategory(category: string): void {
    this.selectedCategories = this.selectedCategories.filter(
      (c) => c !== category
    );
    this.currentPage.set(1);
    this.loadRecipes();
  }

  clearFilters(): void {
    this.selectedCategories = [];
    this.currentPage.set(1);
    this.loadRecipes();
  }

  onSearch(): void {
    this.searchSubject.next(this.searchQuery);
  }

  toggleCategoryFilter(category: string): void {
    const index = this.selectedCategories.indexOf(category);
    if (index === -1) {
      this.selectedCategories.push(category);
    } else {
      this.selectedCategories.splice(index, 1);
    }
    this.currentPage.set(1);
    this.loadRecipes();
  }

  changePageSize(newSize: number): void {
    this.pageSize.set(Number(newSize));
    this.currentPage.set(1);
    this.loadRecipes();
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((v) => v + 1);
      this.loadRecipes();
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((v) => v - 1);
      this.loadRecipes();
    }
  }

  verReceta(recipeId: string): void {
    if (!recipeId) {
      console.error('ID de receta inválido');
      return;
    }
    this.router.navigate(['/recipes', recipeId]);
  }
  
  editarReceta(recipe: Recipe): void {
    const recipeId = recipe._id; // ← Usa _id en lugar de id
    this.router.navigate(['/recipes/edit', recipeId]);
  }
  eliminarReceta(recipeId: string): void {
    if (!recipeId) {
      console.error('ID de receta inválido');
      return;
    }
  
    if (confirm('¿Estás seguro de eliminar esta receta?')) {
      this.recipeService.deleteRecipe(recipeId).subscribe({
        next: () => this.loadRecipes(),
        error: (err) => console.error('Error al eliminar:', err),
      });
    }
  }

  // Métodos de carga de datos
  public loadRecipes(): void {
    this.loading.set(true);
    const params = {
      page: this.currentPage(),
      pageSize: this.pageSize(),
      q: this.searchQuery.trim(),
      categories: this.selectedCategories,
    };

    this.recipeService.getRecipes(params).subscribe({
      next: (response) => {
        this.recetas.set(response.data);
        this.totalRecipes.set(response.total);
        this.totalPages.set(response.totalPages);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error:', err);
        this.loading.set(false);
      },
    });
  }

  private loadCategories(): void {
    this.recipeService
      .getCategories()
      .subscribe((cats) => (this.allCategories = cats));
  }
}
