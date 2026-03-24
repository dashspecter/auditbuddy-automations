/**
 * Shared permission checks for Dash capability layer.
 * Integrates with existing Dashspect role/module/RLS model.
 */

import { type CapabilityResult, permissionDenied, moduleDisabled, success } from "./contracts.ts";

export interface PermissionContext {
  companyId: string;
  actorUserId: string;
  platformRoles: string[];   // from user_roles table
  companyRole: string;        // from company_users table (company_owner, company_admin, company_member)
  activeModules: string[];    // from company_modules table
}

type ActionType = "read" | "create" | "approve" | "reject" | "cancel" | "update" | "delete";

const MANAGER_ROLES = ["admin", "manager"];
const APPROVAL_COMPANY_ROLES = ["company_owner", "company_admin"];

/**
 * Check if the actor has manager-level authority.
 * This means: platform admin, platform manager, company owner, or company admin.
 */
export function isManagerLevel(ctx: PermissionContext): boolean {
  if (ctx.platformRoles.some(r => MANAGER_ROLES.includes(r))) return true;
  if (APPROVAL_COMPANY_ROLES.includes(ctx.companyRole)) return true;
  return false;
}

/**
 * Check if the actor has HR authority (can manage time-off).
 */
export function isHRLevel(ctx: PermissionContext): boolean {
  if (isManagerLevel(ctx)) return true;
  if (ctx.platformRoles.includes("hr")) return true;
  return false;
}

/**
 * Check if a module is enabled for the company.
 */
export function checkModuleEnabled(
  ctx: PermissionContext,
  requiredModule: string
): CapabilityResult<true> | null {
  if (!ctx.activeModules.includes(requiredModule)) {
    return moduleDisabled(requiredModule);
  }
  return null; // Module is enabled, no error
}

/**
 * Main permission check for capability actions.
 */
export function checkCapabilityPermission(params: {
  action: ActionType;
  module: string;
  ctx: PermissionContext;
  targetEmployeeId?: string;
}): CapabilityResult<true> {
  const { action, module, ctx, targetEmployeeId } = params;

  // 1. Module gating
  const moduleCheck = checkModuleEnabled(ctx, module);
  if (moduleCheck) return moduleCheck;

  // 2. Action-specific permission checks
  switch (action) {
    case "read":
      // Reads are allowed for all authenticated users within their company
      return success(true);

    case "create":
      // Workforce (employees, shifts) and audits require manager-level authority
      if (module === "workforce" && !isManagerLevel(ctx)) {
        return permissionDenied("Only managers or admins can create employees and shifts.");
      }
      if (module === "location_audits" && !isManagerLevel(ctx)) {
        return permissionDenied("Only managers or admins can create audit templates.");
      }
      // Time-off and other modules: self-service allowed
      return success(true);

    case "approve":
    case "reject":
      // Only managers, admins, HR, owners can approve/reject
      if (!isHRLevel(ctx)) {
        return permissionDenied("Only managers, admins, HR, or company owners can approve or reject requests.");
      }
      return success(true);

    case "cancel":
      // Employee can cancel their own, managers can cancel any
      // The capability layer will verify ownership
      return success(true);

    case "update":
    case "delete":
      if (!isManagerLevel(ctx)) {
        return permissionDenied("Only managers or admins can perform this action.");
      }
      return success(true);

    default:
      return permissionDenied(`Unknown action: ${action}`);
  }
}
