import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileUrl } = await req.json();

    if (!fileUrl) {
      return new Response(
        JSON.stringify({ error: "File URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract bucket and path from URL
    // Handle both public and private URLs:
    // Public: /storage/v1/object/public/bucket/path
    // Private: /storage/v1/object/bucket/path
    const urlParts = fileUrl.split("/storage/v1/object/");
    if (urlParts.length < 2) {
      throw new Error("Invalid file URL format");
    }
    
    let bucketAndPath = urlParts[1].split("?")[0];
    
    // Remove "public/" prefix if present
    if (bucketAndPath.startsWith("public/")) {
      bucketAndPath = bucketAndPath.substring(7);
    }
    
    const pathSegments = bucketAndPath.split("/");
    const bucket = pathSegments[0];
    // Decode URL-encoded characters (like %20 for spaces)
    const path = decodeURIComponent(pathSegments.slice(1).join("/"));
    
    console.log("Parsed - Bucket:", bucket, "Path:", path);

    // Download the file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(path);

    if (downloadError) {
      console.error("Error downloading file:", downloadError);
      throw new Error("Failed to download document");
    }

    // For now, we'll just extract text from the file
    // In a production environment, you might want to use a proper PDF/document parser
    let text = "";
    
    try {
      const arrayBuffer = await fileData.arrayBuffer();
      const decoder = new TextDecoder('utf-8');
      text = decoder.decode(arrayBuffer);
      
      // If it's not readable text (like PDF), provide a message
      if (!text || text.length < 100 || text.includes('\0')) {
        text = "Document parsing requires additional processing. Please use a text-based format (TXT) or implement a PDF parser.";
      }
    } catch (e) {
      console.error("Error parsing document:", e);
      text = "Unable to extract text from document. Please ensure the document is in a supported format.";
    }

    return new Response(
      JSON.stringify({ text, length: text.length }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error parsing document:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to parse document" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
