import { supabase } from "@/integrations/supabase/client";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useCallback } from "react";

type WhatsAppEventType =
  | "shift_published"
  | "shift_changed"
  | "task_assigned"
  | "task_overdue"
  | "audit_failed"
  | "corrective_action"
  | "incident"
  | "points_earned"
  | "announcement";

interface NotifyParams {
  employeeId: string;
  templateName: string;
  variables?: Record<string, string>;
  eventType: WhatsAppEventType;
  eventRefId?: string;
}

/**
 * Hook to trigger WhatsApp notifications from UI events.
 * Checks if the whatsapp_messaging module is active before sending.
 * Designed to be called from mutation onSuccess callbacks.
 */
export function useWhatsAppNotifier() {
  const { company, modules } = useCompanyContext();

  const isModuleActive = modules?.some(
    (m: any) => m.module_name === "whatsapp_messaging" && m.is_active
  );

  const notify = useCallback(
    async ({ employeeId, templateName, variables, eventType, eventRefId }: NotifyParams) => {
      if (!isModuleActive || !company?.id) return;

      try {
        const { error } = await supabase.functions.invoke("send-whatsapp", {
          body: {
            company_id: company.id,
            employee_id: employeeId,
            template_name: templateName,
            variables: variables || {},
            event_type: eventType,
            event_ref_id: eventRefId,
          },
        });

        if (error) {
          console.warn(`[WhatsApp] Failed to send ${eventType} notification:`, error.message);
        }
      } catch (err) {
        // Non-blocking: WhatsApp notification failure shouldn't break the primary action
        console.warn("[WhatsApp] Notification error:", err);
      }
    },
    [isModuleActive, company?.id]
  );

  const notifyBatch = useCallback(
    async (notifications: NotifyParams[]) => {
      if (!isModuleActive || !company?.id) return;
      // Fire all notifications concurrently, non-blocking
      await Promise.allSettled(notifications.map(notify));
    },
    [isModuleActive, company?.id, notify]
  );

  return { notify, notifyBatch, isModuleActive };
}
