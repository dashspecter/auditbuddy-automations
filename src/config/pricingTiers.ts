import { Building2, Briefcase, Crown } from 'lucide-react';

export type PricingTier = 'starter' | 'professional' | 'enterprise';

export interface TierConfig {
  id: PricingTier;
  name: string;
  description: string;
  price: number;
  billingPeriod: 'month' | 'year';
  icon: any;
  color: string;
  features: string[];
  allowedModules: string[];
  maxUsers?: number;
  maxLocations?: number;
}

export const PRICING_TIERS: Record<PricingTier, TierConfig> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small teams getting started',
    price: 49,
    billingPeriod: 'month',
    icon: Building2,
    color: 'hsl(var(--primary))',
    features: [
      'Up to 5 users',
      'Up to 3 locations',
      'Location audits',
      'Basic reports',
      'Email support',
    ],
    allowedModules: ['location_audits', 'reports', 'workforce'],
    maxUsers: 5,
    maxLocations: 3,
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'For growing businesses with advanced needs',
    price: 149,
    billingPeriod: 'month',
    icon: Briefcase,
    color: 'hsl(var(--chart-2))',
    features: [
      'Up to 25 users',
      'Unlimited locations',
      'All Starter features',
      'Staff performance tracking',
      'Equipment management',
      'Notifications system',
      'Advanced analytics',
      'Inventory management',
      'Document management',
      'Priority support',
    ],
    allowedModules: [
      'location_audits',
      'staff_performance',
      'equipment_management',
      'notifications',
      'reports',
      'workforce',
      'documents',
      'inventory',
      'insights',
      'integrations',
    ],
    maxUsers: 25,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations with custom requirements',
    price: 499,
    billingPeriod: 'month',
    icon: Crown,
    color: 'hsl(var(--chart-3))',
    features: [
      'Unlimited users',
      'Unlimited locations',
      'All Professional features',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
      'Custom training',
      'White-label options',
    ],
    allowedModules: [
      'location_audits',
      'staff_performance',
      'equipment_management',
      'notifications',
      'reports',
      'workforce',
      'documents',
      'inventory',
      'insights',
      'integrations',
    ],
  },
};

export const getAvailableModulesForTier = (tier: PricingTier): string[] => {
  return PRICING_TIERS[tier].allowedModules;
};

export const canAccessModule = (tier: PricingTier, moduleName: string): boolean => {
  return PRICING_TIERS[tier].allowedModules.includes(moduleName);
};
