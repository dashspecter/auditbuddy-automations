-- Drop the existing check constraint
ALTER TABLE mystery_shopper_questions DROP CONSTRAINT IF EXISTS mystery_shopper_questions_question_type_check;

-- Add updated check constraint that includes 'photo'
ALTER TABLE mystery_shopper_questions ADD CONSTRAINT mystery_shopper_questions_question_type_check 
CHECK (question_type IN ('text', 'rating', 'yes_no', 'multiple_choice', 'photo'));