export interface Recipe {
  _id: string;
  title: string;
  description: string;
  ingredients: string[];
  steps: string[];
  categories: string[];
  createdAt?: Date;  // Agrega esta línea
  updatedAt?: Date;  // Opcional: si también necesitas esta propiedad
  imageUrls?: string[];
  authorId?: number;
}