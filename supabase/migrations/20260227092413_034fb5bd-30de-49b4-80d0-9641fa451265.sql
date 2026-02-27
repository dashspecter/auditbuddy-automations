ALTER TABLE waste_products DROP CONSTRAINT waste_products_cost_model_v1;
ALTER TABLE waste_products ADD CONSTRAINT waste_products_cost_model_v1 
  CHECK (cost_model IN ('per_kg', 'per_unit'));