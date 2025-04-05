import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
} from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Recipe } from '../models/recipe.model';
import { PaginatedResponse } from '../models/paginated-response.model';

@Injectable({
  providedIn: 'root',
})
export class RecipeService {
  private apiUrl =
    'https://recipes-proyect-192uihszf-pincha1212s-projects.vercel.app';

  constructor(private http: HttpClient) {}

  // Obtener recetas (con headers anti-caché)
  getRecipes(params: {
    page: number;
    pageSize: number;
    q?: string;
    categories?: string[];
  }): Observable<PaginatedResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page.toString())
      .set('pageSize', params.pageSize.toString());

    if (params.q) httpParams = httpParams.set('q', params.q.trim());
    if (params.categories)
      httpParams = httpParams.set('categories', params.categories.join(','));

    return this.http.get<PaginatedResponse>(`${this.apiUrl}/recipes`, {
      params: httpParams,
      headers: new HttpHeaders({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      }),
    });
  }
  // Obtener receta por ID con tipado seguro
  getRecipe(id: string): Observable<Recipe> {
    // ← Cambia number a string
    return this.http.get<Recipe>(`${this.apiUrl}/recipes/${id}`);
  }

  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/recipes/categories`).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error cargando categorías:', error);
        return throwError(
          () => new Error('No se pudieron cargar las categorías')
        );
      })
    );
  }

  // Agregar nueva receta
  addRecipe(recipe: Omit<Recipe, '_id'>): Observable<Recipe> {
    // Limpieza profunda del objeto
    const cleanRecipe = {
      title: recipe.title.trim(),
      description: recipe.description.trim(),
      ingredients: [...recipe.ingredients],
      steps: [...recipe.steps],
      categories: [...recipe.categories],
      createdAt: new Date(), // Solo si está en la interfaz Recipe
    };

    // Eliminar cualquier _id residual
    if ('_id' in cleanRecipe) delete (cleanRecipe as any)._id;

    return this.http.post<Recipe>(`${this.apiUrl}/recipes`, cleanRecipe, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store', // Header permitido por CORS
      }),
    });
  }
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Error en addRecipe:', error);
    let errorMessage = 'Error al crear la receta';

    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del servidor
      errorMessage = `Código: ${error.status}\nMensaje: ${error.message}`;
    }

    return throwError(() => new Error(errorMessage));
  }

  /**
   * Sanitiza un array, asegurando que sea un array y limpiando sus elementos
   */
  private sanitizeArray(input: any): string[] {
    if (!Array.isArray(input)) return [];
    return input.map((item) =>
      typeof item === 'string' ? item.trim() : String(item)
    );
  }

  /**
   * Sanitiza categorías, asegurando formato consistente
   */
  private sanitizeCategories(categories: any): string[] {
    const sanitized = this.sanitizeArray(categories);
    return [...new Set(sanitized.map((c) => c.toLowerCase()))]; // Elimina duplicados
  }

  // Actualizar receta existente
  updateRecipe(recipe: Recipe): Observable<Recipe> {
    const { _id, ...cleanRecipe } = recipe;
    return this.http.put<Recipe>(`${this.apiUrl}/recipes/${_id}`, cleanRecipe);
  }

  // Eliminar receta (mejor tipado)
  deleteRecipe(id: string): Observable<void> {
    // ← Cambia number a string
    return this.http.delete<void>(`${this.apiUrl}/recipes/${id}`);
  }
}
