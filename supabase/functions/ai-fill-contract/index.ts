import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple base64 encode for Uint8Array
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Simple base64 decode to Uint8Array
function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Minimal ZIP reader/writer for DOCX files
class SimpleZip {
  private entries: Map<string, { data: Uint8Array; compressed: boolean }> = new Map();
  private rawData: Uint8Array;

  constructor(data: Uint8Array) {
    this.rawData = data;
    this.parseZip(data);
  }

  private parseZip(data: Uint8Array) {
    // Find End of Central Directory
    let eocdOffset = -1;
    for (let i = data.length - 22; i >= 0; i--) {
      if (data[i] === 0x50 && data[i + 1] === 0x4b && data[i + 2] === 0x05 && data[i + 3] === 0x06) {
        eocdOffset = i;
        break;
      }
    }
    if (eocdOffset === -1) throw new Error("Not a valid ZIP file");

    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const cdOffset = view.getUint32(eocdOffset + 16, true);
    const cdEntries = view.getUint16(eocdOffset + 10, true);

    let offset = cdOffset;
    for (let i = 0; i < cdEntries; i++) {
      if (data[offset] !== 0x50 || data[offset + 1] !== 0x4b || data[offset + 2] !== 0x01 || data[offset + 3] !== 0x02) break;

      const compressionMethod = view.getUint16(offset + 10, true);
      const compressedSize = view.getUint32(offset + 20, true);
      const uncompressedSize = view.getUint32(offset + 24, true);
      const nameLen = view.getUint16(offset + 28, true);
      const extraLen = view.getUint16(offset + 30, true);
      const commentLen = view.getUint16(offset + 32, true);
      const localHeaderOffset = view.getUint32(offset + 42, true);

      const nameBytes = data.slice(offset + 46, offset + 46 + nameLen);
      const fileName = new TextDecoder().decode(nameBytes);

      // Read from local header
      const localNameLen = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
      const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;

      const fileData = data.slice(dataStart, dataStart + compressedSize);

      if (compressionMethod === 0) {
        // Stored (no compression)
        this.entries.set(fileName, { data: fileData, compressed: false });
      } else if (compressionMethod === 8) {
        // Deflated - we'll store raw and decompress on read
        try {
          // Store compressed, will decompress when needed
          this.entries.set(fileName, { data: fileData, compressed: true });
        } catch {
          this.entries.set(fileName, { data: fileData, compressed: true });
        }
      }

      offset += 46 + nameLen + extraLen + commentLen;
    }
  }

  async getText(fileName: string): Promise<string> {
    const entry = this.entries.get(fileName);
    if (!entry) throw new Error(`File ${fileName} not found in ZIP`);

    let data = entry.data;
    if (entry.compressed) {
      // Decompress using DecompressionStream
      const ds = new DecompressionStream("deflate-raw");
      const writer = ds.writable.getWriter();
      writer.write(data);
      writer.close();
      const reader = ds.readable.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const totalLen = chunks.reduce((s, c) => s + c.length, 0);
      data = new Uint8Array(totalLen);
      let pos = 0;
      for (const chunk of chunks) {
        data.set(chunk, pos);
        pos += chunk.length;
      }
    }

    return new TextDecoder().decode(data);
  }

  async setText(fileName: string, content: string): Promise<void> {
    const encoded = new TextEncoder().encode(content);
    // Store uncompressed for simplicity in reconstruction
    this.entries.set(fileName, { data: encoded, compressed: false });
  }

  async toUint8Array(): Promise<Uint8Array> {
    // Rebuild ZIP with all entries stored (uncompressed)
    const parts: Uint8Array[] = [];
    const centralDir: Uint8Array[] = [];
    let offset = 0;

    for (const [name, entry] of this.entries) {
      let fileData = entry.data;

      if (entry.compressed) {
        // Decompress first
        try {
          const ds = new DecompressionStream("raw-deflate" as any);
          const writer = ds.writable.getWriter();
          writer.write(fileData);
          writer.close();
          const reader = ds.readable.getReader();
          const chunks: Uint8Array[] = [];
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
          const totalLen = chunks.reduce((s, c) => s + c.length, 0);
          fileData = new Uint8Array(totalLen);
          let pos = 0;
          for (const chunk of chunks) {
            fileData.set(chunk, pos);
            pos += chunk.length;
          }
        } catch {
          // Keep as-is if decompression fails
        }
      }

      const nameBytes = new TextEncoder().encode(name);

      // Local file header
      const localHeader = new Uint8Array(30 + nameBytes.length);
      const lv = new DataView(localHeader.buffer);
      lv.setUint32(0, 0x04034b50, true); // signature
      lv.setUint16(4, 20, true); // version needed
      lv.setUint16(6, 0, true); // flags
      lv.setUint16(8, 0, true); // compression: stored
      lv.setUint16(10, 0, true); // mod time
      lv.setUint16(12, 0, true); // mod date
      // CRC32 - compute simple
      const crc = crc32(fileData);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, fileData.length, true); // compressed size
      lv.setUint32(22, fileData.length, true); // uncompressed size
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true); // extra length
      localHeader.set(nameBytes, 30);

      // Central directory entry
      const cdEntry = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(cdEntry.buffer);
      cv.setUint32(0, 0x02014b50, true); // signature
      cv.setUint16(4, 20, true); // version made by
      cv.setUint16(6, 20, true); // version needed
      cv.setUint16(8, 0, true); // flags
      cv.setUint16(10, 0, true); // compression: stored
      cv.setUint16(12, 0, true); // mod time
      cv.setUint16(14, 0, true); // mod date
      cv.setUint32(16, crc, true);
      cv.setUint32(20, fileData.length, true);
      cv.setUint32(24, fileData.length, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true); // extra length
      cv.setUint16(32, 0, true); // comment length
      cv.setUint16(34, 0, true); // disk number
      cv.setUint16(36, 0, true); // internal attrs
      cv.setUint32(38, 0, true); // external attrs
      cv.setUint32(42, offset, true); // local header offset
      cdEntry.set(nameBytes, 46);

      centralDir.push(cdEntry);
      parts.push(localHeader);
      parts.push(fileData);
      offset += localHeader.length + fileData.length;
    }

    const cdOffset = offset;
    let cdSize = 0;
    for (const cd of centralDir) {
      parts.push(cd);
      cdSize += cd.length;
    }

    // End of central directory
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, this.entries.size, true);
    ev.setUint16(10, this.entries.size, true);
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, cdOffset, true);
    ev.setUint16(20, 0, true);
    parts.push(eocd);

    const totalSize = parts.reduce((s, p) => s + p.length, 0);
    const result = new Uint8Array(totalSize);
    let pos = 0;
    for (const part of parts) {
      result.set(part, pos);
      pos += part.length;
    }
    return result;
  }
}

// CRC32 implementation
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Format date helper
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  } catch {
    return dateStr;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth validation
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Verify company membership
    const { data: companyUser } = await supabaseAuth
      .from("company_users")
      .select("company_id")
      .eq("user_id", userId)
      .single();

    if (!companyUser) {
      return new Response(JSON.stringify({ error: "No company found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { employee_id, template_id } = await req.json();
    if (!employee_id || !template_id) {
      return new Response(JSON.stringify({ error: "employee_id and template_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for data fetching
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch employee - scoped to company
    const { data: employee, error: empError } = await supabaseService
      .from("employees")
      .select(`
        full_name, localitate, serie_id, numar_id, valabilitate_id, cnp,
        domiciliu, emisa_de, valabila_de_la, ocupatia, cod_cor,
        valoare_tichet, perioada_proba_end, hire_date, base_salary,
        is_foreign, nr_permis_sedere, permis_institutie_emitenta,
        permis_data_eliberare, permis_data_expirare, numar_aviz,
        aviz_data_eliberare, aviz_institutie, spor_weekend,
        locations(name)
      `)
      .eq("id", employee_id)
      .eq("company_id", companyUser.company_id)
      .single();

    if (empError || !employee) {
      return new Response(JSON.stringify({ error: "Employee not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch template - scoped to company
    const { data: template, error: tplError } = await supabaseService
      .from("documents")
      .select("id, title, file_url")
      .eq("id", template_id)
      .eq("company_id", companyUser.company_id)
      .eq("document_type", "contract_template")
      .single();

    if (tplError || !template) {
      return new Response(JSON.stringify({ error: "Template not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download the DOCX template via storage SDK (bucket is private)
    const urlParts = template.file_url.split('/documents/');
    const storagePath = decodeURIComponent(urlParts[urlParts.length - 1]);

    const { data: fileData, error: downloadError } = await supabaseService
      .storage.from('documents').download(storagePath);

    if (downloadError || !fileData) {
      throw new Error("Failed to download template file: " + (downloadError?.message || "unknown"));
    }

    const templateBuffer = new Uint8Array(await fileData.arrayBuffer());
    const zip = new SimpleZip(templateBuffer);

    // Extract document.xml
    const documentXml = await zip.getText("word/document.xml");

    // Build employee data summary for AI
    const loc = employee.locations as any;
    const employeeData = {
      "Nume complet": employee.full_name || "",
      "CNP": employee.cnp || "",
      "Domiciliu": employee.domiciliu || "",
      "Localitate": employee.localitate || "",
      "Punct de lucru": loc?.name || "",
      "Serie CI": employee.serie_id || "",
      "Număr CI": employee.numar_id || "",
      "Emisă de": employee.emisa_de || "",
      "Valabilă de la": formatDate(employee.valabila_de_la),
      "Până la (expirare CI)": formatDate(employee.valabilitate_id),
      "Ocupația": employee.ocupatia || "",
      "Cod COR": employee.cod_cor || "",
      "Data începere activitate": formatDate(employee.hire_date),
      "Perioada de probă până la": formatDate(employee.perioada_proba_end),
      "Salariu de bază": employee.base_salary?.toString() || "",
      "Spor weekend": employee.spor_weekend?.toString() || "",
      "Valoare tichet de masă": employee.valoare_tichet?.toString() || "",
      "Nr. permis ședere": employee.nr_permis_sedere || "",
      "Instituție emitentă permis": employee.permis_institutie_emitenta || "",
      "Data eliberare permis": formatDate(employee.permis_data_eliberare),
      "Data expirare permis": formatDate(employee.permis_data_expirare),
      "Număr aviz de muncă": employee.numar_aviz || "",
      "Instituție aviz": employee.aviz_institutie || "",
      "Data eliberare aviz": formatDate(employee.aviz_data_eliberare),
    };

    // Strip XML tags for AI readability
    const textContent = documentXml
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a Romanian contract document filler. You receive the text content of a DOCX contract template and employee data.

The template contains placeholders that need to be filled. Placeholders can be:
- {{placeholder name}} style tags
- Sequences of underscores (____) or dots (....) representing blank spaces
- Empty spaces after labels like "Numele: " or "CNP: "

Your task: identify each placeholder/blank in the template and provide the exact text replacement.

IMPORTANT RULES:
- Match placeholders to the most relevant employee data field
- For dates, use DD.MM.YYYY format
- Preserve Romanian diacritics (ă, â, î, ș, ț)
- Only fill in data that is available - leave blanks for missing data
- Be precise with the "original" text so it can be found in the XML`;

    const userPrompt = `Here is the contract template text:

${textContent}

Here is the employee data:
${JSON.stringify(employeeData, null, 2)}

Analyze the template and return all text replacements needed.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "fill_contract",
              description: "Provide text replacements to fill blanks in the contract template.",
              parameters: {
                type: "object",
                properties: {
                  replacements: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        original: {
                          type: "string",
                          description: "The exact original text/placeholder to find in the document (e.g. '{{nume angajat}}' or '________')",
                        },
                        replacement: {
                          type: "string",
                          description: "The employee data value to replace it with",
                        },
                        field_name: {
                          type: "string",
                          description: "Which employee field this maps to",
                        },
                      },
                      required: ["original", "replacement"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["replacements"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "fill_contract" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error("AI gateway error");
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No replacement data returned from AI");
    }

    const { replacements } = JSON.parse(toolCall.function.arguments);

    // Apply replacements to the XML
    let modifiedXml = documentXml;
    let appliedCount = 0;

    for (const r of replacements) {
      if (!r.original || !r.replacement) continue;

      // Try direct replacement in XML
      // Handle {{placeholder}} style - these may be split across XML runs
      if (r.original.startsWith("{{") && r.original.endsWith("}}")) {
        const placeholder = r.original;
        // Try exact match first
        if (modifiedXml.includes(placeholder)) {
          modifiedXml = modifiedXml.replaceAll(placeholder, r.replacement);
          appliedCount++;
        } else {
          // Try matching with XML tags between characters (split runs)
          const innerText = placeholder.slice(2, -2); // remove {{ and }}
          // Build regex that allows XML tags between each character
          const chars = [...innerText];
          const pattern = "\\{\\{" + chars.map(c => escapeRegex(c)).join("(?:<[^>]*>)*") + "\\}\\}";
          try {
            const regex = new RegExp(pattern, "g");
            if (regex.test(modifiedXml)) {
              modifiedXml = modifiedXml.replace(regex, r.replacement);
              appliedCount++;
            }
          } catch {
            // Skip invalid regex
          }
        }
      } else {
        // For non-placeholder patterns (underscores, dots, etc.)
        if (modifiedXml.includes(r.original)) {
          modifiedXml = modifiedXml.replace(r.original, r.replacement);
          appliedCount++;
        }
      }
    }

    console.log(`Applied ${appliedCount}/${replacements.length} replacements`);

    // Update the XML in the ZIP
    await zip.setText("word/document.xml", modifiedXml);

    // Generate final DOCX
    const outputBytes = await zip.toUint8Array();
    const base64Output = uint8ToBase64(outputBytes);

    return new Response(
      JSON.stringify({
        success: true,
        docx_base64: base64Output,
        applied_count: appliedCount,
        total_replacements: replacements.length,
        file_name: `Contract_${employee.full_name?.replace(/\s+/g, "_") || "Employee"}.docx`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("ai-fill-contract error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
