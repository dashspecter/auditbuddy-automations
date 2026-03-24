/**
 * Shared result contracts for Dash capability layer.
 * Every capability function returns CapabilityResult<T>.
 * Dash maps ok:true to success rendering and ok:false to appropriate error messages.
 */

export type CapabilityResult<T> =
  | { ok: true; data: T; meta?: { count?: number; truncated?: boolean } }
  | { ok: false; code: "validation_error"; errors: string[] }
  | { ok: false; code: "permission_denied"; reason: string }
  | { ok: false; code: "not_found"; entity: string; id?: string }
  | { ok: false; code: "conflict"; details: string }
  | { ok: false; code: "module_disabled"; module: string }
  | { ok: false; code: "error"; message: string };

// ─── Builder Functions ───

export function success<T>(data: T, meta?: { count?: number; truncated?: boolean }): CapabilityResult<T> {
  return { ok: true, data, ...(meta ? { meta } : {}) };
}

export function validationError(errors: string[]): CapabilityResult<never> {
  return { ok: false, code: "validation_error", errors };
}

export function permissionDenied(reason: string): CapabilityResult<never> {
  return { ok: false, code: "permission_denied", reason };
}

export function notFound(entity: string, id?: string): CapabilityResult<never> {
  return { ok: false, code: "not_found", entity, id };
}

export function conflict(details: string): CapabilityResult<never> {
  return { ok: false, code: "conflict", details };
}

export function moduleDisabled(module: string): CapabilityResult<never> {
  return { ok: false, code: "module_disabled", module };
}

export function capabilityError(message: string): CapabilityResult<never> {
  return { ok: false, code: "error", message };
}

/**
 * Convert a CapabilityResult to a tool-friendly return object
 * that Dash's LLM can interpret and the frontend can render.
 */
export function resultToToolResponse(result: CapabilityResult<any>): any {
  if (result.ok) {
    return { ...result.data, ...(result.meta ? { _meta: result.meta } : {}) };
  }
  switch (result.code) {
    case "validation_error":
      return { error: `Validation failed: ${result.errors.join("; ")}`, recoverable: true };
    case "permission_denied":
      return { error: `Permission denied: ${result.reason}`, recoverable: false };
    case "not_found":
      return { error: `${result.entity} not found${result.id ? ` (ID: ${result.id})` : ""}.`, recoverable: false };
    case "conflict":
      return { error: `Conflict: ${result.details}`, recoverable: true };
    case "module_disabled":
      return { error: `The "${result.module}" module is not active for your company. Please enable it in Billing & Modules.`, recoverable: false };
    case "error":
      return { error: result.message, recoverable: true };
  }
}
