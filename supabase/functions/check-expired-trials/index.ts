import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Find companies with expired trials and active status
    const { data: expiredCompanies, error: fetchError } = await supabaseAdmin
      .from('companies')
      .select('id, name, trial_ends_at, subscription_tier')
      .eq('status', 'active')
      .lt('trial_ends_at', new Date().toISOString())
      .eq('subscription_tier', 'starter') // Only pause free/starter tiers without payment
      .or('subscription_tier.eq.professional,subscription_tier.eq.enterprise'); // Keep paid subscriptions active

    if (fetchError) throw fetchError;

    const pausedCompanies = [];

    // Pause each expired trial company
    for (const company of expiredCompanies || []) {
      const { error: updateError } = await supabaseAdmin
        .from('companies')
        .update({ status: 'paused' })
        .eq('id', company.id);

      if (!updateError) {
        pausedCompanies.push(company);
        console.log(`Paused company: ${company.name} (${company.id})`);
      } else {
        console.error(`Error pausing company ${company.id}:`, updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Checked expired trials. Paused ${pausedCompanies.length} companies.`,
        pausedCompanies: pausedCompanies.map(c => ({ id: c.id, name: c.name })),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error checking expired trials:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});