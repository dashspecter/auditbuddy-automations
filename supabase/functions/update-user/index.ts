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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify the requesting user using an anon client with their JWT header.
    // Using a separate anon-key client (same pattern as create-user) is more
    // reliable than calling auth.getUser(token) on the service-role admin client.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user has admin or company_owner/admin role
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const { data: companyRoles } = await supabaseAdmin
      .from('company_users')
      .select('company_role, company_id')
      .eq('user_id', user.id);

    const isAdmin = roles?.some((r: any) => r.role === 'admin');
    const isCompanyOwnerOrAdmin = companyRoles?.some((r: any) =>
      r.company_role === 'company_owner' || r.company_role === 'company_admin'
    );

    // Also check if user has manage_employees permission (for manager-level roles)
    let hasManageEmployeesPermission = false;
    if (companyRoles && companyRoles.length > 0) {
      const { data: permissions } = await supabaseAdmin
        .from('company_role_permissions')
        .select('permission')
        .eq('company_id', companyRoles[0].company_id)
        .eq('company_role', companyRoles[0].company_role)
        .eq('permission', 'manage_employees');

      hasManageEmployeesPermission = !!(permissions && permissions.length > 0);
    }

    if (!isAdmin && !isCompanyOwnerOrAdmin && !hasManageEmployeesPermission) {
      console.error('Insufficient permissions for user:', user.id,
        'isAdmin:', isAdmin,
        'isCompanyOwnerOrAdmin:', isCompanyOwnerOrAdmin,
        'hasManageEmployeesPermission:', hasManageEmployeesPermission
      );
      throw new Error('Insufficient permissions');
    }

    const { userId, email, fullName, password } = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    // Update password if provided
    if (password) {
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password }
      );
      if (passwordError) {
        console.error('Error updating password:', passwordError);
        throw passwordError;
      }
    }

    // Update email if provided
    if (email) {
      const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { email }
      );
      if (emailError) {
        console.error('Error updating email:', emailError);
        throw emailError;
      }
    }

    // Update profile if there's anything to update
    const updates: Record<string, string> = {};
    if (fullName !== undefined) updates.full_name = fullName;
    if (email) updates.email = email;

    if (Object.keys(updates).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw profileError;
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'User updated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    console.error('update-user error:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
