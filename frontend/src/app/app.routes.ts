import { Routes } from '@angular/router';
import { RecipeFormComponent } from './components/recipe-form/recipe-form.component';
import { RecipeListComponent } from './components/recipe-list/recipe-list.component';
import { RecipeDetailComponent } from './components/recipe-detail/recipe-detail.component';

export const routes: Routes = [
  { 
    path: '', 
    redirectTo: 'recipes', 
    pathMatch: 'full' 
  },
  {
    path: 'recipes',
    children: [
      { path: '', component: RecipeListComponent },
      { path: 'new', component: RecipeFormComponent },
      { path: ':id', component: RecipeDetailComponent },
      { path: 'edit/:id', component: RecipeFormComponent }
    ]
  }
];
