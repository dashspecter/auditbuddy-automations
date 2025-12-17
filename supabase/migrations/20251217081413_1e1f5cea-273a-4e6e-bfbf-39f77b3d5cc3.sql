
-- =====================================================
-- INDUSTRIAL CMMS DATA MODEL - Phase 1
-- =====================================================

-- 1. Asset Categories
CREATE TABLE public.asset_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(company_id, name)
);

-- 2. Tags
CREATE TABLE public.cmms_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

-- 3. Assets (Industrial)
CREATE TABLE public.cmms_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  asset_code TEXT NOT NULL,
  category_id UUID REFERENCES public.asset_categories(id),
  location_id UUID REFERENCES public.locations(id),
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  year INTEGER,
  warranty_expiry DATE,
  criticality TEXT NOT NULL DEFAULT 'Medium' CHECK (criticality IN ('Low', 'Medium', 'High')),
  meter_type TEXT DEFAULT 'none' CHECK (meter_type IN ('none', 'hours', 'cycles', 'odometer')),
  meter_current_value NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Down', 'Retired')),
  qr_token TEXT UNIQUE,
  qr_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(company_id, asset_code)
);

-- 4. Asset Files
CREATE TABLE public.cmms_asset_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.cmms_assets(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- 5. Asset Tags (junction)
CREATE TABLE public.cmms_asset_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.cmms_assets(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.cmms_tags(id) ON DELETE CASCADE,
  UNIQUE(asset_id, tag_id)
);

-- 6. Vendors
CREATE TABLE public.cmms_vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false
);

-- 7. Vendor Locations (junction)
CREATE TABLE public.cmms_vendor_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.cmms_vendors(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE
);

-- 8. Procedures (SOP Library)
CREATE TABLE public.cmms_procedures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  estimated_minutes INTEGER,
  safety_notes TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false
);

-- 9. Procedure Steps
CREATE TABLE public.cmms_procedure_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  procedure_id UUID NOT NULL REFERENCES public.cmms_procedures(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  instruction_text TEXT,
  requires_photo BOOLEAN NOT NULL DEFAULT false,
  requires_value BOOLEAN NOT NULL DEFAULT false,
  value_type TEXT CHECK (value_type IN ('text', 'number', 'rating', 'choice')),
  choices_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. Procedure Files
CREATE TABLE public.cmms_procedure_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  procedure_id UUID NOT NULL REFERENCES public.cmms_procedures(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- 11. Asset Procedures (junction)
CREATE TABLE public.cmms_asset_procedures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.cmms_assets(id) ON DELETE CASCADE,
  procedure_id UUID NOT NULL REFERENCES public.cmms_procedures(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(asset_id, procedure_id)
);

-- 12. Teams
CREATE TABLE public.cmms_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false
);

-- 13. Team Members
CREATE TABLE public.cmms_team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.cmms_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- 14. Work Orders (Core)
CREATE TABLE public.cmms_work_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  wo_number SERIAL,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Reactive' CHECK (type IN ('Reactive', 'Preventive', 'Inspection', 'Calibration')),
  asset_id UUID REFERENCES public.cmms_assets(id),
  location_id UUID REFERENCES public.locations(id),
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'OnHold', 'InProgress', 'Done', 'Cancelled')),
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
  due_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  assigned_user_id UUID,
  assigned_team_id UUID REFERENCES public.cmms_teams(id),
  description TEXT,
  internal_notes TEXT,
  estimated_minutes INTEGER,
  actual_minutes INTEGER,
  labor_cost NUMERIC DEFAULT 0,
  parts_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC GENERATED ALWAYS AS (COALESCE(labor_cost, 0) + COALESCE(parts_cost, 0)) STORED,
  procedure_id UUID REFERENCES public.cmms_procedures(id),
  checklist_snapshot_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false
);

-- 15. Work Order Comments
CREATE TABLE public.cmms_work_order_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID NOT NULL REFERENCES public.cmms_work_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 16. Work Order Files
CREATE TABLE public.cmms_work_order_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID NOT NULL REFERENCES public.cmms_work_orders(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- 17. Work Order Watchers
CREATE TABLE public.cmms_work_order_watchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID NOT NULL REFERENCES public.cmms_work_orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(work_order_id, user_id)
);

-- 18. Work Order Status History
CREATE TABLE public.cmms_work_order_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID NOT NULL REFERENCES public.cmms_work_orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 19. Work Order Checklist Responses
CREATE TABLE public.cmms_work_order_checklist_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID NOT NULL REFERENCES public.cmms_work_orders(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  response_json JSONB,
  photo_url TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(work_order_id, step_key)
);

-- 20. PM Plans
CREATE TABLE public.cmms_pm_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('asset', 'category', 'tag')),
  asset_id UUID REFERENCES public.cmms_assets(id),
  category_id UUID REFERENCES public.asset_categories(id),
  tag_id UUID REFERENCES public.cmms_tags(id),
  location_id UUID REFERENCES public.locations(id),
  frequency_type TEXT NOT NULL CHECK (frequency_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'annually', 'hours', 'cycles')),
  frequency_value INTEGER NOT NULL DEFAULT 1,
  next_due_at TIMESTAMP WITH TIME ZONE,
  procedure_id UUID REFERENCES public.cmms_procedures(id),
  auto_create_work_order BOOLEAN NOT NULL DEFAULT true,
  default_priority TEXT NOT NULL DEFAULT 'Medium',
  assigned_user_id UUID,
  assigned_team_id UUID REFERENCES public.cmms_teams(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false
);

-- 21. PM Runs
CREATE TABLE public.cmms_pm_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pm_plan_id UUID NOT NULL REFERENCES public.cmms_pm_plans(id) ON DELETE CASCADE,
  generated_work_order_id UUID REFERENCES public.cmms_work_orders(id),
  run_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'generated'
);

-- 22. Parts
CREATE TABLE public.cmms_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  unit TEXT DEFAULT 'each',
  photo_url TEXT,
  minimum_qty NUMERIC DEFAULT 0,
  reorder_qty NUMERIC DEFAULT 0,
  avg_unit_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false
);

-- 23. Part Stock
CREATE TABLE public.cmms_part_stock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  part_id UUID NOT NULL REFERENCES public.cmms_parts(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id),
  qty_on_hand NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(part_id, location_id)
);

-- 24. Part Transactions
CREATE TABLE public.cmms_part_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  part_id UUID NOT NULL REFERENCES public.cmms_parts(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id),
  qty_delta NUMERIC NOT NULL,
  reason TEXT,
  related_work_order_id UUID REFERENCES public.cmms_work_orders(id),
  performed_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 25. Purchase Orders
CREATE TABLE public.cmms_purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  po_number SERIAL,
  vendor_id UUID REFERENCES public.cmms_vendors(id),
  location_id UUID REFERENCES public.locations(id),
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Sent', 'PartiallyReceived', 'Received', 'Cancelled')),
  expected_at DATE,
  notes TEXT,
  total_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  is_archived BOOLEAN NOT NULL DEFAULT false
);

-- 26. Purchase Order Items
CREATE TABLE public.cmms_purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES public.cmms_purchase_orders(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES public.cmms_parts(id),
  qty NUMERIC NOT NULL,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  received_qty NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 27. Reporting Daily Snapshots
CREATE TABLE public.cmms_reporting_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  location_id UUID REFERENCES public.locations(id),
  metrics_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, date, location_id)
);

-- 28. CMMS Audit Log
CREATE TABLE public.cmms_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmms_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmms_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmms_asset_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmms_asset_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmms_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmms_vendor_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmms_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmms_procedure_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmms_procedure_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmms_asset_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmms_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmms_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmms_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmms_work_order_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmms_work_order_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmms_work_order_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmms_work_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmms_work_order_checklist_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmms_pm_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmms_pm_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmms_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmms_part_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmms_part_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmms_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmms_purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmms_reporting_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cmms_audit_log ENABLE ROW LEVEL SECURITY;

-- Asset Categories policies
CREATE POLICY "Users can view asset categories in their company" ON public.asset_categories
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Managers can manage asset categories" ON public.asset_categories
  FOR ALL USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

-- Tags policies
CREATE POLICY "Users can view tags in their company" ON public.cmms_tags
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Managers can manage tags" ON public.cmms_tags
  FOR ALL USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

-- Assets policies
CREATE POLICY "Users can view assets in their company" ON public.cmms_assets
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Managers can manage assets" ON public.cmms_assets
  FOR ALL USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));
CREATE POLICY "Public can view assets by QR token" ON public.cmms_assets
  FOR SELECT USING (qr_token IS NOT NULL);

-- Asset Files policies
CREATE POLICY "Users can view asset files" ON public.cmms_asset_files
  FOR SELECT USING (EXISTS (SELECT 1 FROM cmms_assets a WHERE a.id = asset_id AND a.company_id = get_user_company_id(auth.uid())));
CREATE POLICY "Managers can manage asset files" ON public.cmms_asset_files
  FOR ALL USING (EXISTS (SELECT 1 FROM cmms_assets a WHERE a.id = asset_id AND a.company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))));

-- Asset Tags policies
CREATE POLICY "Users can view asset tags" ON public.cmms_asset_tags
  FOR SELECT USING (EXISTS (SELECT 1 FROM cmms_assets a WHERE a.id = asset_id AND a.company_id = get_user_company_id(auth.uid())));
CREATE POLICY "Managers can manage asset tags" ON public.cmms_asset_tags
  FOR ALL USING (EXISTS (SELECT 1 FROM cmms_assets a WHERE a.id = asset_id AND a.company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))));

-- Vendors policies
CREATE POLICY "Users can view vendors in their company" ON public.cmms_vendors
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Managers can manage vendors" ON public.cmms_vendors
  FOR ALL USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

-- Vendor Locations policies
CREATE POLICY "Users can view vendor locations" ON public.cmms_vendor_locations
  FOR SELECT USING (EXISTS (SELECT 1 FROM cmms_vendors v WHERE v.id = vendor_id AND v.company_id = get_user_company_id(auth.uid())));
CREATE POLICY "Managers can manage vendor locations" ON public.cmms_vendor_locations
  FOR ALL USING (EXISTS (SELECT 1 FROM cmms_vendors v WHERE v.id = vendor_id AND v.company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))));

-- Procedures policies
CREATE POLICY "Users can view procedures in their company" ON public.cmms_procedures
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Managers can manage procedures" ON public.cmms_procedures
  FOR ALL USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

-- Procedure Steps policies
CREATE POLICY "Users can view procedure steps" ON public.cmms_procedure_steps
  FOR SELECT USING (EXISTS (SELECT 1 FROM cmms_procedures p WHERE p.id = procedure_id AND p.company_id = get_user_company_id(auth.uid())));
CREATE POLICY "Managers can manage procedure steps" ON public.cmms_procedure_steps
  FOR ALL USING (EXISTS (SELECT 1 FROM cmms_procedures p WHERE p.id = procedure_id AND p.company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))));

-- Procedure Files policies
CREATE POLICY "Users can view procedure files" ON public.cmms_procedure_files
  FOR SELECT USING (EXISTS (SELECT 1 FROM cmms_procedures p WHERE p.id = procedure_id AND p.company_id = get_user_company_id(auth.uid())));
CREATE POLICY "Managers can manage procedure files" ON public.cmms_procedure_files
  FOR ALL USING (EXISTS (SELECT 1 FROM cmms_procedures p WHERE p.id = procedure_id AND p.company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))));

-- Asset Procedures policies
CREATE POLICY "Users can view asset procedures" ON public.cmms_asset_procedures
  FOR SELECT USING (EXISTS (SELECT 1 FROM cmms_assets a WHERE a.id = asset_id AND a.company_id = get_user_company_id(auth.uid())));
CREATE POLICY "Managers can manage asset procedures" ON public.cmms_asset_procedures
  FOR ALL USING (EXISTS (SELECT 1 FROM cmms_assets a WHERE a.id = asset_id AND a.company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))));

-- Teams policies
CREATE POLICY "Users can view teams in their company" ON public.cmms_teams
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Managers can manage teams" ON public.cmms_teams
  FOR ALL USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

-- Team Members policies
CREATE POLICY "Users can view team members" ON public.cmms_team_members
  FOR SELECT USING (EXISTS (SELECT 1 FROM cmms_teams t WHERE t.id = team_id AND t.company_id = get_user_company_id(auth.uid())));
CREATE POLICY "Managers can manage team members" ON public.cmms_team_members
  FOR ALL USING (EXISTS (SELECT 1 FROM cmms_teams t WHERE t.id = team_id AND t.company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))));

-- Work Orders policies
CREATE POLICY "Users can view work orders in their company" ON public.cmms_work_orders
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Users can create work orders in their company" ON public.cmms_work_orders
  FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Users can update assigned work orders" ON public.cmms_work_orders
  FOR UPDATE USING (company_id = get_user_company_id(auth.uid()) AND (assigned_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));
CREATE POLICY "Managers can delete work orders" ON public.cmms_work_orders
  FOR DELETE USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

-- Work Order Comments policies
CREATE POLICY "Users can view work order comments" ON public.cmms_work_order_comments
  FOR SELECT USING (EXISTS (SELECT 1 FROM cmms_work_orders wo WHERE wo.id = work_order_id AND wo.company_id = get_user_company_id(auth.uid())));
CREATE POLICY "Users can add comments to work orders" ON public.cmms_work_order_comments
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM cmms_work_orders wo WHERE wo.id = work_order_id AND wo.company_id = get_user_company_id(auth.uid())));

-- Work Order Files policies
CREATE POLICY "Users can view work order files" ON public.cmms_work_order_files
  FOR SELECT USING (EXISTS (SELECT 1 FROM cmms_work_orders wo WHERE wo.id = work_order_id AND wo.company_id = get_user_company_id(auth.uid())));
CREATE POLICY "Users can add files to work orders" ON public.cmms_work_order_files
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM cmms_work_orders wo WHERE wo.id = work_order_id AND wo.company_id = get_user_company_id(auth.uid())));

-- Work Order Watchers policies
CREATE POLICY "Users can view work order watchers" ON public.cmms_work_order_watchers
  FOR SELECT USING (EXISTS (SELECT 1 FROM cmms_work_orders wo WHERE wo.id = work_order_id AND wo.company_id = get_user_company_id(auth.uid())));
CREATE POLICY "Users can manage work order watchers" ON public.cmms_work_order_watchers
  FOR ALL USING (EXISTS (SELECT 1 FROM cmms_work_orders wo WHERE wo.id = work_order_id AND wo.company_id = get_user_company_id(auth.uid())));

-- Work Order Status History policies
CREATE POLICY "Users can view status history" ON public.cmms_work_order_status_history
  FOR SELECT USING (EXISTS (SELECT 1 FROM cmms_work_orders wo WHERE wo.id = work_order_id AND wo.company_id = get_user_company_id(auth.uid())));
CREATE POLICY "Users can add status history" ON public.cmms_work_order_status_history
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM cmms_work_orders wo WHERE wo.id = work_order_id AND wo.company_id = get_user_company_id(auth.uid())));

-- Work Order Checklist Responses policies
CREATE POLICY "Users can view checklist responses" ON public.cmms_work_order_checklist_responses
  FOR SELECT USING (EXISTS (SELECT 1 FROM cmms_work_orders wo WHERE wo.id = work_order_id AND wo.company_id = get_user_company_id(auth.uid())));
CREATE POLICY "Users can manage checklist responses" ON public.cmms_work_order_checklist_responses
  FOR ALL USING (EXISTS (SELECT 1 FROM cmms_work_orders wo WHERE wo.id = work_order_id AND wo.company_id = get_user_company_id(auth.uid())));

-- PM Plans policies
CREATE POLICY "Users can view PM plans in their company" ON public.cmms_pm_plans
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Managers can manage PM plans" ON public.cmms_pm_plans
  FOR ALL USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

-- PM Runs policies
CREATE POLICY "Users can view PM runs" ON public.cmms_pm_runs
  FOR SELECT USING (EXISTS (SELECT 1 FROM cmms_pm_plans pp WHERE pp.id = pm_plan_id AND pp.company_id = get_user_company_id(auth.uid())));
CREATE POLICY "System can manage PM runs" ON public.cmms_pm_runs
  FOR ALL USING (EXISTS (SELECT 1 FROM cmms_pm_plans pp WHERE pp.id = pm_plan_id AND pp.company_id = get_user_company_id(auth.uid())));

-- Parts policies
CREATE POLICY "Users can view parts in their company" ON public.cmms_parts
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Managers can manage parts" ON public.cmms_parts
  FOR ALL USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

-- Part Stock policies
CREATE POLICY "Users can view part stock" ON public.cmms_part_stock
  FOR SELECT USING (EXISTS (SELECT 1 FROM cmms_parts p WHERE p.id = part_id AND p.company_id = get_user_company_id(auth.uid())));
CREATE POLICY "Managers can manage part stock" ON public.cmms_part_stock
  FOR ALL USING (EXISTS (SELECT 1 FROM cmms_parts p WHERE p.id = part_id AND p.company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))));

-- Part Transactions policies
CREATE POLICY "Users can view part transactions" ON public.cmms_part_transactions
  FOR SELECT USING (EXISTS (SELECT 1 FROM cmms_parts p WHERE p.id = part_id AND p.company_id = get_user_company_id(auth.uid())));
CREATE POLICY "Users can create part transactions" ON public.cmms_part_transactions
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM cmms_parts p WHERE p.id = part_id AND p.company_id = get_user_company_id(auth.uid())));

-- Purchase Orders policies
CREATE POLICY "Users can view purchase orders in their company" ON public.cmms_purchase_orders
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Managers can manage purchase orders" ON public.cmms_purchase_orders
  FOR ALL USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)));

-- Purchase Order Items policies
CREATE POLICY "Users can view purchase order items" ON public.cmms_purchase_order_items
  FOR SELECT USING (EXISTS (SELECT 1 FROM cmms_purchase_orders po WHERE po.id = purchase_order_id AND po.company_id = get_user_company_id(auth.uid())));
CREATE POLICY "Managers can manage purchase order items" ON public.cmms_purchase_order_items
  FOR ALL USING (EXISTS (SELECT 1 FROM cmms_purchase_orders po WHERE po.id = purchase_order_id AND po.company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))));

-- Reporting Snapshots policies
CREATE POLICY "Users can view reporting snapshots in their company" ON public.cmms_reporting_snapshots
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "System can manage reporting snapshots" ON public.cmms_reporting_snapshots
  FOR ALL USING (company_id = get_user_company_id(auth.uid()));

-- Audit Log policies
CREATE POLICY "Users can view audit logs in their company" ON public.cmms_audit_log
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Users can create audit logs" ON public.cmms_audit_log
  FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_cmms_assets_company ON public.cmms_assets(company_id);
CREATE INDEX idx_cmms_assets_location ON public.cmms_assets(location_id);
CREATE INDEX idx_cmms_assets_qr_token ON public.cmms_assets(qr_token);
CREATE INDEX idx_cmms_work_orders_company ON public.cmms_work_orders(company_id);
CREATE INDEX idx_cmms_work_orders_status ON public.cmms_work_orders(status);
CREATE INDEX idx_cmms_work_orders_asset ON public.cmms_work_orders(asset_id);
CREATE INDEX idx_cmms_work_orders_assigned ON public.cmms_work_orders(assigned_user_id);
CREATE INDEX idx_cmms_work_orders_due ON public.cmms_work_orders(due_at);
CREATE INDEX idx_cmms_pm_plans_company ON public.cmms_pm_plans(company_id);
CREATE INDEX idx_cmms_pm_plans_next_due ON public.cmms_pm_plans(next_due_at);
CREATE INDEX idx_cmms_parts_company ON public.cmms_parts(company_id);
CREATE INDEX idx_cmms_audit_log_company ON public.cmms_audit_log(company_id);
CREATE INDEX idx_cmms_audit_log_entity ON public.cmms_audit_log(entity_type, entity_id);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_cmms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_asset_categories_updated_at BEFORE UPDATE ON public.asset_categories FOR EACH ROW EXECUTE FUNCTION update_cmms_updated_at();
CREATE TRIGGER trigger_cmms_assets_updated_at BEFORE UPDATE ON public.cmms_assets FOR EACH ROW EXECUTE FUNCTION update_cmms_updated_at();
CREATE TRIGGER trigger_cmms_vendors_updated_at BEFORE UPDATE ON public.cmms_vendors FOR EACH ROW EXECUTE FUNCTION update_cmms_updated_at();
CREATE TRIGGER trigger_cmms_procedures_updated_at BEFORE UPDATE ON public.cmms_procedures FOR EACH ROW EXECUTE FUNCTION update_cmms_updated_at();
CREATE TRIGGER trigger_cmms_procedure_steps_updated_at BEFORE UPDATE ON public.cmms_procedure_steps FOR EACH ROW EXECUTE FUNCTION update_cmms_updated_at();
CREATE TRIGGER trigger_cmms_teams_updated_at BEFORE UPDATE ON public.cmms_teams FOR EACH ROW EXECUTE FUNCTION update_cmms_updated_at();
CREATE TRIGGER trigger_cmms_work_orders_updated_at BEFORE UPDATE ON public.cmms_work_orders FOR EACH ROW EXECUTE FUNCTION update_cmms_updated_at();
CREATE TRIGGER trigger_cmms_work_order_checklist_responses_updated_at BEFORE UPDATE ON public.cmms_work_order_checklist_responses FOR EACH ROW EXECUTE FUNCTION update_cmms_updated_at();
CREATE TRIGGER trigger_cmms_pm_plans_updated_at BEFORE UPDATE ON public.cmms_pm_plans FOR EACH ROW EXECUTE FUNCTION update_cmms_updated_at();
CREATE TRIGGER trigger_cmms_parts_updated_at BEFORE UPDATE ON public.cmms_parts FOR EACH ROW EXECUTE FUNCTION update_cmms_updated_at();
CREATE TRIGGER trigger_cmms_part_stock_updated_at BEFORE UPDATE ON public.cmms_part_stock FOR EACH ROW EXECUTE FUNCTION update_cmms_updated_at();
CREATE TRIGGER trigger_cmms_purchase_orders_updated_at BEFORE UPDATE ON public.cmms_purchase_orders FOR EACH ROW EXECUTE FUNCTION update_cmms_updated_at();
