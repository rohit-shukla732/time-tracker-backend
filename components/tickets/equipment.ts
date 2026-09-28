import { Laptop, Monitor, Keyboard, Mouse, Headset, Armchair, Box } from 'lucide-react';
import type { EquipmentChange, EquipmentSubject, EquipmentSummary } from '@/types';

export const CATEGORY_ICONS: Record<string, typeof Laptop> = {
  LAPTOP: Laptop,
  MONITOR: Monitor,
  KEYBOARD: Keyboard,
  MOUSE: Mouse,
  HEADSET: Headset,
  SEAT: Armchair,
  OTHER: Box,
};

export function buildEquipmentSummary(changes: EquipmentChange[]): EquipmentSummary {
  const acc: EquipmentSummary = {};
  for (const c of changes) {
    if (!acc[c.category]) acc[c.category] = { total: 0, byAction: {} };
    acc[c.category].total += 1;
    acc[c.category].byAction[c.action] = (acc[c.category].byAction[c.action] ?? 0) + 1;
  }
  return acc;
}

export interface EquipmentData {
  loading: boolean;
  /** Everyone this ticket is about (joiner cards / reports). Empty for support. */
  subjects: EquipmentSubject[];
  /** The subject currently being viewed, if any. */
  subject: EquipmentSubject | null;
  changes: EquipmentChange[];
  /** Which subject is selected, when there is more than one. */
  selectedId?: string | null;
  /** Switch the active subject (refetches its history). */
  selectSubject?: (id: string) => void;
}