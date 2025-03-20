import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RecipeService } from '../../services/recipe.service';
import { Recipe } from '../../models/recipe.model';

@Component({
  selector: 'app-recipe-detail',
  imports: [CommonModule],
  templateUrl: './recipe-detail.component.html',
  styleUrl: './recipe-detail.component.css'
})
export class RecipeDetailComponent implements OnInit {
  recipe: Recipe | null = null;
  
  // Inyecciones correctas
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private recipeService = inject(RecipeService);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.recipeService.getRecipe(id).subscribe({
        next: (recipe) => {
          console.log('Receta cargada:', recipe);
          this.recipe = recipe;
        },
        error: (err) => console.error('Error cargando receta:', err)
      });
    }
  }

  editarReceta() {
    const id = this.route.snapshot.paramMap.get('id');
    this.router.navigate(['/recipes/edit', id]);
  }

  volver() {
    this.router.navigate(['/recipes']);
  }
}