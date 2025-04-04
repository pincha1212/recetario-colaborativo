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
    'https://recipes-proyect-91vdnppza-pincha1212s-projects.vercel.app';

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

    return this.http.get<PaginatedResponse>(`${this.apiUrl}/recipes`, {
      params,
    });
  }

  // Obtener receta por ID con tipado seguro
  getRecipe(id: string): Observable<Recipe> {
    // ← Cambia number a string
    return this.http.get<Recipe>(`${this.apiUrl}/recipes/${id}`);
  }

  // ✅ Correcto
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
  const cleanRecipe: Omit<Recipe, '_id'> = {
    title: recipe.title.trim(),
    description: recipe.description.trim(),
    ingredients: [...recipe.ingredients], // Copia fresca del array
    steps: [...recipe.steps], // Copia fresca del array
    categories: [...recipe.categories], // Copia fresca del array
    // Eliminar cualquier propiedad residual
    ...(recipe.imageUrls && { imageUrls: [...recipe.imageUrls] }),
    ...(recipe.authorId && { authorId: recipe.authorId })
  };

  // Validación final para eliminar _id
  if ('_id' in cleanRecipe) {
    delete (cleanRecipe as any)._id;
  }

  return this.http.post<Recipe>(`${this.apiUrl}/recipes`, cleanRecipe).pipe(
    catchError(error => {
      console.error('Error en addRecipe:', error);
      return throwError(() => new Error('Error al crear la receta'));
    })
  );
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

  // Manejo centralizado de errores
  private handleError(error: HttpErrorResponse) {
    console.error('Error en la solicitud:', error);
    return throwError(
      () => new Error('Error en la operación. Por favor intenta de nuevo.')
    );
  }
}
