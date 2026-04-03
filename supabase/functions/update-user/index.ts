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

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    const { data: companyRoles } = await supabaseAdmin
      .from('company_users')
      .select('company_role, company_id')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin');
    const isCompanyOwnerOrAdmin = companyRoles?.some(r => 
      r.company_role === 'company_owner' || r.company_role === 'company_admin'
    );

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
      console.error('Insufficient permissions for user:', user.id);
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const body = await req.json();
    const { userId, email, fullName, password } = body;

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
        JSON.stringify({ error: `User account not found. The employee may not have a login account yet. Please create one first.` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
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

    // Update profile
    const updates: any = {};
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
