import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const Resend = (await import('https://esm.sh/resend@4.0.0')).Resend;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Document {
  id: string;
  title: string;
  document_type: string;
  renewal_date: string;
  notification_email: string;
  location_name?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // Calculate the date 14 days from now
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 14);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    console.log(`Checking for renewals on ${targetDateStr}`);

    // Query documents that need renewal reminders
    const { data: documents, error: queryError } = await supabase
      .from('documents')
      .select(`
        id,
        title,
        document_type,
        renewal_date,
        notification_email,
        location_id,
        locations (
          name
        )
      `)
      .eq('renewal_date', targetDateStr)
      .not('notification_email', 'is', null)
      .in('document_type', ['permit', 'contract']);

    if (queryError) {
      console.error('Error querying documents:', queryError);
      throw queryError;
    }

    console.log(`Found ${documents?.length || 0} documents requiring renewal reminders`);

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No renewal reminders to send', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email reminders
    const emailResults = [];
    for (const doc of documents) {
      try {
        const locationName = (doc as any).locations?.name || 'Not specified';
        const docType = doc.document_type === 'permit' ? 'Permit' : 'Contract';

        const emailData = await resend.emails.send({
          from: 'DashSpect <onboarding@resend.dev>',
          to: [doc.notification_email],
          subject: `${docType} Renewal Reminder: ${doc.title}`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
                  <h1 style="color: #2563eb; margin-top: 0;">Renewal Reminder</h1>
                  <p style="font-size: 16px; margin-bottom: 24px;">
                    This is a reminder that the following ${docType.toLowerCase()} will expire in 14 days:
                  </p>
                  
                  <div style="background-color: white; border-left: 4px solid #2563eb; padding: 20px; margin-bottom: 24px; border-radius: 4px;">
                    <h2 style="margin-top: 0; color: #1e40af;">${doc.title}</h2>
                    <p style="margin: 8px 0;">
                      <strong>Type:</strong> ${docType}
                    </p>
                    <p style="margin: 8px 0;">
                      <strong>Location:</strong> ${locationName}
                    </p>
                    <p style="margin: 8px 0;">
                      <strong>Renewal Date:</strong> ${new Date(doc.renewal_date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>

                  <p style="font-size: 14px; color: #666;">
                    Please take the necessary steps to renew this ${docType.toLowerCase()} before it expires.
                  </p>
                </div>

                <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px;">
                  <p>This is an automated reminder from DashSpect</p>
                  <p>Please do not reply to this email</p>
                </div>
              </body>
            </html>
          `,
        });

        console.log(`Email sent successfully to ${doc.notification_email} for document: ${doc.title}`);
        emailResults.push({
          documentId: doc.id,
          title: doc.title,
          email: doc.notification_email,
          status: 'sent',
          emailId: emailData.data?.id,
        });
      } catch (emailError: any) {
        console.error(`Error sending email for document ${doc.title}:`, emailError);
        emailResults.push({
          documentId: doc.id,
          title: doc.title,
          email: doc.notification_email,
          status: 'failed',
          error: emailError?.message || 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Renewal reminders processed',
        totalDocuments: documents.length,
        results: emailResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in check-renewal-reminders function:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error occurred' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
