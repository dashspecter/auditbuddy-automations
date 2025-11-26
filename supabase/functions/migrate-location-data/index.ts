import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MigrationResult {
  success: boolean;
  message: string;
  stats: {
    uniqueLocations: number;
    locationsCreated: number;
    auditsUpdated: number;
    templatesUpdated: number;
    errors: string[];
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated and is admin
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if user is admin
    const { data: roles, error: rolesError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError || !roles?.some(r => r.role === 'admin')) {
      console.error('Permission denied - user is not admin');
      return new Response(
        JSON.stringify({ error: 'Permission denied. Admin role required.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Starting location data migration...');

    const result: MigrationResult = {
      success: true,
      message: '',
      stats: {
        uniqueLocations: 0,
        locationsCreated: 0,
        auditsUpdated: 0,
        templatesUpdated: 0,
        errors: [],
      },
    };

    // Step 1: Get all unique location names from location_audits where location_id is null
    const { data: audits, error: auditsError } = await supabaseClient
      .from('location_audits')
      .select('location')
      .is('location_id', null);

    if (auditsError) {
      console.error('Error fetching audits:', auditsError);
      throw new Error(`Failed to fetch audits: ${auditsError.message}`);
    }

    console.log(`Found ${audits?.length || 0} audits without location_id`);

    // Get unique location names
    const uniqueLocationNames = [...new Set(audits?.map(a => a.location).filter(Boolean))];
    result.stats.uniqueLocations = uniqueLocationNames.length;

    console.log(`Found ${uniqueLocationNames.length} unique location names`);

    // Step 2: For each unique location name, find or create a location
    const locationMap = new Map<string, string>(); // Map location name to location_id

    for (const locationName of uniqueLocationNames) {
      try {
        console.log(`Processing location: ${locationName}`);

        // Check if location already exists
        const { data: existingLocation, error: searchError } = await supabaseClient
          .from('locations')
          .select('id, name')
          .eq('name', locationName)
          .maybeSingle();

        if (searchError) {
          console.error(`Error searching for location ${locationName}:`, searchError);
          result.stats.errors.push(`Failed to search for location "${locationName}"`);
          continue;
        }

        if (existingLocation) {
          // Location exists, use its ID
          locationMap.set(locationName, existingLocation.id);
          console.log(`Found existing location: ${locationName} (${existingLocation.id})`);
        } else {
          // Create new location
          const { data: newLocation, error: createError } = await supabaseClient
            .from('locations')
            .insert({
              name: locationName,
              status: 'active',
              created_by: user.id,
            })
            .select('id')
            .single();

          if (createError) {
            console.error(`Error creating location ${locationName}:`, createError);
            result.stats.errors.push(`Failed to create location "${locationName}"`);
            continue;
          }

          locationMap.set(locationName, newLocation.id);
          result.stats.locationsCreated++;
          console.log(`Created new location: ${locationName} (${newLocation.id})`);
        }
      } catch (error) {
        console.error(`Unexpected error processing location ${locationName}:`, error);
        result.stats.errors.push(`Unexpected error for location "${locationName}"`);
      }
    }

    console.log(`Location mapping complete. ${locationMap.size} locations mapped.`);

    // Step 3: Update audits with location_id
    for (const [locationName, locationId] of locationMap.entries()) {
      try {
        const { error: updateError } = await supabaseClient
          .from('location_audits')
          .update({ location_id: locationId })
          .eq('location', locationName)
          .is('location_id', null);

        if (updateError) {
          console.error(`Error updating audits for location ${locationName}:`, updateError);
          result.stats.errors.push(`Failed to update audits for location "${locationName}"`);
          continue;
        }

        // Count how many were updated
        const { count, error: countError } = await supabaseClient
          .from('location_audits')
          .select('*', { count: 'exact', head: true })
          .eq('location_id', locationId);

        if (!countError && count) {
          result.stats.auditsUpdated += count;
          console.log(`Updated ${count} audits for location: ${locationName}`);
        }
      } catch (error) {
        console.error(`Unexpected error updating audits for ${locationName}:`, error);
        result.stats.errors.push(`Unexpected error updating audits for "${locationName}"`);
      }
    }

    // Step 4: Update templates with location_id (optional - templates might use location field differently)
    const { data: templates, error: templatesError } = await supabaseClient
      .from('audit_templates')
      .select('id, location')
      .is('location_id', null)
      .not('location', 'is', null);

    if (!templatesError && templates) {
      console.log(`Found ${templates.length} templates to migrate`);

      for (const template of templates) {
        const locationId = locationMap.get(template.location);
        if (locationId) {
          const { error: updateError } = await supabaseClient
            .from('audit_templates')
            .update({ location_id: locationId })
            .eq('id', template.id);

          if (!updateError) {
            result.stats.templatesUpdated++;
            console.log(`Updated template ${template.id} with location_id`);
          } else {
            console.error(`Error updating template ${template.id}:`, updateError);
          }
        }
      }
    }

    // Prepare result message
    if (result.stats.errors.length > 0) {
      result.success = false;
      result.message = `Migration completed with ${result.stats.errors.length} error(s). Check logs for details.`;
    } else {
      result.message = `Migration successful! Created ${result.stats.locationsCreated} locations, updated ${result.stats.auditsUpdated} audits and ${result.stats.templatesUpdated} templates.`;
    }

    console.log('Migration complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Migration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        message: errorMessage,
        stats: {
          uniqueLocations: 0,
          locationsCreated: 0,
          auditsUpdated: 0,
          templatesUpdated: 0,
          errors: [errorMessage],
        },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
