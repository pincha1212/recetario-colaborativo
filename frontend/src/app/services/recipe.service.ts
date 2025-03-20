import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
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
    'https://recipes-proyect-qov0j60ty-pincha1212s-projects.vercel.app/recipes';

  constructor(private http: HttpClient) {}

  // Obtener todas las recetas con manejo de errores
  getRecipes(params: {
    page: number;
    pageSize: number;
    q?: string;
    categories?: string[];
  }): Observable<PaginatedResponse> {
    let httpParams = new HttpParams()
      .set('page', params.page.toString())
      .set('pageSize', params.pageSize.toString());

    if (params.q && params.q.trim()) {
      httpParams = httpParams.set('q', params.q.trim());
    }

    if (params.categories && params.categories.length > 0) {
      httpParams = httpParams.set('categories', params.categories.join(','));
    }

    return this.http.get<PaginatedResponse>(this.apiUrl, {
      params: httpParams,
    });
  }

  // Obtener receta por ID con tipado seguro
  getRecipe(id: string): Observable<Recipe> {
    // ← Cambia number a string
    return this.http.get<Recipe>(`${this.apiUrl}/${id}`);
  }

  // ✅ Correcto
  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/categories`).pipe(
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
    return this.http.post<Recipe>(this.apiUrl, {
      title: recipe.title,
      description: recipe.description,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      categories: recipe.categories,
    });
  }

  // Actualizar receta existente
  updateRecipe(recipe: Recipe): Observable<Recipe> {
    return this.http.put<Recipe>(`${this.apiUrl}/${recipe._id}`, recipe); // ← Usa _id de MongoDB
  }

  // Eliminar receta (mejor tipado)
  deleteRecipe(id: string): Observable<void> {
    // ← Cambia number a string
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Manejo centralizado de errores
  private handleError(error: HttpErrorResponse) {
    console.error('Error en la solicitud:', error);
    return throwError(
      () => new Error('Error en la operación. Por favor intenta de nuevo.')
    );
  }
}
