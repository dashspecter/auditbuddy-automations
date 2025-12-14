import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation helper functions
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function isValidEmail(str: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(str);
}

function isValidPhone(str: string): boolean {
  // Allow various phone formats, 5-20 chars
  const phoneRegex = /^[\d\s\-+()]{5,20}$/;
  return phoneRegex.test(str);
}

function sanitizeString(str: string, maxLength: number): string {
  if (typeof str !== 'string') return '';
  // Remove any HTML tags and trim
  return str.replace(/<[^>]*>/g, '').trim().slice(0, maxLength);
}

function validateAnswerValue(value: unknown): boolean {
  // Allow strings, numbers, booleans, and arrays of strings
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(item => typeof item === 'string' || typeof item === 'number');
  }
  return false;
}

function validateAndSanitizeAnswers(answers: unknown): Record<string, unknown> | null {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return null;
  }
  
  const sanitized: Record<string, unknown> = {};
  const entries = Object.entries(answers as Record<string, unknown>);
  
  // Limit number of answer fields
  if (entries.length > 100) {
    console.error('Too many answer fields:', entries.length);
    return null;
  }
  
  for (const [key, value] of entries) {
    // Validate key
    if (typeof key !== 'string' || key.length > 100) {
      console.error('Invalid answer key:', key);
      return null;
    }
    
    // Validate value
    if (!validateAnswerValue(value)) {
      console.error('Invalid answer value for key:', key);
      return null;
    }
    
    // Sanitize string values
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value, 5000);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(v => 
        typeof v === 'string' ? sanitizeString(v, 1000) : v
      );
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

interface SubmissionRequest {
  template_id: string;
  company_id: string;
  location_id?: string | null;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  raw_answers: Record<string, unknown>;
  overall_score?: number | null;
}

function validateRequest(body: unknown): { valid: true; data: SubmissionRequest } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }
  
  const req = body as Record<string, unknown>;
  
  // Validate template_id (required, UUID)
  if (!req.template_id || typeof req.template_id !== 'string' || !isValidUUID(req.template_id)) {
    return { valid: false, error: 'Invalid or missing template_id (must be a valid UUID)' };
  }
  
  // Validate company_id (required, UUID)
  if (!req.company_id || typeof req.company_id !== 'string' || !isValidUUID(req.company_id)) {
    return { valid: false, error: 'Invalid or missing company_id (must be a valid UUID)' };
  }
  
  // Validate location_id (optional, UUID if provided)
  if (req.location_id !== undefined && req.location_id !== null) {
    if (typeof req.location_id !== 'string' || !isValidUUID(req.location_id)) {
      return { valid: false, error: 'Invalid location_id (must be a valid UUID)' };
    }
  }
  
  // Validate customer_name (required, 1-100 chars)
  if (!req.customer_name || typeof req.customer_name !== 'string') {
    return { valid: false, error: 'Missing customer_name' };
  }
  const sanitizedName = sanitizeString(req.customer_name, 100);
  if (sanitizedName.length < 1) {
    return { valid: false, error: 'Customer name cannot be empty' };
  }
  
  // Validate customer_email (optional, valid email if provided)
  let sanitizedEmail: string | null = null;
  if (req.customer_email !== undefined && req.customer_email !== null && req.customer_email !== '') {
    if (typeof req.customer_email !== 'string' || !isValidEmail(req.customer_email)) {
      return { valid: false, error: 'Invalid customer_email format' };
    }
    sanitizedEmail = sanitizeString(req.customer_email, 255);
  }
  
  // Validate customer_phone (optional, valid phone if provided)
  let sanitizedPhone: string | null = null;
  if (req.customer_phone !== undefined && req.customer_phone !== null && req.customer_phone !== '') {
    if (typeof req.customer_phone !== 'string' || !isValidPhone(req.customer_phone)) {
      return { valid: false, error: 'Invalid customer_phone format' };
    }
    sanitizedPhone = sanitizeString(req.customer_phone, 20);
  }
  
  // Validate raw_answers
  const sanitizedAnswers = validateAndSanitizeAnswers(req.raw_answers);
  if (sanitizedAnswers === null) {
    return { valid: false, error: 'Invalid raw_answers format (must be an object with valid values)' };
  }
  
  // Check payload size limit (50KB for answers)
  const answersSize = JSON.stringify(sanitizedAnswers).length;
  if (answersSize > 50000) {
    return { valid: false, error: 'Answers payload too large (max 50KB)' };
  }
  
  // Validate overall_score (optional, 0-100 if provided)
  let overallScore: number | null = null;
  if (req.overall_score !== undefined && req.overall_score !== null) {
    if (typeof req.overall_score !== 'number' || req.overall_score < 0 || req.overall_score > 100) {
      return { valid: false, error: 'Invalid overall_score (must be a number between 0 and 100)' };
    }
    overallScore = req.overall_score;
  }
  
  return {
    valid: true,
    data: {
      template_id: req.template_id as string,
      company_id: req.company_id as string,
      location_id: (req.location_id as string) || null,
      customer_name: sanitizedName,
      customer_email: sanitizedEmail,
      customer_phone: sanitizedPhone,
      raw_answers: sanitizedAnswers,
      overall_score: overallScore,
    }
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse and validate request body
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      console.error('Failed to parse request JSON');
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Received submission request');
    
    // Validate and sanitize the request
    const validation = validateRequest(rawBody);
    if (!validation.valid) {
      console.error('Validation failed:', validation.error);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const body = validation.data;

    // Check if this customer already submitted today
    const today = new Date().toISOString().split('T')[0];
    
    let duplicateQuery = supabase
      .from('mystery_shopper_submissions')
      .select('id')
      .eq('template_id', body.template_id)
      .gte('submitted_at', `${today}T00:00:00Z`)
      .lt('submitted_at', `${today}T23:59:59Z`);

    if (body.customer_email) {
      duplicateQuery = duplicateQuery.eq('customer_email', body.customer_email);
    } else if (body.customer_phone) {
      duplicateQuery = duplicateQuery.eq('customer_phone', body.customer_phone);
    }

    const { data: existingSubmission, error: checkError } = await duplicateQuery.maybeSingle();
    
    if (checkError) {
      console.error('Error checking for duplicates:', checkError);
    }

    if (existingSubmission) {
      console.log('Duplicate submission detected');
      return new Response(
        JSON.stringify({ error: 'You have already submitted this survey today. Please try again with your next order.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get template to create voucher
    const { data: template, error: templateError } = await supabase
      .from('mystery_shopper_templates')
      .select('*')
      .eq('id', body.template_id)
      .single();

    if (templateError || !template) {
      console.error('Template not found:', templateError);
      return new Response(
        JSON.stringify({ error: 'Template not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Template found:', template.name);

    // Create the submission with validated and sanitized data
    const { data: submission, error: submissionError } = await supabase
      .from('mystery_shopper_submissions')
      .insert({
        template_id: body.template_id,
        company_id: body.company_id,
        location_id: body.location_id,
        customer_name: body.customer_name,
        customer_email: body.customer_email,
        customer_phone: body.customer_phone,
        raw_answers: body.raw_answers,
        overall_score: body.overall_score,
      })
      .select()
      .single();

    if (submissionError) {
      console.error('Error creating submission:', submissionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create submission' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Submission created:', submission.id);

    // Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (template.voucher_expiry_days || 30));

    // Create voucher
    const { data: voucher, error: voucherError } = await supabase
      .from('vouchers')
      .insert({
        company_id: body.company_id,
        location_ids: template.default_location_ids || [],
        customer_name: body.customer_name,
        value: template.voucher_value,
        currency: template.voucher_currency || 'RON',
        brand_logo_url: template.brand_logo_url,
        terms_text: template.voucher_terms_text,
        expires_at: expiresAt.toISOString(),
        linked_submission_id: submission.id,
      })
      .select()
      .single();

    if (voucherError) {
      console.error('Error creating voucher:', voucherError);
      return new Response(
        JSON.stringify({ error: 'Failed to create voucher' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Voucher created:', voucher.code);

    // Update submission with voucher_id
    await supabase
      .from('mystery_shopper_submissions')
      .update({ voucher_id: voucher.id })
      .eq('id', submission.id);

    console.log('Submission complete, returning voucher');

    return new Response(
      JSON.stringify({ submission, voucher }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
