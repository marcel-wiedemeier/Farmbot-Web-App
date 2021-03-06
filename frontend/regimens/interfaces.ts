import { ResourceColor } from "../interfaces";
import { Week } from "./bulk_scheduler/interfaces";
import { AuthState } from "../auth/interfaces";
import { BotState, ShouldDisplay } from "../devices/interfaces";
import { TaggedRegimen, TaggedSequence } from "farmbot";
import { ResourceIndex, UUID, VariableNameSet } from "../resources/interfaces";

export interface CalendarRow {
  day: string;
  items: RegimenItemCalendarRow[];
}

export interface Props {
  dispatch: Function;
  sequences: TaggedSequence[];
  variableData: VariableNameSet;
  auth: AuthState | undefined;
  bot: BotState;
  current: TaggedRegimen | undefined;
  regimens: TaggedRegimen[];
  resources: ResourceIndex;
  selectedSequence: TaggedSequence | undefined;
  dailyOffsetMs: number;
  weeks: Week[];
  calendar: CalendarRow[];
  regimenUsageStats: Record<UUID, boolean | undefined>;
  shouldDisplay: ShouldDisplay;
  schedulerOpen: boolean;
}

export interface RegimenItemCalendarRow {
  regimen: TaggedRegimen;
  item: RegimenItem;
  name: string;
  hhmm: string;
  color: string;
  /** Numeric field that can be used for sorting purposes. */
  sortKey: number;
  day: number;
  dispatch: Function;
  /** Variable label. */
  variable: string | undefined;
}

/** Used by UI widgets that modify a regimen */
export interface RegimenProps {
  regimen: TaggedRegimen;
  dispatch: Function;
}

/** A list of "Sequence" scheduled after a starting point (epoch). */
export interface Regimen {
  id?: number;
  /** Friendly identifier for humans to easily identify regimens. */
  name: string;
  color: ResourceColor;
  regimen_items: RegimenItem[];
}

export interface RegimenListItemProps {
  length: number;
  regimen: TaggedRegimen;
  dispatch: Function;
  inUse: boolean;
  index: number;
}

/** Individual step that a regimen will execute at a point in time. */
export interface RegimenItem {
  id?: number;
  sequence_id: number;
  regimen_id?: number;
  /** Time (in milliseconds) to wait before executing the sequence */
  time_offset: number;
}

export interface AddRegimenProps {
  dispatch: Function;
  className?: string;
  children?: React.ReactNode;
  length: number;
}

export interface RegimensListProps {
  dispatch: Function;
  regimens: TaggedRegimen[];
  regimen: TaggedRegimen | undefined;
  usageStats: Record<UUID, boolean | undefined>;
}

export interface RegimensListState {
  searchTerm: string;
}
