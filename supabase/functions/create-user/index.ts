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
    const { email, password, role, full_name, companyId, companyRole, employeeId } = await req.json();

    console.log('Received request:', { email, role, companyRole, companyId, employeeId, hasPassword: !!password });

    // For employee account creation
    if (employeeId) {
      if (!email || !full_name) {
        throw new Error('Missing required fields: email, full_name');
      }

      // Check if requesting user is a manager, admin, or company admin/owner
      const { data: roles } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const { data: companyRoles } = await supabaseAdmin
        .from('company_users')
        .select('company_role')
        .eq('user_id', user.id);

      const hasPlatformPermission = roles?.some(r => r.role === 'admin' || r.role === 'manager');
      const hasCompanyPermission = companyRoles?.some(r => r.company_role === 'company_owner' || r.company_role === 'company_admin');
      
      if (!hasPlatformPermission && !hasCompanyPermission) {
        throw new Error('Insufficient permissions');
      }

      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users.find(u => u.email === email);

      let targetUserId: string;

      if (existingUser) {
        console.log('User already exists, linking to employee:', existingUser.id);
        targetUserId = existingUser.id;

        // Check if this user is already linked to another employee
        const { data: existingEmployee } = await supabaseAdmin
          .from('employees')
          .select('id, full_name')
          .eq('user_id', existingUser.id)
          .single();

        if (existingEmployee && existingEmployee.id !== employeeId) {
          throw new Error(`This email is already linked to employee: ${existingEmployee.full_name}`);
        }
      } else {
        // Use provided password or generate a temporary one
        const userPassword = password || crypto.randomUUID();

        // Create the user using admin client
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: userPassword,
          email_confirm: true,
          user_metadata: {
            full_name: full_name
          }
        });

        if (createError) {
          console.error('Error creating user:', createError);
          throw createError;
        }

        console.log('Employee user created:', newUser.user.id);
        targetUserId = newUser.user.id;

        // Create profile for the new user
        await supabaseAdmin.from('profiles').upsert({
          id: targetUserId,
          email: email,
          full_name: full_name,
        }, { onConflict: 'id' });
      }

      // Link user to employee record
      const { error: employeeUpdateError } = await supabaseAdmin
        .from('employees')
        .update({ user_id: targetUserId })
        .eq('id', employeeId);

      if (employeeUpdateError) {
        console.error('Error linking user to employee:', employeeUpdateError);
        throw employeeUpdateError;
      }

      console.log('User linked to employee:', employeeId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          userId: targetUserId,
          wasExisting: !!existingUser,
          message: existingUser 
            ? 'Existing user account linked to employee.' 
            : 'Employee login account created. Use password reset to set their password.'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

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

      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users.find(u => u.email === email);

      let targetUserId: string;

      if (existingUser) {
        console.log('User already exists:', existingUser.id);
        targetUserId = existingUser.id;

        // Check if user is already in this company
        const { data: existingCompanyUser } = await supabaseAdmin
          .from('company_users')
          .select('id')
          .eq('user_id', existingUser.id)
          .eq('company_id', companyId)
          .single();

        if (existingCompanyUser) {
          throw new Error('User is already a member of this company');
        }

        // Ensure profile exists and is updated for existing users
        await supabaseAdmin.from('profiles').upsert({
          id: targetUserId,
          email: email,
          full_name: full_name || existingUser.user_metadata?.full_name || null,
        }, { onConflict: 'id' });
        console.log('Ensured profile for existing user');
      } else {
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
        targetUserId = newUser.user.id;

        // Create profile for the new user
        await supabaseAdmin.from('profiles').upsert({
          id: targetUserId,
          email: email,
          full_name: full_name || null,
        }, { onConflict: 'id' });
      }

      // Add user to company
      const { error: companyUserError } = await supabaseAdmin
        .from('company_users')
        .insert({
          user_id: targetUserId,
          company_id: companyId,
          company_role: companyRole
        });

      if (companyUserError) {
        console.error('Error adding user to company:', companyUserError);
        throw companyUserError;
      }

      console.log('User added to company with role:', companyRole);

      // Send invitation email with password setup link (only for new users)
      if (!existingUser) {
        try {
          // Generate password reset link
          const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: email,
          });

          if (resetError) {
            console.error('Error generating reset link:', resetError);
          } else if (resetData.properties?.action_link) {
            // Get company name
            const { data: companyData } = await supabaseAdmin
              .from('companies')
              .select('name')
              .eq('id', companyId)
              .single();

            const companyName = companyData?.name || 'the company';

            // Send invitation email using Resend
            const resendApiKey = Deno.env.get('RESEND_API_KEY');
            if (resendApiKey) {
              const emailResponse = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${resendApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: 'Dashspect <noreply@dashspect.com>',
                  to: [email],
                  subject: `You've been invited to join ${companyName}`,
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                      <h2>Welcome to ${companyName}!</h2>
                      <p>You've been invited to join ${companyName} on Dashspect.</p>
                      <p>Your role: <strong>${companyRole === 'company_admin' ? 'Admin' : 'Member'}</strong></p>
                      <p>To get started, please set up your password by clicking the button below:</p>
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetData.properties.action_link}" 
                           style="background-color: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                          Set Up Password
                        </a>
                      </div>
                      <p style="color: #666; font-size: 14px;">
                        This link will expire in 24 hours. If you didn't expect this invitation, you can safely ignore this email.
                      </p>
                    </div>
                  `,
                }),
              });

              if (!emailResponse.ok) {
                const emailError = await emailResponse.text();
                console.error('Error sending email:', emailError);
              } else {
                console.log('Invitation email sent successfully');
              }
            }
          }
        } catch (emailError) {
          console.error('Error in email sending process:', emailError);
          // Don't fail the entire operation if email fails
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          userId: targetUserId,
          wasExisting: !!existingUser
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

      // Create profile for the new user
      await supabaseAdmin.from('profiles').upsert({
        id: newUser.user.id,
        email: email,
        full_name: full_name || null,
      }, { onConflict: 'id' });

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
