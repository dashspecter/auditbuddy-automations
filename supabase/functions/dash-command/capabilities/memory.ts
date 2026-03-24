/**
 * Memory & Workflow Capability Module
 * Phase 8: Standardized on CapabilityResult.
 */
import { type CapabilityResult, success, capabilityError } from "../shared/contracts.ts";

export async function saveUserPreference(
  sbService: any, companyId: string, userId: string, args: any
): Promise<CapabilityResult<any>> {
  const { error } = await sbService.from("dash_user_preferences").upsert({
    company_id: companyId,
    user_id: userId,
    preference_key: args.preference_key,
    preference_value: args.preference_value,
    updated_at: new Date().toISOString(),
  }, { onConflict: "company_id,user_id,preference_key" });
  if (error) return capabilityError(error.message);
  return success({ saved: true, key: args.preference_key, message: `Preference "${args.preference_key}" saved.` });
}

export async function getUserPreferences(
  sb: any, userId: string
): Promise<CapabilityResult<any>> {
  const { data, error } = await sb.from("dash_user_preferences")
    .select("preference_key, preference_value, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) return capabilityError(error.message);
  const prefs: Record<string, any> = {};
  for (const p of data ?? []) prefs[p.preference_key] = p.preference_value;
  return success({ preferences: prefs, count: (data ?? []).length });
}

export async function saveOrgMemory(
  sbService: any, companyId: string, userId: string, args: any
): Promise<CapabilityResult<any>> {
  const { error } = await sbService.from("dash_org_memory").upsert({
    company_id: companyId,
    memory_type: args.memory_type,
    memory_key: args.memory_key,
    content_json: args.content,
    created_by: userId,
    updated_at: new Date().toISOString(),
  }, { onConflict: "company_id,memory_type,memory_key" });
  if (error) return capabilityError(error.message);
  return success({ saved: true, type: args.memory_type, key: args.memory_key, message: `Organization memory "${args.memory_key}" saved.` });
}

export async function getOrgMemory(
  sb: any, args: any
): Promise<CapabilityResult<any>> {
  let q = sb.from("dash_org_memory")
    .select("memory_type, memory_key, content_json, updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);
  if (args.memory_type) q = q.eq("memory_type", args.memory_type);
  const { data, error } = await q;
  if (error) return capabilityError(error.message);
  return success({ memories: data ?? [], count: (data ?? []).length });
}

export async function saveWorkflow(
  sbService: any, companyId: string, userId: string, args: any
): Promise<CapabilityResult<any>> {
  const { data, error } = await sbService.from("dash_saved_workflows").insert({
    company_id: companyId,
    user_id: userId,
    name: args.name,
    description: args.description || null,
    workflow_json: { prompt: args.prompt },
    is_shared: args.is_shared || false,
  }).select("id, name").single();
  if (error) return capabilityError(error.message);
  return success({ saved: true, workflow_id: data.id, name: data.name, message: `Workflow "${data.name}" saved. It will appear as a shortcut in your Dash sidebar.` });
}

export async function listSavedWorkflows(
  sb: any, userId: string
): Promise<CapabilityResult<any>> {
  const { data, error } = await sb.from("dash_saved_workflows")
    .select("id, name, description, workflow_json, is_shared, created_at")
    .or(`user_id.eq.${userId},is_shared.eq.true`)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return capabilityError(error.message);
  return success({ workflows: data ?? [], count: (data ?? []).length });
}
