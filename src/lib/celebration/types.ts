import type { GivingInfo } from "./giving";

// Shapes for the Celebration of Life feature. The public types mirror the
// JSON returned by the get_public_event / get_contribution_by_token
// database functions (supabase/migrations/0001_initial_schema.sql),
// which deliberately never include contact details.

export type PublicMemorial = {
  photo_url: string | null;
  biography: string | null;
  favorite_quote: string | null;
  gallery_urls: string[];
};

export type PublicEventInfo = {
  id: string;
  slug: string;
  event_name: string;
  person_name: string;
  birth_date_text: string | null;
  passing_date_text: string | null;
  photo_url: string | null;
  /** Present once migration 0002 has been run. */
  background_image_url?: string | null;
  /** Monetary gift options (migration 0003); null when off or not set up. */
  giving?: GivingInfo | null;
  event_date: string | null;
  service_info: string | null;
  repast_time_text: string | null;
  repast_location_name: string | null;
  repast_address: string | null;
  welcome_message: string | null;
  signup_deadline: string | null;
  is_published: boolean;
  memorial: PublicMemorial | null;
};

export type PublicCategory = {
  id: string;
  name: string;
  short_name: string;
  sort_order: number;
};

export type PublicItem = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  quantity_needed: number;
  quantity_claimed: number;
  unit: string;
  is_priority: boolean;
  manually_covered: boolean;
  sort_order: number;
  /** "Tasha B." style names — empty unless the family turned that on. */
  claimed_by: string[];
};

export type PublicEvent = {
  event: PublicEventInfo;
  settings: {
    show_contributor_names: boolean;
    allow_suggestions: boolean;
    show_memorial_section: boolean;
  };
  signups_open: boolean;
  deadline_passed: boolean;
  categories: PublicCategory[];
  items: PublicItem[];
};

export type ClaimResult = {
  contribution_id: string;
  token: string;
  item_name: string;
  quantity: number;
  unit: string;
};

export type ManagedEventInfo = {
  slug: string;
  person_name: string;
  event_name: string;
  event_date: string | null;
  repast_time_text: string | null;
  repast_location_name: string | null;
  repast_address: string | null;
};

export type ManagedContribution =
  | {
      kind: "contribution";
      status: ContributionStatus;
      contributor_name: string;
      item_name: string;
      unit: string;
      quantity: number;
      amount_detail: string | null;
      note: string | null;
      max_quantity: number;
      signups_open: boolean;
      created_at: string;
      event: ManagedEventInfo;
    }
  | {
      kind: "suggestion";
      status: SuggestionStatus;
      contributor_name: string;
      item_name: string;
      amount_detail: string | null;
      note: string | null;
      created_at: string;
      event: ManagedEventInfo;
    };

// ---------------------------------------------------------------------------
// Admin-side rows (read through RLS as an approved admin)
// ---------------------------------------------------------------------------

export type ContributionStatus = "confirmed" | "received" | "cancelled";
export type SuggestionStatus = "pending" | "approved" | "declined" | "withdrawn";

export type MemorialEvent = {
  id: string;
  slug: string;
  event_name: string;
  person_name: string;
  birth_date_text: string | null;
  passing_date_text: string | null;
  photo_url: string | null;
  /** Present once migration 0002 has been run. */
  background_image_url?: string | null;
  /** Present once migration 0003 has been run. */
  giving_enabled?: boolean;
  giving_title?: string | null;
  giving_message?: string | null;
  giving_methods?: unknown;
  event_date: string | null;
  service_info: string | null;
  repast_time_text: string | null;
  repast_location_name: string | null;
  repast_address: string | null;
  welcome_message: string | null;
  signup_deadline: string | null;
  timezone: string;
  memorial_photo_url: string | null;
  biography: string | null;
  favorite_quote: string | null;
  gallery_urls: string[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type EventSettings = {
  event_id: string;
  show_contributor_names: boolean;
  allow_suggestions: boolean;
  show_memorial_section: boolean;
  accepting_signups: boolean;
};

export type FoodCategory = {
  id: string;
  event_id: string;
  name: string;
  short_name: string;
  sort_order: number;
};

export type FoodItem = {
  id: string;
  event_id: string;
  category_id: string;
  name: string;
  description: string | null;
  quantity_needed: number;
  unit: string;
  is_priority: boolean;
  is_hidden: boolean;
  manually_covered: boolean;
  sort_order: number;
};

export type Contribution = {
  id: string;
  event_id: string;
  food_item_id: string;
  contributor_name: string;
  phone: string | null;
  email: string | null;
  quantity: number;
  amount_detail: string | null;
  note: string | null;
  status: ContributionStatus;
  source: "public" | "admin" | "suggestion";
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  received_at: string | null;
};

export type SuggestedItem = {
  id: string;
  event_id: string;
  contributor_name: string;
  phone: string | null;
  email: string | null;
  item_name: string;
  quantity_text: string | null;
  note: string | null;
  status: SuggestionStatus;
  contribution_id: string | null;
  reviewed_at: string | null;
  created_at: string;
};
