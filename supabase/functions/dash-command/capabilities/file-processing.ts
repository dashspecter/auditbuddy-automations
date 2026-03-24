/**
 * File Processing Capability Module
 * Handles file transformations (spreadsheet→schedule, SOP→training)
 * and the core parse_uploaded_file tool for PDF/image extraction.
 */

/**
 * Downloads a file from Supabase Storage and returns it as base64 with its MIME type.
 */
export async function downloadFileAsBase64(
  sbService: any,
  fileUrl: string
): Promise<{ base64: string; mimeType: string }> {
  const urlPath = fileUrl.split("?")[0].toLowerCase();
  let mimeType = "application/octet-stream";
  if (urlPath.endsWith(".pdf")) mimeType = "application/pdf";
  else if (urlPath.endsWith(".png")) mimeType = "image/png";
  else if (urlPath.endsWith(".jpg") || urlPath.endsWith(".jpeg")) mimeType = "image/jpeg";
  else if (urlPath.endsWith(".gif")) mimeType = "image/gif";
  else if (urlPath.endsWith(".webp")) mimeType = "image/webp";
  else if (urlPath.endsWith(".csv")) mimeType = "text/csv";
  else if (urlPath.endsWith(".xlsx") || urlPath.endsWith(".xls")) mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  const storageMarker = "/storage/v1/object/";
  if (fileUrl.includes(storageMarker)) {
    const urlParts = fileUrl.split(storageMarker);
    if (urlParts.length >= 2) {
      let bucketAndPath = urlParts[1].split("?")[0];
      if (bucketAndPath.startsWith("public/")) bucketAndPath = bucketAndPath.substring(7);
      else if (bucketAndPath.startsWith("sign/")) bucketAndPath = bucketAndPath.substring(5);

      const segments = bucketAndPath.split("/");
      const bucket = segments[0];
      const path = decodeURIComponent(segments.slice(1).join("/"));

      console.log(`downloadFileAsBase64: bucket=${bucket}, path=${path}`);

      const { data, error } = await sbService.storage.from(bucket).download(path);
      if (error) {
        console.error("Storage download error:", error);
        throw new Error(`Could not download file from storage: ${error.message}`);
      }

      const arrayBuffer = await data.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);
      return { base64, mimeType };
    }
  }

  console.log(`downloadFileAsBase64: fetching external URL`);
  const resp = await fetch(fileUrl);
  if (!resp.ok) throw new Error(`Failed to fetch file: HTTP ${resp.status}`);
  const arrayBuffer = await resp.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  const ct = resp.headers.get("content-type");
  if (ct) mimeType = ct.split(";")[0].trim();
  return { base64, mimeType };
}

// ─── Transform: Spreadsheet → Schedule ───
export async function transformSpreadsheetToSchedule(args: any): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `Analyze this spreadsheet and extract schedule/shift data. Return a JSON object with: { shifts: [{ role: string, date: "YYYY-MM-DD", start_time: "HH:MM", end_time: "HH:MM", location_name?: string, employee_name?: string, min_staff?: number }], warnings: string[] }. Only return valid JSON, no markdown fences.` },
            { type: "image_url", image_url: { url: args.file_url } },
          ],
        }],
        stream: false,
      }),
    });
    if (!resp.ok) return { error: "Failed to parse spreadsheet." };
    const result = await resp.json();
    const content = result.choices?.[0]?.message?.content || "";
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { type: "schedule_extraction", file_name: args.file_name, ...parsed, next_step: "Review shifts and create each using create_shift_draft." };
      }
    } catch {}
    return { raw_extraction: content, error: "Could not parse structured schedule data." };
  } catch (err: any) {
    return { error: `Schedule extraction failed: ${err.message}` };
  }
}

// ─── Transform: SOP → Training Module ───
export async function transformSopToTraining(sbService: any, args: any): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
  try {
    let fileContent: { base64: string; mimeType: string };
    try {
      fileContent = await downloadFileAsBase64(sbService, args.file_url);
    } catch (dlErr: any) {
      console.error("File download failed:", dlErr);
      return { error: "Could not access the uploaded file. Please try re-uploading." };
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `Analyze this SOP/procedure document and extract it as a training module. Return a JSON object with: { module_name: string, description: string, sections: [{ title: string, key_points: string[], duration_minutes: number }], quiz_questions: [{ question: string, options: string[], correct_answer_index: number }], estimated_total_duration_minutes: number }. Only return valid JSON, no markdown fences.` },
            { type: "image_url", image_url: { url: `data:${fileContent.mimeType};base64,${fileContent.base64}` } },
          ],
        }],
        stream: false,
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      console.error("AI parse error:", resp.status, errText);
      return { error: "Failed to parse SOP document." };
    }
    const result = await resp.json();
    const content = result.choices?.[0]?.message?.content || "";
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (args.module_name) parsed.module_name = args.module_name;
        return { type: "training_module_extraction", file_name: args.file_name, ...parsed, next_step: "Review the training module structure. This is a draft — the training module creation tool will be available in a future update." };
      }
    } catch {}
    return { raw_extraction: content, error: "Could not parse training module structure." };
  } catch (err: any) {
    return { error: `SOP extraction failed: ${err.message}` };
  }
}

// ─── Parse Uploaded File (P0 — restored) ───
export async function parseUploadedFile(
  sbService: any, companyId: string, userId: string,
  args: any, structuredEvents: string[]
): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
  const intent = args.intent || "audit_template";
  const requestedTemplateName = args.requested_template_name || null;

  // Download the file
  let fileContent: { base64: string; mimeType: string };
  try {
    fileContent = await downloadFileAsBase64(sbService, args.file_url);
  } catch (dlErr: any) {
    console.error("File download failed:", dlErr);
    return { error: "Could not access the uploaded file. Please try re-uploading." };
  }

  // Build intent-specific prompt
  let prompt: string;
  switch (intent) {
    case "audit_template":
      prompt = `Analyze this document and extract an audit template structure. Return a JSON object with:
{
  "template_name": "string — descriptive name for the audit template",
  "description": "string — brief description",
  "template_type": "string — one of: food_safety, health_safety, quality, compliance, operational, custom",
  "sections": [
    {
      "name": "string — section title",
      "description": "string — optional section description",
      "display_order": number,
      "fields": [
        {
          "name": "string — question/check item text",
          "field_type": "string — one of: yes_no, rating, text, number, checklist, photo",
          "is_required": boolean,
          "display_order": number,
          "options": null or { "min": number, "max": number } for rating fields
        }
      ]
    }
  ]
}
Only return valid JSON, no markdown fences.`;
      break;

    case "compliance_audit":
      prompt = `Analyze this compliance/regulation document and extract a recurring audit template. Focus on extracting checkpoints, requirements, and compliance criteria. Return a JSON object with:
{
  "template_name": "string — compliance audit template name",
  "description": "string — what regulation/standard this covers",
  "template_type": "compliance",
  "sections": [
    {
      "name": "string — section/article title",
      "description": "string — section summary",
      "display_order": number,
      "fields": [
        {
          "name": "string — compliance check item",
          "field_type": "yes_no",
          "is_required": true,
          "display_order": number,
          "options": null
        }
      ]
    }
  ]
}
Only return valid JSON, no markdown fences.`;
      break;

    case "id_card":
      prompt = `Analyze this ID card image and extract the following information. Return a JSON object with:
{
  "full_name": "string",
  "cnp": "string — personal identification number if visible",
  "date_of_birth": "YYYY-MM-DD or null",
  "id_series": "string or null",
  "id_number": "string or null",
  "address": "string or null",
  "gender": "string or null",
  "nationality": "string or null"
}
Only return valid JSON, no markdown fences.`;
      break;

    default:
      prompt = `Analyze this document and extract its key content as structured data. Return valid JSON only, no markdown fences.`;
  }

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${fileContent.mimeType};base64,${fileContent.base64}` } },
          ],
        }],
        stream: false,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("AI parse error:", resp.status, errText);
      return { error: "Failed to parse the uploaded document." };
    }

    const result = await resp.json();
    const content = result.choices?.[0]?.message?.content || "";

    let parsed: any;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {}

    if (!parsed) {
      return { raw_extraction: content, error: "Could not parse structured data from the document." };
    }

    // Apply name override if requested
    if (requestedTemplateName && (intent === "audit_template" || intent === "compliance_audit")) {
      parsed.template_name = requestedTemplateName;
    }

    // For audit intents, auto-create a draft
    if (intent === "audit_template" || intent === "compliance_audit") {
      const sections = parsed.sections || [];
      const templateName = parsed.template_name || args.file_name || "Parsed Template";
      const description = parsed.description || null;
      const templateType = parsed.template_type || "custom";

      const draft = {
        name: templateName,
        description,
        template_type: templateType,
        sections: sections.map((s: any, si: number) => ({
          name: s.name,
          description: s.description || null,
          display_order: s.display_order ?? si + 1,
          fields: (s.fields || []).map((f: any, fi: number) => ({
            name: f.name,
            field_type: f.field_type || "yes_no",
            is_required: f.is_required !== false,
            display_order: f.display_order ?? fi + 1,
            options: f.options || null,
          })),
        })),
      };

      // Store as pending action
      const { data: paData } = await sbService.from("dash_pending_actions").insert({
        company_id: companyId,
        user_id: userId,
        action_name: "create_audit_template",
        action_type: "write",
        risk_level: "medium",
        preview_json: draft,
        status: "pending",
      }).select("id").single();

      const totalFields = sections.reduce((acc: number, s: any) => acc + (s.fields?.length || 0), 0);

      structuredEvents.push(JSON.stringify({
        type: "structured_event",
        event_type: "action_preview",
        data: {
          action: "Create Audit Template",
          summary: `"${templateName}" — ${sections.length} section(s), ${totalFields} field(s). Extracted from uploaded document.`,
          risk: "medium",
          affected: [templateName, `${sections.length} sections`, `${totalFields} fields`],
          pending_action_id: paData?.id,
          draft,
          can_approve: true,
        },
      }));

      return {
        type: "audit_template_draft",
        draft,
        pending_action_id: paData?.id,
        requires_approval: true,
        file_name: args.file_name,
        message: `Extracted audit template "${templateName}" with ${sections.length} section(s) and ${totalFields} field(s). Please review and approve.`,
      };
    }

    // For ID card intent, auto-create employee draft
    if (intent === "id_card") {
      if (parsed.full_name) {
        const employeeDraft = {
          full_name: parsed.full_name,
          cnp: parsed.cnp || null,
          date_of_birth: parsed.date_of_birth || null,
          id_series: parsed.id_series || null,
          id_number: parsed.id_number || null,
          address: parsed.address || null,
          role: "staff",
        };

        const { data: paData } = await sbService.from("dash_pending_actions").insert({
          company_id: companyId,
          user_id: userId,
          action_name: "create_employee",
          action_type: "write",
          risk_level: "medium",
          preview_json: employeeDraft,
          status: "pending",
        }).select("id").single();

        structuredEvents.push(JSON.stringify({
          type: "structured_event",
          event_type: "action_preview",
          data: {
            action: "Create Employee from ID",
            summary: `${parsed.full_name} — extracted from ID card. Please review and approve.`,
            risk: "medium",
            affected: [parsed.full_name],
            pending_action_id: paData?.id,
            draft: employeeDraft,
            can_approve: true,
          },
        }));

        return {
          type: "employee_draft_from_id",
          draft: employeeDraft,
          pending_action_id: paData?.id,
          requires_approval: true,
          message: `Extracted employee data for "${parsed.full_name}" from ID card. Please review and approve.`,
        };
      }
    }

    // Generic extraction result
    return { type: `${intent}_extraction`, file_name: args.file_name, ...parsed };
  } catch (err: any) {
    return { error: `Document parsing failed: ${err.message}` };
  }
}
