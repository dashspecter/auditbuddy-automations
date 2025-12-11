import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubmissionRequest {
  template_id: string;
  company_id: string;
  location_id?: string | null;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  raw_answers: Record<string, any>;
  overall_score?: number | null;
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

    const body: SubmissionRequest = await req.json();
    console.log('Received submission request:', JSON.stringify(body, null, 2));

    // Validate required fields
    if (!body.template_id || !body.company_id || !body.customer_name) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: template_id, company_id, customer_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
        JSON.stringify({ error: 'You have already submitted this survey today. Please try again tomorrow.' }),
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

    // Create the submission
    const { data: submission, error: submissionError } = await supabase
      .from('mystery_shopper_submissions')
      .insert({
        template_id: body.template_id,
        company_id: body.company_id,
        location_id: body.location_id || null,
        customer_name: body.customer_name,
        customer_email: body.customer_email || null,
        customer_phone: body.customer_phone || null,
        raw_answers: body.raw_answers,
        overall_score: body.overall_score || null,
      })
      .select()
      .single();

    if (submissionError) {
      console.error('Error creating submission:', submissionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create submission: ' + submissionError.message }),
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
        JSON.stringify({ error: 'Failed to create voucher: ' + voucherError.message }),
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
      JSON.stringify({ error: 'An unexpected error occurred: ' + (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
