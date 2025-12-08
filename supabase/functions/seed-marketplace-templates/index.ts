import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pre-defined starter templates for the marketplace
const starterTemplates = [
  // AUDIT TEMPLATES
  {
    title: "Restaurant Daily Opening Checklist",
    description: "Comprehensive daily opening procedures for restaurants. Covers kitchen prep, front-of-house setup, equipment checks, and safety protocols.",
    template_type: "audit",
    category_slug: "opening-closing",
    industry_slug: "hospitality",
    content: {
      sections: [
        {
          id: "kitchen-prep",
          name: "Kitchen Preparation",
          description: "Verify kitchen is ready for service",
          fields: [
            { id: "k1", name: "All refrigeration units at proper temperature", type: "checkbox", required: true },
            { id: "k2", name: "Food prep areas sanitized", type: "checkbox", required: true },
            { id: "k3", name: "Cooking equipment tested and functional", type: "checkbox", required: true },
            { id: "k4", name: "Ingredient stock levels checked", type: "checkbox", required: true },
            { id: "k5", name: "Handwashing stations stocked", type: "checkbox", required: true },
          ]
        },
        {
          id: "front-house",
          name: "Front of House",
          description: "Prepare dining area for guests",
          fields: [
            { id: "f1", name: "Tables cleaned and set", type: "checkbox", required: true },
            { id: "f2", name: "Floor swept and mopped", type: "checkbox", required: true },
            { id: "f3", name: "POS systems operational", type: "checkbox", required: true },
            { id: "f4", name: "Menus clean and available", type: "checkbox", required: true },
            { id: "f5", name: "Music/ambiance set", type: "checkbox", required: false },
          ]
        },
        {
          id: "safety",
          name: "Safety & Compliance",
          description: "Ensure safety standards are met",
          fields: [
            { id: "s1", name: "Fire exits clear and accessible", type: "checkbox", required: true },
            { id: "s2", name: "First aid kit stocked", type: "checkbox", required: true },
            { id: "s3", name: "Emergency contact list visible", type: "checkbox", required: true },
          ]
        }
      ]
    }
  },
  {
    title: "Retail Store Opening Checklist",
    description: "Daily opening procedures for retail stores. Covers cash handling, display setup, security checks, and staff briefing.",
    template_type: "audit",
    category_slug: "opening-closing",
    industry_slug: "retail",
    content: {
      sections: [
        {
          id: "security",
          name: "Security & Cash",
          fields: [
            { id: "sec1", name: "Alarm deactivated and logged", type: "checkbox", required: true },
            { id: "sec2", name: "Cash drawer counted and verified", type: "checkbox", required: true },
            { id: "sec3", name: "Security cameras operational", type: "checkbox", required: true },
            { id: "sec4", name: "Safe secured", type: "checkbox", required: true },
          ]
        },
        {
          id: "store-setup",
          name: "Store Setup",
          fields: [
            { id: "st1", name: "Lighting and signage on", type: "checkbox", required: true },
            { id: "st2", name: "Displays stocked and tidy", type: "checkbox", required: true },
            { id: "st3", name: "Fitting rooms checked", type: "checkbox", required: false },
            { id: "st4", name: "Floor vacuumed/mopped", type: "checkbox", required: true },
          ]
        }
      ]
    }
  },
  {
    title: "HACCP Daily Temperature Log",
    description: "Food safety temperature monitoring for compliance with HACCP regulations. Track refrigeration, cooking, and holding temperatures.",
    template_type: "audit",
    category_slug: "food-safety",
    industry_slug: "hospitality",
    content: {
      sections: [
        {
          id: "refrigeration",
          name: "Refrigeration Units",
          fields: [
            { id: "r1", name: "Walk-in cooler temperature (°C)", type: "number", required: true },
            { id: "r2", name: "Prep fridge temperature (°C)", type: "number", required: true },
            { id: "r3", name: "Freezer temperature (°C)", type: "number", required: true },
            { id: "r4", name: "All units below 5°C / -18°C", type: "checkbox", required: true },
          ]
        },
        {
          id: "cooking",
          name: "Cooking Temperatures",
          fields: [
            { id: "c1", name: "Sample food item tested", type: "text", required: true },
            { id: "c2", name: "Core temperature reached (°C)", type: "number", required: true },
            { id: "c3", name: "Temperature met food safety standard", type: "checkbox", required: true },
          ]
        }
      ]
    }
  },
  {
    title: "Gym Equipment Safety Inspection",
    description: "Weekly safety inspection for fitness equipment. Check for wear, damage, and proper function to ensure member safety.",
    template_type: "audit",
    category_slug: "safety-compliance",
    industry_slug: "fitness",
    content: {
      sections: [
        {
          id: "cardio",
          name: "Cardio Equipment",
          fields: [
            { id: "car1", name: "Treadmills - belts aligned, emergency stops working", type: "checkbox", required: true },
            { id: "car2", name: "Ellipticals - smooth motion, no unusual sounds", type: "checkbox", required: true },
            { id: "car3", name: "Bikes - seats secure, resistance working", type: "checkbox", required: true },
            { id: "car4", name: "Issues found", type: "text", required: false },
          ]
        },
        {
          id: "weights",
          name: "Weight Equipment",
          fields: [
            { id: "w1", name: "Free weights organized and undamaged", type: "checkbox", required: true },
            { id: "w2", name: "Cable machines - cables intact, no fraying", type: "checkbox", required: true },
            { id: "w3", name: "Benches stable and upholstery intact", type: "checkbox", required: true },
            { id: "w4", name: "Weight racks secure", type: "checkbox", required: true },
          ]
        }
      ]
    }
  },
  {
    title: "Hotel Room Inspection Checklist",
    description: "Quality assurance checklist for hotel housekeeping. Ensure rooms meet cleanliness and presentation standards.",
    template_type: "audit",
    category_slug: "quality-control",
    industry_slug: "hospitality",
    content: {
      sections: [
        {
          id: "bedroom",
          name: "Bedroom",
          fields: [
            { id: "b1", name: "Bed made to standard", type: "checkbox", required: true },
            { id: "b2", name: "Linens fresh and stain-free", type: "checkbox", required: true },
            { id: "b3", name: "Surfaces dusted", type: "checkbox", required: true },
            { id: "b4", name: "TV and remote functional", type: "checkbox", required: true },
          ]
        },
        {
          id: "bathroom",
          name: "Bathroom",
          fields: [
            { id: "ba1", name: "Toilet cleaned and sanitized", type: "checkbox", required: true },
            { id: "ba2", name: "Shower/tub spotless", type: "checkbox", required: true },
            { id: "ba3", name: "Fresh towels placed", type: "checkbox", required: true },
            { id: "ba4", name: "Amenities stocked", type: "checkbox", required: true },
          ]
        }
      ]
    }
  },

  // SOP CHECKLISTS
  {
    title: "New Employee Onboarding SOP",
    description: "Standard operating procedure for onboarding new employees. Covers paperwork, training, equipment setup, and team introduction.",
    template_type: "sop",
    category_slug: "staff-training",
    industry_slug: null,
    content: {
      sections: [
        {
          id: "day-one",
          name: "Day 1 - Welcome",
          fields: [
            { id: "d1", name: "Welcome and office tour completed", type: "checkbox", required: true },
            { id: "d2", name: "Employment documents signed", type: "checkbox", required: true },
            { id: "d3", name: "ID badge issued", type: "checkbox", required: true },
            { id: "d4", name: "Workstation set up", type: "checkbox", required: true },
            { id: "d5", name: "Email and system access created", type: "checkbox", required: true },
          ]
        },
        {
          id: "first-week",
          name: "First Week Training",
          fields: [
            { id: "w1", name: "Company policies reviewed", type: "checkbox", required: true },
            { id: "w2", name: "Safety training completed", type: "checkbox", required: true },
            { id: "w3", name: "Department-specific training started", type: "checkbox", required: true },
            { id: "w4", name: "Buddy/mentor assigned", type: "checkbox", required: true },
          ]
        }
      ]
    }
  },
  {
    title: "Customer Complaint Handling SOP",
    description: "Step-by-step procedure for handling customer complaints professionally and effectively.",
    template_type: "sop",
    category_slug: "customer-service",
    industry_slug: null,
    content: {
      sections: [
        {
          id: "initial",
          name: "Initial Response",
          fields: [
            { id: "i1", name: "Listen actively without interrupting", type: "checkbox", required: true },
            { id: "i2", name: "Acknowledge the issue and apologize", type: "checkbox", required: true },
            { id: "i3", name: "Customer details recorded", type: "checkbox", required: true },
            { id: "i4", name: "Issue clearly documented", type: "text", required: true },
          ]
        },
        {
          id: "resolution",
          name: "Resolution",
          fields: [
            { id: "r1", name: "Solution offered to customer", type: "checkbox", required: true },
            { id: "r2", name: "Customer satisfied with resolution", type: "checkbox", required: true },
            { id: "r3", name: "Follow-up scheduled if needed", type: "checkbox", required: false },
            { id: "r4", name: "Incident logged in system", type: "checkbox", required: true },
          ]
        }
      ]
    }
  },
  {
    title: "Cash Register Closing SOP",
    description: "End-of-day cash handling procedures to ensure accurate counts and secure deposits.",
    template_type: "sop",
    category_slug: "opening-closing",
    industry_slug: "retail",
    content: {
      sections: [
        {
          id: "counting",
          name: "Cash Count",
          fields: [
            { id: "c1", name: "Register closed and Z-report printed", type: "checkbox", required: true },
            { id: "c2", name: "Cash counted by two employees", type: "checkbox", required: true },
            { id: "c3", name: "Total cash amount", type: "number", required: true },
            { id: "c4", name: "Variance from expected (if any)", type: "number", required: false },
          ]
        },
        {
          id: "deposit",
          name: "Deposit Preparation",
          fields: [
            { id: "d1", name: "Deposit slip completed", type: "checkbox", required: true },
            { id: "d2", name: "Cash secured in deposit bag", type: "checkbox", required: true },
            { id: "d3", name: "Safe locked", type: "checkbox", required: true },
          ]
        }
      ]
    }
  },

  // MAINTENANCE FLOWS
  {
    title: "Commercial HVAC Monthly Maintenance",
    description: "Monthly preventive maintenance checklist for commercial HVAC systems to ensure optimal performance and longevity.",
    template_type: "maintenance",
    category_slug: "equipment-maintenance",
    industry_slug: null,
    content: {
      sections: [
        {
          id: "filters",
          name: "Filters & Airflow",
          fields: [
            { id: "f1", name: "Air filters checked/replaced", type: "checkbox", required: true },
            { id: "f2", name: "Vents and diffusers cleaned", type: "checkbox", required: true },
            { id: "f3", name: "Airflow adequate at all vents", type: "checkbox", required: true },
          ]
        },
        {
          id: "mechanical",
          name: "Mechanical Components",
          fields: [
            { id: "m1", name: "Belt tension checked", type: "checkbox", required: true },
            { id: "m2", name: "Bearings lubricated", type: "checkbox", required: true },
            { id: "m3", name: "Electrical connections inspected", type: "checkbox", required: true },
            { id: "m4", name: "Thermostat calibration verified", type: "checkbox", required: true },
          ]
        },
        {
          id: "notes",
          name: "Observations",
          fields: [
            { id: "n1", name: "Issues found", type: "text", required: false },
            { id: "n2", name: "Parts needed", type: "text", required: false },
            { id: "n3", name: "Next service date", type: "text", required: true },
          ]
        }
      ]
    }
  },
  {
    title: "Commercial Kitchen Equipment Maintenance",
    description: "Weekly maintenance checklist for commercial kitchen equipment including ovens, fryers, and refrigeration.",
    template_type: "maintenance",
    category_slug: "equipment-maintenance",
    industry_slug: "hospitality",
    content: {
      sections: [
        {
          id: "cooking",
          name: "Cooking Equipment",
          fields: [
            { id: "c1", name: "Oven calibration checked", type: "checkbox", required: true },
            { id: "c2", name: "Fryer oil quality checked", type: "checkbox", required: true },
            { id: "c3", name: "Grill surfaces cleaned and inspected", type: "checkbox", required: true },
            { id: "c4", name: "Hood ventilation clean", type: "checkbox", required: true },
          ]
        },
        {
          id: "refrigeration",
          name: "Refrigeration",
          fields: [
            { id: "r1", name: "Condenser coils cleaned", type: "checkbox", required: true },
            { id: "r2", name: "Door seals intact", type: "checkbox", required: true },
            { id: "r3", name: "Drain lines clear", type: "checkbox", required: true },
            { id: "r4", name: "Temperature logs reviewed", type: "checkbox", required: true },
          ]
        }
      ]
    }
  },
  {
    title: "Retail POS System Maintenance",
    description: "Monthly maintenance for point-of-sale systems and payment terminals.",
    template_type: "maintenance",
    category_slug: "equipment-maintenance",
    industry_slug: "retail",
    content: {
      sections: [
        {
          id: "hardware",
          name: "Hardware Check",
          fields: [
            { id: "h1", name: "Screen cleaned and responsive", type: "checkbox", required: true },
            { id: "h2", name: "Barcode scanner functional", type: "checkbox", required: true },
            { id: "h3", name: "Receipt printer paper stocked", type: "checkbox", required: true },
            { id: "h4", name: "Cash drawer operating smoothly", type: "checkbox", required: true },
          ]
        },
        {
          id: "software",
          name: "Software & Connectivity",
          fields: [
            { id: "s1", name: "Software up to date", type: "checkbox", required: true },
            { id: "s2", name: "Network connectivity stable", type: "checkbox", required: true },
            { id: "s3", name: "Payment terminal processing test transaction", type: "checkbox", required: true },
          ]
        }
      ]
    }
  },

  // TRAINING PROGRAMS
  {
    title: "Food Handler Certification Training",
    description: "Complete training program for food handler certification covering food safety, hygiene, and regulations.",
    template_type: "training",
    category_slug: "staff-training",
    industry_slug: "hospitality",
    content: {
      sections: [
        {
          id: "module1",
          name: "Module 1: Food Safety Basics",
          fields: [
            { id: "m1a", name: "Completed video: Introduction to Food Safety", type: "checkbox", required: true },
            { id: "m1b", name: "Read: Foodborne Illness Prevention", type: "checkbox", required: true },
            { id: "m1c", name: "Quiz passed (80% minimum)", type: "checkbox", required: true },
          ]
        },
        {
          id: "module2",
          name: "Module 2: Personal Hygiene",
          fields: [
            { id: "m2a", name: "Handwashing technique demonstrated", type: "checkbox", required: true },
            { id: "m2b", name: "Uniform and grooming standards reviewed", type: "checkbox", required: true },
            { id: "m2c", name: "Illness reporting procedure understood", type: "checkbox", required: true },
          ]
        },
        {
          id: "module3",
          name: "Module 3: Temperature Control",
          fields: [
            { id: "m3a", name: "Danger zone temperatures memorized", type: "checkbox", required: true },
            { id: "m3b", name: "Thermometer use demonstrated", type: "checkbox", required: true },
            { id: "m3c", name: "Cooling/reheating procedures understood", type: "checkbox", required: true },
          ]
        },
        {
          id: "certification",
          name: "Certification",
          fields: [
            { id: "cert1", name: "Final exam passed", type: "checkbox", required: true },
            { id: "cert2", name: "Certificate issued", type: "checkbox", required: true },
            { id: "cert3", name: "Expiration date noted", type: "text", required: true },
          ]
        }
      ]
    }
  },
  {
    title: "Customer Service Excellence Training",
    description: "Training program to develop outstanding customer service skills for front-line staff.",
    template_type: "training",
    category_slug: "customer-service",
    industry_slug: null,
    content: {
      sections: [
        {
          id: "fundamentals",
          name: "Service Fundamentals",
          fields: [
            { id: "f1", name: "Company service standards reviewed", type: "checkbox", required: true },
            { id: "f2", name: "Greeting and acknowledgment practice", type: "checkbox", required: true },
            { id: "f3", name: "Active listening techniques learned", type: "checkbox", required: true },
          ]
        },
        {
          id: "difficult",
          name: "Handling Difficult Situations",
          fields: [
            { id: "d1", name: "De-escalation techniques reviewed", type: "checkbox", required: true },
            { id: "d2", name: "Role-play scenarios completed", type: "checkbox", required: true },
            { id: "d3", name: "Escalation procedures understood", type: "checkbox", required: true },
          ]
        },
        {
          id: "assessment",
          name: "Assessment",
          fields: [
            { id: "a1", name: "Written assessment passed", type: "checkbox", required: true },
            { id: "a2", name: "Practical observation completed", type: "checkbox", required: true },
            { id: "a3", name: "Manager sign-off", type: "checkbox", required: true },
          ]
        }
      ]
    }
  },
  {
    title: "Workplace Safety Training",
    description: "Essential safety training for all employees covering emergency procedures, hazard recognition, and injury prevention.",
    template_type: "training",
    category_slug: "safety-compliance",
    industry_slug: null,
    content: {
      sections: [
        {
          id: "emergency",
          name: "Emergency Procedures",
          fields: [
            { id: "e1", name: "Fire evacuation route known", type: "checkbox", required: true },
            { id: "e2", name: "Fire extinguisher locations identified", type: "checkbox", required: true },
            { id: "e3", name: "Emergency contact numbers known", type: "checkbox", required: true },
            { id: "e4", name: "First aid kit location known", type: "checkbox", required: true },
          ]
        },
        {
          id: "hazards",
          name: "Hazard Recognition",
          fields: [
            { id: "h1", name: "Slip, trip, fall hazards reviewed", type: "checkbox", required: true },
            { id: "h2", name: "Proper lifting techniques demonstrated", type: "checkbox", required: true },
            { id: "h3", name: "PPE requirements understood", type: "checkbox", required: true },
          ]
        },
        {
          id: "reporting",
          name: "Incident Reporting",
          fields: [
            { id: "r1", name: "Incident reporting procedure reviewed", type: "checkbox", required: true },
            { id: "r2", name: "Near-miss reporting importance understood", type: "checkbox", required: true },
            { id: "r3", name: "Training completion documented", type: "checkbox", required: true },
          ]
        }
      ]
    }
  }
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get categories
    const { data: categories } = await supabase
      .from("marketplace_categories")
      .select("id, slug");

    // Get industries
    const { data: industries } = await supabase
      .from("industries")
      .select("id, slug");

    const categoryMap = new Map(categories?.map(c => [c.slug, c.id]) || []);
    const industryMap = new Map(industries?.map(i => [i.slug, i.id]) || []);

    // Check if templates already exist
    const { count } = await supabase
      .from("marketplace_templates")
      .select("*", { count: "exact", head: true })
      .eq("is_ai_generated", true);

    if (count && count > 0) {
      return new Response(
        JSON.stringify({ message: `Marketplace already has ${count} AI-generated templates`, skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert templates
    const templatesWithIds = starterTemplates.map((template, index) => {
      const slug = template.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + '-' + Date.now() + '-' + index;

      return {
        title: template.title,
        description: template.description,
        template_type: template.template_type,
        category_id: template.category_slug ? categoryMap.get(template.category_slug) || null : null,
        industry_id: template.industry_slug ? industryMap.get(template.industry_slug) || null : null,
        author_id: "00000000-0000-0000-0000-000000000000", // System user
        author_name: "DashSpect Team",
        author_company_name: "DashSpect",
        content: template.content,
        is_published: true,
        is_featured: index < 4, // First 4 are featured
        is_ai_generated: true,
        slug,
        published_at: new Date().toISOString(),
        download_count: Math.floor(Math.random() * 100) + 10, // Random initial downloads
      };
    });

    const { data: inserted, error } = await supabase
      .from("marketplace_templates")
      .insert(templatesWithIds)
      .select();

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        message: `Successfully seeded ${inserted?.length || 0} marketplace templates`,
        templates: inserted?.map(t => t.title)
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error seeding templates:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
