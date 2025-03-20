import { Recipe } from "./recipe.model";

export interface PaginatedResponse {
    data: Recipe[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }