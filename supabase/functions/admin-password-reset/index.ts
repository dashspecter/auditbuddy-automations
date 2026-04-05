import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, newPassword } = await req.json();

    if (email !== 'alex@grecea.work') {
      return new Response(JSON.stringify({ error: 'Only the platform admin account can be reset here' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Find the user by listing and filtering
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (listError) throw listError;

    const targetUser = listData.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    if (!targetUser) throw new Error('User not found');

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
      password: newPassword,
    });

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true, userId: targetUser.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500
    });
  }
});
