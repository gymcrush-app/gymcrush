import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface GymData {
  google_place_id: string;
  name: string;
  formatted_address: string;
  location?: {
    lat: number;
    lng: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: GymData = await req.json();

    if (!body.google_place_id || !body.name || !body.formatted_address) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: google_place_id, name, formatted_address' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if gym already exists
    const { data: existingGym, error: lookupError } = await supabase
      .from('gyms')
      .select('id')
      .eq('google_place_id', body.google_place_id)
      .single();

    if (existingGym) {
      return new Response(
        JSON.stringify({ id: existingGym.id }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Parse address to extract city, state, country
    // Format: "123 Main St, City, State, Country" or "123 Main St, City, State"
    const addressParts = body.formatted_address.split(',').map((s) => s.trim());
    
    // Try to extract city, state, country
    // Assumes format: [street, city, state, country?]
    // For "123 Main St, Kelowna, BC" -> city: Kelowna, state: BC
    // For "123 Main St, City, State, Country" -> city: City, state: State, country: Country
    let city = 'Unknown';
    let state = 'Unknown';
    let country = 'Unknown';
    
    if (addressParts.length >= 3) {
      // Has street, city, state (and possibly country)
      city = addressParts[addressParts.length - 2];
      state = addressParts[addressParts.length - 1];
      // If we have 4+ parts, assume last is country
      if (addressParts.length >= 4) {
        country = addressParts[addressParts.length - 1];
        state = addressParts[addressParts.length - 2];
        city = addressParts[addressParts.length - 3];
      }
    } else if (addressParts.length === 2) {
      // Just street and city/state
      city = addressParts[1];
      state = 'Unknown';
    }
    
    // Use location from body if available, otherwise default
    const lng = body.location?.lng ?? -119.4960; // Default to Kelowna, BC
    const lat = body.location?.lat ?? 49.8881;
    
    // Use stored procedure to insert gym with PostGIS location
    // This ensures we use PostGIS functions (ST_SetSRID, ST_MakePoint) directly in the database
    const { data: gymId, error: insertError } = await supabase.rpc(
      'insert_gym_with_location',
      {
        p_google_place_id: body.google_place_id,
        p_name: body.name,
        p_address: body.formatted_address,
        p_city: city,
        p_state: state,
        p_country: country,
        p_lng: lng,
        p_lat: lat,
      }
    );

    if (insertError) {
      console.error('Error creating gym with location:', insertError);
      // Fallback to WKT string format if stored procedure fails
      const locationString = `SRID=4326;POINT(${lng} ${lat})`;
      
      const { data: newGym, error: fallbackError } = await supabase
        .from('gyms')
        .insert({
          google_place_id: body.google_place_id,
          name: body.name,
          address: body.formatted_address,
          city,
          state,
          country,
          location: locationString as any, // PostGIS geography type
        })
        .select('id')
        .single();

      if (fallbackError) {
        console.error('Error creating gym (fallback):', fallbackError);
        return new Response(
          JSON.stringify({ error: fallbackError.message }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({ id: newGym.id }),
        {
          status: 201,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Successfully created gym using stored procedure
    // gymId is the UUID returned from the stored procedure
    if (!gymId) {
      console.error('Stored procedure returned null gym ID');
      return new Response(
        JSON.stringify({ error: 'Failed to create gym' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ id: gymId }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: any) {
    console.error('Error in create-gym function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
