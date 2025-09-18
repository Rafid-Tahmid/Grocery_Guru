USE wdc;

-- Remove the external_recipe_id column
ALTER TABLE saved_recipes DROP COLUMN external_recipe_id;