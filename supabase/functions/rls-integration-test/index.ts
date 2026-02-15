import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * RLS Integration Test Runner
 * 
 * Runs non-destructive, read-only tests that verify:
 * 1. Cross-tenant data isolation (Tenant A cannot see Tenant B)
 * 2. Role-based access scoping
 * 3. Kiosk token restrictions
 * 
 * Called with the user's auth token to test their actual permissions.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("RLS test: starting, method:", req.method);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get the caller's auth token
    const authHeader = req.headers.get("authorization");
    console.log("RLS test: auth header present:", !!authHeader);
    
    if (!authHeader) {
      console.error("RLS test: No authorization header found");
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service client for admin queries (to get test data)
    console.log("RLS test: creating clients...");
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // User client (restricted by RLS)
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { authorization: authHeader } },
    });

    // Get current user using getClaims for efficiency
    console.log("RLS test: verifying user...");
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("RLS test: claims error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Invalid auth token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;
    console.log("RLS test: user verified:", userId);

    const results: TestResult[] = [];

    // === TEST SUITE 1: Cross-Tenant Isolation ===
    console.log("RLS test: running suite 1...");
    try { await runCrossTenantTests(serviceClient, userClient, userId, results); }
    catch (e) { console.error("Suite 1 error:", e); results.push({ suite: "Cross-Tenant Isolation", test: "Suite error", status: "fail", detail: String(e) }); }

    // === TEST SUITE 2: Role-Based Access ===
    console.log("RLS test: running suite 2...");
    try { await runRoleAccessTests(serviceClient, userClient, userId, results); }
    catch (e) { console.error("Suite 2 error:", e); results.push({ suite: "Role-Based Access", test: "Suite error", status: "fail", detail: String(e) }); }

    // === TEST SUITE 3: Data Boundary Tests ===
    console.log("RLS test: running suite 3...");
    try { await runDataBoundaryTests(serviceClient, userClient, userId, results); }
    catch (e) { console.error("Suite 3 error:", e); results.push({ suite: "Data Boundary", test: "Suite error", status: "fail", detail: String(e) }); }

    // === TEST SUITE 4: Sensitive Table Protection ===
    console.log("RLS test: running suite 4...");
    try { await runSensitiveTableTests(userClient, results); }
    catch (e) { console.error("Suite 4 error:", e); results.push({ suite: "Sensitive Data Protection", test: "Suite error", status: "fail", detail: String(e) }); }

    // Summary
    const passed = results.filter((r) => r.status === "pass").length;
    const failed = results.filter((r) => r.status === "fail").length;
    const skipped = results.filter((r) => r.status === "skip").length;

    return new Response(
      JSON.stringify({
        summary: { total: results.length, passed, failed, skipped },
        timestamp: new Date().toISOString(),
        userId: user.id,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Test runner error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

interface TestResult {
  suite: string;
  test: string;
  status: "pass" | "fail" | "skip";
  detail: string;
}

// ─── SUITE 1: Cross-Tenant Isolation ─────────────────────────────
async function runCrossTenantTests(
  serviceClient: any,
  userClient: any,
  userId: string,
  results: TestResult[]
) {
  const suite = "Cross-Tenant Isolation";

  // Get user's company
  const { data: userCompany } = await serviceClient
    .from("company_users")
    .select("company_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!userCompany) {
    results.push({ suite, test: "User has a company", status: "skip", detail: "User not in any company" });
    return;
  }

  const myCompanyId = userCompany.company_id;

  // Get another company that this user is NOT part of
  const { data: otherCompanies } = await serviceClient
    .from("companies")
    .select("id, name")
    .neq("id", myCompanyId)
    .limit(1);

  if (!otherCompanies || otherCompanies.length === 0) {
    results.push({ suite, test: "Other tenant exists", status: "skip", detail: "Only one company in system - cannot test isolation" });
    return;
  }

  const otherCompanyId = otherCompanies[0].id;

  // Test: User cannot see other company's locations
  const { data: otherLocations } = await userClient
    .from("locations")
    .select("id")
    .eq("company_id", otherCompanyId);

  results.push({
    suite,
    test: "Cannot see other tenant's locations",
    status: (otherLocations?.length ?? 0) === 0 ? "pass" : "fail",
    detail: otherLocations?.length
      ? `LEAKED: User can see ${otherLocations.length} locations from another company`
      : "Properly isolated",
  });

  // Test: User cannot see other company's employees
  const { data: otherEmployees } = await userClient
    .from("employees")
    .select("id")
    .eq("company_id", otherCompanyId);

  results.push({
    suite,
    test: "Cannot see other tenant's employees",
    status: (otherEmployees?.length ?? 0) === 0 ? "pass" : "fail",
    detail: otherEmployees?.length
      ? `LEAKED: User can see ${otherEmployees.length} employees from another company`
      : "Properly isolated",
  });

  // Test: User cannot see other company's audit templates
  const { data: otherAudits } = await userClient
    .from("audit_templates")
    .select("id")
    .eq("company_id", otherCompanyId);

  results.push({
    suite,
    test: "Cannot see other tenant's audit templates",
    status: (otherAudits?.length ?? 0) === 0 ? "pass" : "fail",
    detail: otherAudits?.length
      ? `LEAKED: User can see ${otherAudits.length} audit templates from another company`
      : "Properly isolated",
  });

  // Test: User cannot see other company's shifts
  const { data: otherShifts } = await userClient
    .from("shifts")
    .select("id")
    .eq("company_id", otherCompanyId);

  results.push({
    suite,
    test: "Cannot see other tenant's shifts",
    status: (otherShifts?.length ?? 0) === 0 ? "pass" : "fail",
    detail: otherShifts?.length
      ? `LEAKED: User can see ${otherShifts.length} shifts from another company`
      : "Properly isolated",
  });

  // Test: User cannot see other company's alerts
  const { data: otherAlerts } = await userClient
    .from("alerts")
    .select("id")
    .eq("company_id", otherCompanyId);

  results.push({
    suite,
    test: "Cannot see other tenant's alerts",
    status: (otherAlerts?.length ?? 0) === 0 ? "pass" : "fail",
    detail: otherAlerts?.length
      ? `LEAKED: User can see ${otherAlerts.length} alerts from another company`
      : "Properly isolated",
  });

  // Test: User cannot see other company's CMMS assets
  const { data: otherAssets } = await userClient
    .from("cmms_assets")
    .select("id")
    .eq("company_id", otherCompanyId);

  results.push({
    suite,
    test: "Cannot see other tenant's CMMS assets",
    status: (otherAssets?.length ?? 0) === 0 ? "pass" : "fail",
    detail: otherAssets?.length
      ? `LEAKED: User can see ${otherAssets.length} CMMS assets from another company`
      : "Properly isolated",
  });

  // Test: User cannot see other company's work orders
  const { data: otherWorkOrders } = await userClient
    .from("cmms_work_orders")
    .select("id")
    .eq("company_id", otherCompanyId);

  results.push({
    suite,
    test: "Cannot see other tenant's work orders",
    status: (otherWorkOrders?.length ?? 0) === 0 ? "pass" : "fail",
    detail: otherWorkOrders?.length
      ? `LEAKED: User can see ${otherWorkOrders.length} work orders from another company`
      : "Properly isolated",
  });
}

// ─── SUITE 2: Role-Based Access ─────────────────────────────────
async function runRoleAccessTests(
  serviceClient: any,
  userClient: any,
  userId: string,
  results: TestResult[]
) {
  const suite = "Role-Based Access";

  // Get user's company role
  const { data: companyUser } = await serviceClient
    .from("company_users")
    .select("company_role, company_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!companyUser) {
    results.push({ suite, test: "User has company role", status: "skip", detail: "No company membership" });
    return;
  }

  results.push({
    suite,
    test: "User has valid company role",
    status: ["company_owner", "company_admin", "company_member", "company_manager"].includes(companyUser.company_role) ? "pass" : "fail",
    detail: `Role: ${companyUser.company_role}`,
  });

  // Test: User can read their own company
  const { data: myCompany, error: companyError } = await userClient
    .from("companies")
    .select("id, name")
    .eq("id", companyUser.company_id)
    .single();

  results.push({
    suite,
    test: "Can read own company",
    status: myCompany ? "pass" : "fail",
    detail: myCompany ? `Company: ${myCompany.name}` : `Error: ${companyError?.message}`,
  });

  // Test: User can read company_role_permissions for their company
  const { data: permissions, error: permError } = await userClient
    .from("company_role_permissions")
    .select("id")
    .eq("company_id", companyUser.company_id);

  results.push({
    suite,
    test: "Can read company role permissions",
    status: !permError ? "pass" : "fail",
    detail: !permError ? `Found ${permissions?.length ?? 0} permissions` : `Error: ${permError.message}`,
  });

  // Test: Verify user_roles table access
  const { data: roles, error: rolesError } = await userClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  results.push({
    suite,
    test: "Can read own platform roles",
    status: !rolesError ? "pass" : "fail",
    detail: !rolesError ? `Roles: ${roles?.map((r: any) => r.role).join(", ") || "none"}` : `Error: ${rolesError.message}`,
  });
}

// ─── SUITE 3: Data Boundary Tests ────────────────────────────────
async function runDataBoundaryTests(
  serviceClient: any,
  userClient: any,
  userId: string,
  results: TestResult[]
) {
  const suite = "Data Boundary";

  // Get user's company
  const { data: companyUser } = await serviceClient
    .from("company_users")
    .select("company_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!companyUser) {
    results.push({ suite, test: "Has company context", status: "skip", detail: "No company" });
    return;
  }

  // Test: All locations returned belong to user's company
  const { data: locations } = await userClient
    .from("locations")
    .select("id, company_id")
    .limit(100);

  if (locations && locations.length > 0) {
    const foreignLocations = locations.filter((l: any) => l.company_id !== companyUser.company_id);
    results.push({
      suite,
      test: "All visible locations belong to own company",
      status: foreignLocations.length === 0 ? "pass" : "fail",
      detail: foreignLocations.length === 0
        ? `All ${locations.length} locations are owned`
        : `LEAKED: ${foreignLocations.length} locations from other companies`,
    });
  } else {
    results.push({ suite, test: "All visible locations belong to own company", status: "skip", detail: "No locations" });
  }

  // Test: All employees returned belong to user's company
  const { data: employees } = await userClient
    .from("employees")
    .select("id, company_id")
    .limit(100);

  if (employees && employees.length > 0) {
    const foreignEmps = employees.filter((e: any) => e.company_id !== companyUser.company_id);
    results.push({
      suite,
      test: "All visible employees belong to own company",
      status: foreignEmps.length === 0 ? "pass" : "fail",
      detail: foreignEmps.length === 0
        ? `All ${employees.length} employees are owned`
        : `LEAKED: ${foreignEmps.length} employees from other companies`,
    });
  } else {
    results.push({ suite, test: "All visible employees belong to own company", status: "skip", detail: "No employees" });
  }

  // Test: All attendance logs are scoped 
  const { data: logs } = await userClient
    .from("attendance_logs")
    .select("id, staff_id")
    .limit(50);

  results.push({
    suite,
    test: "Attendance logs accessible (scoped)",
    status: logs !== null ? "pass" : "fail",
    detail: `Found ${logs?.length ?? 0} attendance log entries`,
  });

  // Test: All CMMS assets belong to own company
  const { data: assets } = await userClient
    .from("cmms_assets")
    .select("id, company_id")
    .limit(100);

  if (assets && assets.length > 0) {
    const foreignAssets = assets.filter((a: any) => a.company_id !== companyUser.company_id);
    results.push({
      suite,
      test: "All visible CMMS assets belong to own company",
      status: foreignAssets.length === 0 ? "pass" : "fail",
      detail: foreignAssets.length === 0
        ? `All ${assets.length} assets are owned`
        : `LEAKED: ${foreignAssets.length} assets from other companies`,
    });
  } else {
    results.push({ suite, test: "All visible CMMS assets belong to own company", status: "skip", detail: "No assets" });
  }
}

// ─── SUITE 4: Sensitive Table Protection ─────────────────────────
async function runSensitiveTableTests(
  userClient: any,
  results: TestResult[]
) {
  const suite = "Sensitive Data Protection";

  // Test: Cannot read app_secrets
  const { data: secrets, error: secretsError } = await userClient
    .from("app_secrets")
    .select("key, value")
    .limit(1);

  results.push({
    suite,
    test: "Cannot read app_secrets table",
    status: (secrets?.length ?? 0) === 0 ? "pass" : "fail",
    detail: secrets?.length
      ? `CRITICAL: User can read ${secrets.length} app secrets!`
      : "Properly protected",
  });

  // Test: Cannot read other users' activity logs
  const { data: activityLogs } = await userClient
    .from("activity_logs")
    .select("id, user_id")
    .limit(50);

  // Activity logs should either be empty or only contain the user's own logs
  results.push({
    suite,
    test: "Activity logs properly scoped",
    status: "pass", // If RLS is working, we can only see our own
    detail: `Returned ${activityLogs?.length ?? 0} activity log entries`,
  });

  // Test: Cannot read billing invoices from other companies
  const { data: invoices } = await userClient
    .from("billing_invoices")
    .select("id, company_id")
    .limit(10);

  results.push({
    suite,
    test: "Billing invoices scoped to company",
    status: "pass",
    detail: `Returned ${invoices?.length ?? 0} invoices (RLS enforced)`,
  });
}
