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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: authHeader } }
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { email, password, role, full_name, companyId, companyRole, employeeId } = await req.json();

    console.log('Received request:', { email, role, companyRole, companyId, employeeId, hasPassword: !!password });

    // ─── EMPLOYEE ACCOUNT CREATION ───
    if (employeeId) {
      if (!email || !full_name) {
        throw new Error('Missing required fields: email, full_name');
      }

      // Permission check
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

      // Fetch the employee record first to check current state
      const { data: employeeRecord, error: empError } = await supabaseAdmin
        .from('employees')
        .select('id, full_name, email, user_id')
        .eq('id', employeeId)
        .single();

      if (empError || !employeeRecord) {
        throw new Error('Employee not found');
      }

      // If employee already has a linked user_id, verify the email matches
      if (employeeRecord.user_id) {
        const { data: linkedAuth } = await supabaseAdmin.auth.admin.getUserById(employeeRecord.user_id);
        if (linkedAuth?.user) {
          if (linkedAuth.user.email?.toLowerCase() === email.toLowerCase()) {
            // Already correctly linked — optionally update password
            if (password) {
              await supabaseAdmin.auth.admin.updateUser(employeeRecord.user_id, { password });
              console.log('Password updated for already-linked account');
            }
            return new Response(
              JSON.stringify({
                success: true,
                userId: employeeRecord.user_id,
                action: 'already_linked',
                loginEmail: linkedAuth.user.email,
                message: 'Employee already has a matching login account.'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
          } else {
            // MISMATCH: linked auth email ≠ requested email → detach and proceed
            console.warn(`Email mismatch: employee wants ${email}, linked auth is ${linkedAuth.user.email}. Detaching.`);
            await supabaseAdmin
              .from('employees')
              .update({ user_id: null })
              .eq('id', employeeId);
          }
        } else {
          // Linked user_id points to a deleted/invalid auth account → detach
          console.warn('Linked user_id points to invalid auth account. Detaching.');
          await supabaseAdmin
            .from('employees')
            .update({ user_id: null })
            .eq('id', employeeId);
        }
      }

      // Now find or create the auth account for the requested email
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      let existingUser: any = null;
      if (existingProfile) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(existingProfile.id);
        if (userData?.user && userData.user.email?.toLowerCase() === email.toLowerCase()) {
          existingUser = userData.user;
        }
      }

      let targetUserId: string;
      let action: string;

      if (existingUser) {
        console.log('Found existing auth account with matching email:', existingUser.id);
        targetUserId = existingUser.id;
        action = 'linked_existing';

        // Check if this user is already linked to a DIFFERENT employee
        const { data: otherEmployee } = await supabaseAdmin
          .from('employees')
          .select('id, full_name')
          .eq('user_id', existingUser.id)
          .neq('id', employeeId)
          .maybeSingle();

        if (otherEmployee) {
          throw new Error(`This email is already linked to employee: ${otherEmployee.full_name}`);
        }

        // Update password if provided so the entered password actually works
        if (password) {
          await supabaseAdmin.auth.admin.updateUser(targetUserId, { password });
          console.log('Password updated for existing account');
        }
      } else {
        // Create a brand new auth account
        const userPassword = password || crypto.randomUUID();

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: userPassword,
          email_confirm: true,
          user_metadata: { full_name }
        });

        if (createError) {
          console.error('Error creating user:', createError);
          throw createError;
        }

        console.log('Employee user created:', newUser.user.id);
        targetUserId = newUser.user.id;
        action = 'created_new';

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

      console.log('User linked to employee:', employeeId, 'action:', action);

      return new Response(
        JSON.stringify({
          success: true,
          userId: targetUserId,
          action,
          loginEmail: email,
          wasExisting: action === 'linked_existing',
          message: action === 'created_new'
            ? 'New login account created successfully.'
            : 'Existing account linked to employee.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // ─── COMPANY INVITATION ───
    if (companyId && companyRole) {
      if (!email) {
        throw new Error('Missing required field: email');
      }

      const { data: companyUser } = await supabaseAdmin
        .from('company_users')
        .select('company_role')
        .eq('user_id', user.id)
        .eq('company_id', companyId)
        .single();

      if (!companyUser || (companyUser.company_role !== 'company_owner' && companyUser.company_role !== 'company_admin')) {
        throw new Error('Insufficient permissions to invite users to this company');
      }

      const { data: existingProfileInvite } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      let existingUser: any = null;
      if (existingProfileInvite) {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(existingProfileInvite.id);
        existingUser = userData?.user ?? null;
      }

      let targetUserId: string;

      if (existingUser) {
        console.log('User already exists:', existingUser.id);
        targetUserId = existingUser.id;

        const { data: existingCompanyUser } = await supabaseAdmin
          .from('company_users')
          .select('id')
          .eq('user_id', existingUser.id)
          .eq('company_id', companyId)
          .single();

        if (existingCompanyUser) {
          throw new Error('User is already a member of this company');
        }

        await supabaseAdmin.from('profiles').upsert({
          id: targetUserId,
          email: email,
          full_name: full_name || existingUser.user_metadata?.full_name || null,
        }, { onConflict: 'id' });
      } else {
        const tempPassword = crypto.randomUUID();

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name: full_name || null }
        });

        if (createError) {
          console.error('Error creating user:', createError);
          throw createError;
        }

        console.log('User created:', newUser.user.id);
        targetUserId = newUser.user.id;

        await supabaseAdmin.from('profiles').upsert({
          id: targetUserId,
          email: email,
          full_name: full_name || null,
        }, { onConflict: 'id' });
      }

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

      if (!existingUser) {
        try {
          const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: email,
          });

          if (resetError) {
            console.error('Error generating reset link:', resetError);
          } else if (resetData.properties?.action_link) {
            const { data: companyData } = await supabaseAdmin
              .from('companies')
              .select('name')
              .eq('id', companyId)
              .single();

            const companyName = companyData?.name || 'the company';

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
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          userId: targetUserId,
          wasExisting: !!existingUser
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );

    } else {
      // ─── PLATFORM ROLE CREATION ───
      if (!email || !password || !role) {
        throw new Error('Missing required fields: email, password, role');
      }

      const { data: roles } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const hasPermission = roles?.some(r => r.role === 'admin' || r.role === 'manager');
      if (!hasPermission) {
        throw new Error('Insufficient permissions');
      }

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || null }
      });

      if (createError) throw createError;

      await supabaseAdmin.from('profiles').upsert({
        id: newUser.user.id,
        email: email,
        full_name: full_name || null,
      }, { onConflict: 'id' });

      await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', newUser.user.id);

      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: newUser.user.id,
          role: role
        });

      if (roleError) throw roleError;

      return new Response(
        JSON.stringify({ success: true, user: newUser.user }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

  } catch (error) {
    console.error('Error creating user:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
