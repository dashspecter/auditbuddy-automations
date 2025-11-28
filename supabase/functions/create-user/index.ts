import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase admin client with service role
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

    // Verify the requesting user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false
        },
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get request body
    const { email, password, role, full_name, companyId, companyRole } = await req.json();

    console.log('Received request:', { email, role, companyRole, companyId, hasPassword: !!password });

    // For company invitations, we need email, companyId, and companyRole
    if (companyId && companyRole) {
      if (!email) {
        throw new Error('Missing required field: email');
      }

      // Check if requesting user is a company owner or admin
      const { data: companyUser } = await supabaseAdmin
        .from('company_users')
        .select('company_role')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .single();

      if (!companyUser || (companyUser.company_role !== 'company_owner' && companyUser.company_role !== 'company_admin')) {
        throw new Error('Insufficient permissions to invite users to this company');
      }

      // Generate a temporary password
      const tempPassword = crypto.randomUUID();

      // Create the user using admin client
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: full_name || null
        }
      });

      if (createError) {
        console.error('Error creating user:', createError);
        throw createError;
      }

      console.log('User created:', newUser.user.id);

      // Add user to company
      const { error: companyUserError } = await supabaseAdmin
        .from('company_users')
        .insert({
          user_id: newUser.user.id,
          company_id: companyId,
          company_role: companyRole
        });

      if (companyUserError) {
        console.error('Error adding user to company:', companyUserError);
        throw companyUserError;
      }

      console.log('User added to company with role:', companyRole);

      // TODO: Send invitation email with password reset link

      return new Response(
        JSON.stringify({ 
          success: true, 
          user: newUser.user 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );

    } else {
      // Original flow for platform role creation
      if (!email || !password || !role) {
        throw new Error('Missing required fields: email, password, role');
      }

      // Check if user has admin or manager role
      const { data: roles } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const hasPermission = roles?.some(r => r.role === 'admin' || r.role === 'manager');
      if (!hasPermission) {
        throw new Error('Insufficient permissions');
      }

      // Create the user using admin client
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: full_name || null
        }
      });

      if (createError) throw createError;

      // Remove the default 'checker' role added by the trigger
      await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', newUser.user.id);

      // Add the specified role to user_roles table
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: newUser.user.id,
          role: role
        });

      if (roleError) throw roleError;

      return new Response(
        JSON.stringify({ 
          success: true, 
          user: newUser.user 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

  } catch (error) {
    console.error('Error creating user:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
