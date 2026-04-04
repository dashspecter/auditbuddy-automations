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
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const body = await req.json();
    const { userId, email, fullName, password, employeeId } = body;

    if (!userId || typeof userId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Valid userId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Verify the target auth user exists before attempting updates
    const { data: targetUserData, error: targetUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (targetUserError || !targetUserData?.user) {
      console.error('Target user not found:', userId, targetUserError?.message);
      return new Response(
        JSON.stringify({ error: 'User account not found. The employee may not have a login account yet. Please create one first.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Cross-verify employee linkage when employeeId is provided
    if (employeeId) {
      const { data: empRecord, error: empError } = await supabaseAdmin
        .from('employees')
        .select('id, user_id, email')
        .eq('id', employeeId)
        .single();

      if (empError || !empRecord) {
        console.error('Employee not found for cross-check:', employeeId);
        return new Response(
          JSON.stringify({ error: 'Employee record not found for verification.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      if (empRecord.user_id !== userId) {
        console.error('Employee/user mismatch:', { employeeId, employeeUserId: empRecord.user_id, requestedUserId: userId });
        return new Response(
          JSON.stringify({ error: 'Employee is not linked to this login account. Please re-link the account first.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Verify auth email matches employee email
      if (empRecord.email && targetUserData.user.email &&
          empRecord.email.toLowerCase() !== targetUserData.user.email.toLowerCase()) {
        console.error('Email mismatch:', { employeeEmail: empRecord.email, authEmail: targetUserData.user.email });
        return new Response(
          JSON.stringify({ error: `Email mismatch: employee email (${empRecord.email}) does not match login email (${targetUserData.user.email}). Please fix the linkage first.` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    // Update password if provided
    if (password) {
      if (typeof password !== 'string' || password.length < 6) {
        return new Response(
          JSON.stringify({ error: 'Password must be at least 6 characters' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      if (passwordError) {
        console.error('Password update failed:', passwordError.message);
        return new Response(
          JSON.stringify({ error: `Password update failed: ${passwordError.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    // Update email if provided
    if (email) {
      const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(userId, { email });
      if (emailError) {
        console.error('Email update failed:', emailError.message);
        return new Response(
          JSON.stringify({ error: `Email update failed: ${emailError.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
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
        console.error('Profile update failed:', profileError.message);
        // Non-fatal — auth update already succeeded
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'User updated successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('update-user error:', error?.message || error);
    return new Response(
      JSON.stringify({ error: error?.message || 'An unexpected error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
