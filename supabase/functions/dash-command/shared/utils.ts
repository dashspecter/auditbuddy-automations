/**
 * Shared utility functions for Dash capability modules.
 * Eliminates duplication of common helpers across capability files.
 */
import { MAX_TOOL_ROWS } from "./constants.ts";

/**
 * Cap a result set to a maximum number of rows with truncation metadata.
 */
export function cap<T>(data: T[] | null, limit = MAX_TOOL_ROWS) {
  const items = data ?? [];
  const total = items.length;
  return { items: items.slice(0, limit), total, returned: Math.min(total, limit), truncated: total > limit };
}

/**
 * Create a JSON-encoded structured event string for SSE streaming.
 */
export function makeStructuredEvent(type: string, data: any): string {
  return JSON.stringify({ type: "structured_event", event_type: type, data });
}
