const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GHL_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6ImNYM3hMemxIamk1NEtPbmxwY0tjIiwiY29tcGFueV9pZCI6ImUwWjFBeklOYXFZdFg5bUplMm04IiwidmVyc2lvbiI6MSwiaWF0IjoxNjc3NjQ1MjE5NzU3LCJzdWIiOiJ1c2VyX2lkIn0.8xeP3HX6A62yzENfLuMhYhOCRqK_fr3lLWM7zGIvy7k";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const parts = GHL_API_KEY.split('.');
    const payload = JSON.parse(atob(parts[1]));
    const locationId = payload.location_id;

    const response = await fetch(
      `https://rest.gohighlevel.com/v1/contacts/?locationId=${locationId}&limit=100`,
      {
        headers: {
          'Authorization': `Bearer ${GHL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('GHL API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch contacts' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
