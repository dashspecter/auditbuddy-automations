

# Fix: Update `waste_products_cost_model_v1` CHECK Constraint

## Root Cause
The database CHECK constraint `waste_products_cost_model_v1` is defined as:
```sql
CHECK (cost_model = 'per_kg')
```
It only allows `per_kg`, blocking `per_unit` values.

## Fix

### 1. Database migration — drop old constraint, add updated one
```sql
ALTER TABLE waste_products DROP CONSTRAINT waste_products_cost_model_v1;
ALTER TABLE waste_products ADD CONSTRAINT waste_products_cost_model_v1 
  CHECK (cost_model IN ('per_kg', 'per_unit'));
```

No code changes needed — the UI already sends the correct values.

