export type StudioRole = "owner" | "staff";
export type CustomerStatus = "new" | "reviewing" | "contacted" | "done";
export type CustomerSource = "funnel" | "manual";
export type PaymentStatus = "pending" | "verified";
export type ReviewDecision =
  | "ready_for_report"
  | "need_more_photos"
  | "not_suitable";
export type BlogStatus = "draft" | "published" | "archived";
export type StudioNotificationType =
  | "chat_message"
  | "review_submitted"
  | "payment_verified"
  | "customer_assigned";

export type Database = {
  public: {
    Tables: {
      studio_members: {
        Row: {
          user_id: string;
          role: StudioRole;
          display_name: string;
          can_verify_payment: boolean;
          can_send_report: boolean;
          // Added by HANDOVER-6's super-admin-permissions migration (already
          // live). Distinct from `role` — an "owner" is not automatically a
          // super admin, and vice versa; the two are set independently.
          is_super_admin: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          role: StudioRole;
          display_name: string;
          can_verify_payment?: boolean;
          can_send_report?: boolean;
          is_super_admin?: boolean;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          role?: StudioRole;
          display_name?: string;
          can_verify_payment?: boolean;
          can_send_report?: boolean;
          is_super_admin?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      studio_messages: {
        Row: {
          id: string;
          user_id: string;
          author_name: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          author_name: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          author_name?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      studio_emails: {
        Row: {
          id: string;
          lead_id: string;
          sent_by: string;
          to_email: string;
          subject: string;
          body: string;
          resend_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          sent_by: string;
          to_email: string;
          subject: string;
          body: string;
          resend_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          sent_by?: string;
          to_email?: string;
          subject?: string;
          body?: string;
          resend_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      studio_reports: {
        Row: {
          id: string;
          lead_id: string;
          created_by: string;
          author_name: string;
          noticed: string;
          morning_routine: string;
          night_routine: string;
          avoid_items: string;
          extra_notes: string | null;
          // HANDOVER-16 Part 2 a/b/d. Nullable: every report sent before
          // these columns existed has none, and the PDF omits the section
          // rather than substituting today's default wording.
          start_here: string | null;
          timeline: string | null;
          good_signs: string | null;
          warning_signs: string | null;
          // HANDOVER-16 Part 7's authorship signals. The migration is live;
          // these were missing here, which is why writing them typed as
          // `never`. Only `photos_viewed` is written today — by the Part 6
          // checklist attestation.
          compose_seconds: number | null;
          keystroke_count: number | null;
          paste_count: number;
          largest_paste_len: number;
          photos_viewed: boolean;
          draft_saves: number;
          authorship_flag: string | null;
          authorship_note: string | null;
          authorship_cleared_by: string | null;
          authorship_cleared_at: string | null;
          sent_at: string | null;
          resend_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          created_by: string;
          author_name: string;
          noticed: string;
          morning_routine: string;
          night_routine: string;
          avoid_items: string;
          extra_notes?: string | null;
          start_here?: string | null;
          timeline?: string | null;
          good_signs?: string | null;
          warning_signs?: string | null;
          compose_seconds?: number | null;
          keystroke_count?: number | null;
          paste_count?: number;
          largest_paste_len?: number;
          photos_viewed?: boolean;
          draft_saves?: number;
          authorship_flag?: string | null;
          authorship_note?: string | null;
          authorship_cleared_by?: string | null;
          authorship_cleared_at?: string | null;
          sent_at?: string | null;
          resend_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          created_by?: string;
          author_name?: string;
          noticed?: string;
          morning_routine?: string;
          night_routine?: string;
          avoid_items?: string;
          extra_notes?: string | null;
          start_here?: string | null;
          timeline?: string | null;
          good_signs?: string | null;
          warning_signs?: string | null;
          compose_seconds?: number | null;
          keystroke_count?: number | null;
          paste_count?: number;
          largest_paste_len?: number;
          photos_viewed?: boolean;
          draft_saves?: number;
          authorship_flag?: string | null;
          authorship_note?: string | null;
          authorship_cleared_by?: string | null;
          authorship_cleared_at?: string | null;
          sent_at?: string | null;
          resend_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      /**
       * HANDOVER-20 Part 2 — gifted assessments.
       *
       * `uses_count` is incremented atomically by the `lead_gift_redeem`
       * trigger, never by the app. Reading it is fine; writing it from here
       * would race the trigger and could hand out a second free assessment.
       */
      gift_codes: {
        Row: {
          code: string;
          kind: string;
          issued_to_lead: string | null;
          issued_to_person: string | null;
          grants_plan: string;
          discount_pct: number;
          max_uses: number;
          uses_count: number;
          expires_at: string;
          active: boolean;
          issued_by: string | null;
          created_at: string;
          note: string | null;
        };
        Insert: {
          code: string;
          kind?: string;
          issued_to_lead?: string | null;
          issued_to_person?: string | null;
          grants_plan?: string;
          discount_pct?: number;
          max_uses?: number;
          uses_count?: number;
          expires_at?: string;
          active?: boolean;
          issued_by?: string | null;
          created_at?: string;
          note?: string | null;
        };
        Update: {
          kind?: string;
          grants_plan?: string;
          discount_pct?: number;
          max_uses?: number;
          expires_at?: string;
          active?: boolean;
          note?: string | null;
        };
        Relationships: [];
      };
      pricing_settings: {
        Row: {
          id: string;
          member_discount_pct: number;
          updated_by: string | null;
          updated_at: string;
          gift_codes_per_month: number;
          gift_expiry_days: number;
        };
        Insert: {
          id?: string;
          member_discount_pct?: number;
          updated_by?: string | null;
          updated_at?: string;
          gift_codes_per_month?: number;
          gift_expiry_days?: number;
        };
        Update: {
          member_discount_pct?: number;
          updated_by?: string | null;
          updated_at?: string;
          gift_codes_per_month?: number;
          gift_expiry_days?: number;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          session_id: string;
          full_name: string | null;
          email: string | null;
          selected_plan: string | null;
          plan_name: string | null;
          plan_price: string | null;
          answers: Record<string, unknown>;
          image_urls: string[];
          photo_paths: string[];
          photos_expire_at: string | null;
          photos_deleted_at: string | null;
          // HANDOVER-19 — who deleted the photographs and why. `expired` is
          // the automatic sweep; the rest are a person's decision.
          photos_deleted_by: string | null;
          photos_deletion_reason: string | null;
          // HANDOVER-18 §1 — soft delete. Every studio list filters on
          // deleted_at being null; the two views already do.
          deleted_at: string | null;
          deleted_by: string | null;
          deletion_reason: string | null;
          // HANDOVER-18 §2 — the client's own free-text note from the photo
          // step. RAW here. `leads_for_practitioner` serves the redacted
          // version; anything reading this column shows contact details.
          client_notes: string | null;
          // HANDOVER-20 Part 1 & 2 — all written by database triggers
          // (lead_identity_resolve, lead_supersede_previous,
          // lead_gift_redeem). The app reads these; it must not set them.
          person_key: string | null;
          submission_no: number | null;
          duplicate_reason: string | null;
          duplicate_of: string | null;
          referred_by_person: string | null;
          // The one exception: the app WRITES gift_code_used on insert, and
          // the trigger validates and redeems it (or silently drops it).
          gift_code_used: string | null;
          // HANDOVER-14's phone capture. The column shipped and is written by
          // lib/leads/insertLead.ts, but it was never added here — which is
          // why writing it typed as `never`. `phone_e164` is derived by a
          // database trigger and must never be written from the app.
          phone: string | null;
          phone_e164: string | null;
          last_seen_at: string | null;
          abandoned_at: string | null;
          status: CustomerStatus;
          notes: string | null;
          source: CustomerSource;
          payment_status: PaymentStatus;
          funnel_complete: boolean;
          funnel_step: number | null;
          assigned_to: string | null;
          report_sender_id: string | null;
          // Internal/test lead flag — HOTFIX-5. All 32 rows seeded before
          // this shipped are test data; default false so any new insert
          // that doesn't explicitly set it is treated as a real customer.
          is_test: boolean;
          test_reason: string | null;
          // HOTFIX-7 §1 — "record what was quoted": the pricing_regions.code
          // and currency the visitor actually saw/chose at submission, and
          // the regional list price for the selected plan before any member
          // discount (the existing DB trigger applies the discount from
          // this value).
          pricing_region: string | null;
          currency: string | null;
          list_price: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          full_name?: string | null;
          email?: string | null;
          selected_plan?: string | null;
          plan_name?: string | null;
          plan_price?: string | null;
          answers?: Record<string, unknown>;
          image_urls?: string[];
          photo_paths?: string[];
          photos_expire_at?: string | null;
          photos_deleted_at?: string | null;
          photos_deleted_by?: string | null;
          photos_deletion_reason?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deletion_reason?: string | null;
          client_notes?: string | null;
          person_key?: string | null;
          submission_no?: number | null;
          duplicate_reason?: string | null;
          duplicate_of?: string | null;
          referred_by_person?: string | null;
          gift_code_used?: string | null;
          phone?: string | null;
          last_seen_at?: string | null;
          abandoned_at?: string | null;
          status?: CustomerStatus;
          notes?: string | null;
          source?: CustomerSource;
          payment_status?: PaymentStatus;
          funnel_complete?: boolean;
          funnel_step?: number | null;
          assigned_to?: string | null;
          report_sender_id?: string | null;
          is_test?: boolean;
          test_reason?: string | null;
          pricing_region?: string | null;
          currency?: string | null;
          list_price?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          full_name?: string | null;
          email?: string | null;
          selected_plan?: string | null;
          plan_name?: string | null;
          plan_price?: string | null;
          answers?: Record<string, unknown>;
          image_urls?: string[];
          photo_paths?: string[];
          photos_expire_at?: string | null;
          photos_deleted_at?: string | null;
          photos_deleted_by?: string | null;
          photos_deletion_reason?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deletion_reason?: string | null;
          client_notes?: string | null;
          person_key?: string | null;
          submission_no?: number | null;
          duplicate_reason?: string | null;
          duplicate_of?: string | null;
          referred_by_person?: string | null;
          gift_code_used?: string | null;
          phone?: string | null;
          last_seen_at?: string | null;
          abandoned_at?: string | null;
          status?: CustomerStatus;
          notes?: string | null;
          source?: CustomerSource;
          payment_status?: PaymentStatus;
          funnel_complete?: boolean;
          funnel_step?: number | null;
          assigned_to?: string | null;
          report_sender_id?: string | null;
          is_test?: boolean;
          test_reason?: string | null;
          pricing_region?: string | null;
          currency?: string | null;
          list_price?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pricing_regions: {
        Row: {
          code: string;
          label: string;
          currency: string;
          symbol: string;
          price_free: number;
          price_clarity: number;
          price_transform: number;
          is_default: boolean;
          active: boolean;
          updated_at: string;
        };
        Insert: {
          code: string;
          label: string;
          currency: string;
          symbol: string;
          price_free?: number;
          price_clarity: number;
          price_transform: number;
          is_default?: boolean;
          active?: boolean;
          updated_at?: string;
        };
        Update: {
          code?: string;
          label?: string;
          currency?: string;
          symbol?: string;
          price_free?: number;
          price_clarity?: number;
          price_transform?: number;
          is_default?: boolean;
          active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      studio_notifications: {
        Row: {
          id: string;
          recipient_id: string;
          actor_id: string | null;
          type: StudioNotificationType;
          title: string;
          body: string;
          href: string;
          lead_id: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          actor_id?: string | null;
          type: StudioNotificationType;
          title: string;
          body: string;
          href: string;
          lead_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          actor_id?: string | null;
          type?: StudioNotificationType;
          title?: string;
          body?: string;
          href?: string;
          lead_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      studio_reviews: {
        Row: {
          id: string;
          lead_id: string;
          created_by: string;
          author_name: string;
          decision: ReviewDecision;
          findings: string;
          noticed: string | null;
          morning_routine: string | null;
          night_routine: string | null;
          avoid_items: string | null;
          extra_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          created_by: string;
          author_name: string;
          decision: ReviewDecision;
          findings: string;
          noticed?: string | null;
          morning_routine?: string | null;
          night_routine?: string | null;
          avoid_items?: string | null;
          extra_notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          created_by?: string;
          author_name?: string;
          decision?: ReviewDecision;
          findings?: string;
          noticed?: string | null;
          morning_routine?: string | null;
          night_routine?: string | null;
          avoid_items?: string | null;
          extra_notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      studio_blog_posts: {
        Row: {
          id: string;
          slug: string;
          title: string;
          excerpt: string | null;
          body_markdown: string;
          meta_title: string | null;
          meta_description: string | null;
          target_keyword: string | null;
          cluster: string | null;
          hero_image_url: string | null;
          reading_minutes: number | null;
          author_slug: string;
          reviewer_slug: string | null;
          reviewed_at: string | null;
          status: BlogStatus;
          published_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          excerpt?: string | null;
          body_markdown?: string;
          meta_title?: string | null;
          meta_description?: string | null;
          target_keyword?: string | null;
          cluster?: string | null;
          hero_image_url?: string | null;
          reading_minutes?: number | null;
          author_slug?: string;
          reviewer_slug?: string | null;
          reviewed_at?: string | null;
          status?: BlogStatus;
          published_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          excerpt?: string | null;
          body_markdown?: string;
          meta_title?: string | null;
          meta_description?: string | null;
          target_keyword?: string | null;
          cluster?: string | null;
          hero_image_url?: string | null;
          reading_minutes?: number | null;
          author_slug?: string;
          reviewer_slug?: string | null;
          reviewed_at?: string | null;
          status?: BlogStatus;
          published_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      /**
       * HANDOVER-18 §2 — the practitioner-safe projection of `leads`.
       *
       * Two things it does that the base table does not: `client_notes` is
       * wrapped in `private.redact_contacts()` so phone numbers and email
       * addresses become "[removed]" while clinical detail survives, and
       * `answers` has the contact keys stripped. It also already filters
       * `deleted_at is null`.
       *
       * Read-only by construction — only the columns the studio actually
       * needs are listed here.
       */
      leads_for_practitioner: {
        Row: {
          id: string;
          first_name: string | null;
          display_ref: string | null;
          assigned_to: string | null;
          status: CustomerStatus;
          payment_status: PaymentStatus;
          selected_plan: string | null;
          plan_name: string | null;
          funnel_complete: boolean | null;
          photo_paths: string[] | null;
          photos_expire_at: string | null;
          photos_deleted_at: string | null;
          answers: Record<string, unknown> | null;
          client_notes: string | null;
          created_at: string;
          updated_at: string;
          assigned_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      /**
       * HANDOVER-19 — every lead's photographs and how long they have left.
       * `photo_state` is computed in the view so the studio screen and any
       * SQL run by hand cannot disagree about what "overdue" means.
       */
      /**
       * HANDOVER-20 Part 1 — one row per person, aggregated by `person_key`.
       *
       * ⚠️ Filters `is_test = false`, so a seeded test lead has no history
       * even when it carries a person_key. Correct for production; worth
       * knowing before concluding the duplicate banner is broken.
       */
      studio_person_history: {
        Row: {
          person_key: string;
          submissions: number;
          completed: number;
          paid: number;
          first_seen: string;
          last_seen: string;
          latest_name: string | null;
          latest_phone: string | null;
          latest_email: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      studio_photo_status: {
        Row: {
          lead_id: string;
          display_ref: string;
          full_name: string | null;
          plan_name: string | null;
          status: CustomerStatus;
          is_test: boolean;
          photo_count: number;
          photo_paths: string[] | null;
          created_at: string;
          photos_expire_at: string | null;
          photos_deleted_at: string | null;
          photos_deleted_by: string | null;
          photos_deletion_reason: string | null;
          days_until_auto_delete: number | null;
          report_sent_at: string | null;
          photo_state: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Functions: {
      /**
       * HANDOVER-20 Part 2. The same function the redemption trigger
       * consults, so a message shown while typing cannot disagree with what
       * happens on submit. Verified against production: returns not_found,
       * inactive, expired, already_used and self_redemption, and normalises
       * case and surrounding whitespace itself.
       */
      check_gift_code: {
        Args: { p_code: string; p_person_key: string };
        Returns: {
          valid: boolean;
          reason: string;
          grants_plan: string | null;
          discount_pct: number | null;
        }[];
      };
      resolve_pricing_region: {
        Args: { p_country: string | null };
        Returns: {
          code: string;
          label: string;
          currency: string;
          symbol: string;
          price_free: number;
          price_clarity: number;
          price_transform: number;
          is_default: boolean;
          active: boolean;
          updated_at: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
