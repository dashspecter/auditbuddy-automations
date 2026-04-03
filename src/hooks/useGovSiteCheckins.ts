import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/hooks/useCompany';
import { haversineDistanceM, getCurrentPositionAsync } from '@/lib/geofence';
import { toast } from 'sonner';

export interface GovSiteCheckin {
  id: string;
  company_id: string;
  employee_id: string;
  project_id: string | null;
  location_id: string;
  work_order_id: string | null;
  check_in_at: string;
  check_out_at: string | null;
  checkin_lat: number | null;
  checkin_lon: number | null;
  checkout_lat: number | null;
  checkout_lon: number | null;
  geofence_validated: boolean | null;
  geofence_distance_m: number | null;
  notes: string | null;
  created_at: string;
  // Joined
  location?: { id: string; name: string; geofence_radius_meters: number | null; geofence_lat: number | null; geofence_lon: number | null } | null;
  project?: { id: string; title: string; project_number: string | null } | null;
  work_order?: { id: string; title: string; wo_number: number } | null;
  employee?: { id: string; full_name: string | null; email: string | null } | null;
}

export interface GeofenceResult {
  outsideGeofence: boolean;
  distanceM: number;
  radiusM: number;
}

/** Checkins for a specific employee, most recent first. */
export function useMyGovSiteCheckins(employeeId: string | undefined) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['gov-site-checkins', 'employee', employeeId],
    queryFn: async () => {
      if (!employeeId || !company?.id) return [];
      const { data, error } = await supabase
        .from('gov_site_checkins' as any)
        .select(`
          *,
          location:locations(id, name, geofence_radius_meters, geofence_lat, geofence_lon),
          project:gov_projects(id, title, project_number),
          work_order:cmms_work_orders(id, title, wo_number)
        `)
        .eq('company_id', company.id)
        .eq('employee_id', employeeId)
        .order('check_in_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as unknown as GovSiteCheckin[];
    },
    enabled: !!employeeId && !!company?.id,
    staleTime: 60_000,
  });
}

/** All checkins for a project — for the manager-side ProjectDetail page. */
export function useGovSiteCheckinsByProject(projectId: string | undefined) {
  const { data: company } = useCompany();

  return useQuery({
    queryKey: ['gov-site-checkins', 'project', projectId],
    queryFn: async () => {
      if (!projectId || !company?.id) return [];
      const { data, error } = await supabase
        .from('gov_site_checkins' as any)
        .select(`
          *,
          location:locations(id, name),
          project:gov_projects(id, title, project_number),
          work_order:cmms_work_orders(id, title, wo_number),
          employee:employees(id, full_name, email)
        `)
        .eq('company_id', company.id)
        .eq('project_id', projectId)
        .order('check_in_at', { ascending: false });
      if (error) throw error;
      return data as unknown as GovSiteCheckin[];
    },
    enabled: !!projectId && !!company?.id,
  });
}

export interface CheckinPayload {
  employee_id: string;
  location_id: string;
  project_id?: string;
  work_order_id?: string;
  notes?: string;
  /** Pre-fetched location for geofence check. Pass to avoid a second query. */
  locationMeta?: {
    geofence_radius_meters: number | null;
    geofence_lat: number | null;
    geofence_lon: number | null;
  };
}

/**
 * Checks in a worker to a site.
 * - If the location has a geofence configured, tries to get GPS position.
 * - On GPS failure (denied/timeout): inserts with null coords, geofence_validated = null.
 * - Returns `{ outsideGeofence: true, distanceM, radiusM }` if outside — caller decides
 *   whether to block or confirm. Use `confirmCheckin` mutation to proceed anyway.
 */
export function useGovSiteCheckin() {
  const queryClient = useQueryClient();
  const { data: company } = useCompany();

  return useMutation({
    mutationFn: async (payload: CheckinPayload & { forceCheckIn?: boolean }): Promise<
      { success: true; checkin: GovSiteCheckin } | { success: false; geofenceResult: GeofenceResult }
    > => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !company?.id) throw new Error('Not authenticated');

      const loc = payload.locationMeta;
      let checkinLat: number | null = null;
      let checkinLon: number | null = null;
      let geofenceValidated: boolean | null = null;
      let geofenceDistanceM: number | null = null;

      // Try to geolocate if this location has a geofence configured
      if (loc?.geofence_radius_meters && loc.geofence_lat && loc.geofence_lon) {
        try {
          const pos = await getCurrentPositionAsync(10_000);
          checkinLat = pos.coords.latitude;
          checkinLon = pos.coords.longitude;
          const dist = Math.round(haversineDistanceM(
            checkinLat, checkinLon,
            loc.geofence_lat, loc.geofence_lon
          ));
          geofenceDistanceM = dist;
          geofenceValidated = dist <= loc.geofence_radius_meters;

          // If outside and caller hasn't confirmed, return early so UI can warn
          if (!geofenceValidated && !payload.forceCheckIn) {
            return {
              success: false,
              geofenceResult: {
                outsideGeofence: true,
                distanceM: dist,
                radiusM: loc.geofence_radius_meters,
              },
            };
          }
        } catch {
          // GPS unavailable — insert with nulls, no geofence validation
        }
      }

      const { data, error } = await supabase
        .from('gov_site_checkins' as any)
        .insert({
          company_id: company.id,
          employee_id: payload.employee_id,
          location_id: payload.location_id,
          project_id: payload.project_id ?? null,
          work_order_id: payload.work_order_id ?? null,
          notes: payload.notes ?? null,
          checkin_lat: checkinLat,
          checkin_lon: checkinLon,
          geofence_validated: geofenceValidated,
          geofence_distance_m: geofenceDistanceM,
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, checkin: data as unknown as GovSiteCheckin };
    },
    onSuccess: (result, variables) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['gov-site-checkins', 'employee', variables.employee_id] });
        if (variables.project_id) {
          queryClient.invalidateQueries({ queryKey: ['gov-site-checkins', 'project', variables.project_id] });
        }
      }
    },
    onError: (e: Error) => toast.error('Check-in failed: ' + e.message),
  });
}

export function useGovSiteCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      checkinId,
      employeeId,
      projectId,
    }: {
      checkinId: string;
      employeeId: string;
      projectId?: string;
    }) => {
      let checkoutLat: number | null = null;
      let checkoutLon: number | null = null;

      try {
        const pos = await getCurrentPositionAsync(8_000);
        checkoutLat = pos.coords.latitude;
        checkoutLon = pos.coords.longitude;
      } catch {
        // GPS unavailable — record checkout without coords
      }

      const { error } = await supabase
        .from('gov_site_checkins' as any)
        .update({
          check_out_at: new Date().toISOString(),
          checkout_lat: checkoutLat,
          checkout_lon: checkoutLon,
        })
        .eq('id', checkinId);

      if (error) throw error;
      return { checkinId, employeeId, projectId };
    },
    onSuccess: ({ employeeId, projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['gov-site-checkins', 'employee', employeeId] });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['gov-site-checkins', 'project', projectId] });
      }
      toast.success('Checked out successfully');
    },
    onError: (e: Error) => toast.error('Check-out failed: ' + e.message),
  });
}
