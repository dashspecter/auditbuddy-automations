import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the user making the request
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user has admin or company_owner role
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    const { data: companyRoles } = await supabaseAdmin
      .from('company_users')
      .select('company_role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin');
    const isCompanyOwner = companyRoles?.some(r => r.company_role === 'company_owner');

    if (!isAdmin && !isCompanyOwner) {
      throw new Error('Insufficient permissions');
    }

    const { userId, email, fullName, password } = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Update auth user email if provided
    if (email) {
      const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { email }
      );
      if (emailError) throw emailError;
    }

    // Update password if provided
    if (password) {
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password }
      );
      if (passwordError) throw passwordError;
    }

    // Update profile
    const updates: any = {};
    if (fullName !== undefined) updates.full_name = fullName;
    if (email) updates.email = email;

    if (Object.keys(updates).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (profileError) throw profileError;
    }

    return new Response(
      JSON.stringify({ success: true, message: 'User updated successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An error occurred' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
