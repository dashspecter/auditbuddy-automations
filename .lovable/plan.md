

## Add Missing Modules to Database and Ensure Proper Gating

### Problem
The `modules` database table is missing several modules that are actively used in the platform. This means the Module Management settings page doesn't show all available modules, and companies can't toggle them on/off properly.

### Missing Modules (to insert into `modules` table)

| Code | Name | Description | Icon |
|------|------|-------------|------|
| `wastage` | Wastage Tracking | Track food/material waste with photo capture and cost analytics | Trash2 |
| `qr_forms` | QR Forms (HACCP / Quality) | Create and manage QR-based forms for quality records and HACCP compliance | QrCode |
| `whatsapp_messaging` | WhatsApp Messaging | Send WhatsApp messages, broadcasts, and automated alerts | MessageSquare |
| `payroll` | Payroll & Labor Costs | Track labor costs, payroll calculations, and wage analytics | DollarSign |
| `cmms` | CMMS (Maintenance) | Computerized maintenance management with work orders and PM schedules | Cog |
| `corrective_actions` | Corrective Actions | Track and manage corrective actions from audits and inspections | ShieldAlert |
| `operations` | Operations | Daily operations management, maintenance tasks, and SLA tracking | Settings2 |

All set to `industry_scope = 'GLOBAL'` and `is_active = true`.

### Navigation Gating Fix

Currently, `cmms`, `operations`, and `corrective_actions` have `module: null` in the navigation config, meaning they show for everyone regardless of module status. These need to be updated to reference their module codes so they hide when disabled:

**File: `src/config/navigation.ts`**
- `cmms` nav item: change `module: null` to `module: "cmms"`
- `operations` nav item: change `module: null` to `module: "operations"`
- `corrective-actions` nav item: change `module: null` to `module: "corrective_actions"`

### Module Management UI Update

**File: `src/components/settings/IndustryModuleManagement.tsx`**

Add the missing entries to the `MODULE_NAMES` map so the settings page displays proper names for all modules:

```text
'wastage': 'Wastage Tracking'
'qr_forms': 'QR Forms'
'whatsapp_messaging': 'WhatsApp Messaging'
'payroll': 'Payroll & Labor Costs'
'cmms': 'CMMS (Maintenance)'
'corrective_actions': 'Corrective Actions'
'operations': 'Operations'
```

### Pricing Tiers Update

**File: `src/config/pricingTiers.ts`**

Add the new module codes to the appropriate tier `allowedModules` arrays so tier-based access works:
- **Starter**: add `corrective_actions`, `operations`
- **Professional**: add `payroll`, `cmms`, `corrective_actions`, `operations`
- **Enterprise**: add `payroll`, `cmms`, `corrective_actions`, `operations`

### ModuleGuard Fallback Names

**File: `src/components/ModuleGuard.tsx`**

Add missing entries to the `getModuleName` map so locked-out pages show proper names:
- `cmms`: 'CMMS (Maintenance)'
- `corrective_actions`: 'Corrective Actions'
- `operations`: 'Operations'
- `payroll`: 'Payroll & Labor Costs'
- `whatsapp_messaging`: 'WhatsApp Messaging'

### Summary of Changes

1. **Database**: Insert 7 missing module rows (data insert, no schema change)
2. **`src/config/navigation.ts`**: Set module keys for cmms, operations, corrective_actions (3 lines)
3. **`src/components/settings/IndustryModuleManagement.tsx`**: Add 7 entries to MODULE_NAMES map
4. **`src/config/pricingTiers.ts`**: Add new modules to tier allowedModules arrays
5. **`src/components/ModuleGuard.tsx`**: Add 5 entries to getModuleName map

No existing behavior changes. Modules already enabled for companies continue to work. Modules not enabled will now properly hide their navigation items and show the lock screen.
