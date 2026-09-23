export type StudioRole = "owner" | "staff";
export type CustomerStatus = "new" | "reviewing" | "contacted" | "done";
export type CustomerSource = "funnel" | "manual";
/**
 * HANDOVER-28 §1.1 — `waived` means a gift code covered the assessment.
 * The column's CHECK constraint allows all three; this type was missing the
 * third, so every `waived` row was a type error waiting to be an undefined
 * label.
 */
export type PaymentStatus = "pending" | "verified" | "waived";
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
      /** HANDOVER-35 — the thirteen city pages and their editorial. */
      area_pages: {
        Row: {
          slug: string;
          city: string;
          province: string | null;
          latitude: number;
          longitude: number;
          title: string;
          h1: string;
          meta_description: string;
          status: string;
          sort_order: number;
          zone_slug: string | null;
          updated_at: string;
        };
        Insert: {
          slug: string;
          city: string;
          latitude: number;
          longitude: number;
          title: string;
          h1: string;
          meta_description: string;
          status?: string;
        };
        Update: {
          title?: string;
          h1?: string;
          meta_description?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      /**
       * Every reading ever taken. Append-only: the history is what turns a
       * single-day claim like "Sialkot is usually highest" into something
       * checkable, which is exactly what Part C asks for.
       */
      air_quality_readings: {
        Row: {
          id: string;
          slug: string;
          observed_at: string;
          pm2_5: number | null;
          pm10: number | null;
          no2: number | null;
          so2: number | null;
          o3: number | null;
          co: number | null;
          epa_index: number | null;
          us_aqi: number | null;
          uv_index: number | null;
          temp_c: number | null;
          humidity: number | null;
          condition_text: string | null;
          source: string | null;
          fetched_at: string;
        };
        Insert: {
          slug: string;
          observed_at: string;
          pm2_5?: number | null;
          pm10?: number | null;
          no2?: number | null;
          so2?: number | null;
          o3?: number | null;
          co?: number | null;
          epa_index?: number | null;
          us_aqi?: number | null;
          uv_index?: number | null;
          temp_c?: number | null;
          humidity?: number | null;
          condition_text?: string | null;
          source?: string | null;
          fetched_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      /**
       * One row per /api/cron/air-quality invocation.
       *
       * Hand-written, like the rest of the air-quality block. Do NOT
       * regenerate this file wholesale — a previous regeneration destroyed
       * the hand-written unions elsewhere in it.
       */
      air_quality_cron_runs: {
        Row: {
          id: number;
          ran_at: string;
          ok: boolean;
          refreshed: number;
          failed: number;
          detail: unknown;
          trigger: string;
        };
        Insert: {
          ok: boolean;
          refreshed?: number;
          failed?: number;
          detail?: unknown;
          trigger?: string;
        };
        Update: {
          ok?: boolean;
          refreshed?: number;
          failed?: number;
          detail?: unknown;
          trigger?: string;
        };
        Relationships: [];
      };
      /** One row per city: what the page renders, with band and staleness. */
      air_quality_latest: {
        Row: {
          slug: string;
          observed_at: string;
          pm2_5: number | null;
          pm10: number | null;
          epa_index: number | null;
          us_aqi: number | null;
          uv_index: number | null;
          temp_c: number | null;
          humidity: number | null;
          condition_text: string | null;
          source: string | null;
          fetched_at: string;
          band: string;
          is_stale: boolean;
        };
        Insert: {
          slug: string;
          observed_at: string;
          band: string;
          is_stale?: boolean;
          [key: string]: unknown;
        };
        Update: {
          band?: string;
          is_stale?: boolean;
          [key: string]: unknown;
        };
        Relationships: [];
      };
      /** Three days per city. Hourly data is deliberately never stored. */
      air_quality_forecast: {
        Row: {
          slug: string;
          forecast_date: string;
          max_temp_c: number | null;
          min_temp_c: number | null;
          avg_humidity: number | null;
          uv_index: number | null;
          epa_index: number | null;
          pm2_5: number | null;
          condition_text: string | null;
          fetched_at: string;
        };
        Insert: {
          slug: string;
          forecast_date: string;
          [key: string]: unknown;
        };
        Update: {
          [key: string]: unknown;
        };
        Relationships: [];
      };
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
          batch_label: string | null;
          recipient: string | null;
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
          batch_label?: string | null;
          recipient?: string | null;
        };
        Update: {
          kind?: string;
          grants_plan?: string;
          discount_pct?: number;
          max_uses?: number;
          expires_at?: string;
          active?: boolean;
          note?: string | null;
          batch_label?: string | null;
          recipient?: string | null;
        };
        Relationships: [];
      };
      pricing_settings: {
        Row: {
          id: string;
          member_discount_pct: number;
          updated_by: string | null;
          updated_at: string;
          gift_codes_per_month: number | null;
          gift_expiry_days: number;
          gift_programme_enabled: boolean | null;
          gift_default_plan: string | null;
        };
        Insert: {
          id?: string;
          member_discount_pct?: number;
          updated_by?: string | null;
          updated_at?: string;
          gift_codes_per_month?: number | null;
          gift_expiry_days?: number;
          gift_programme_enabled?: boolean | null;
          gift_default_plan?: string | null;
        };
        Update: {
          member_discount_pct?: number;
          updated_by?: string | null;
          updated_at?: string;
          gift_codes_per_month?: number | null;
          gift_expiry_days?: number;
          gift_programme_enabled?: boolean | null;
          gift_default_plan?: string | null;
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
      /**
       * HANDOVER-21 / HANDOVER-22 §5b — what each plan actually includes.
       *
       * Every photo limit, support duration and video-call flag on the site
       * is supposed to come from here rather than being typed into a
       * component. The comparison matrix is the first consumer; the photo
       * step is the next.
       *
       * HANDOVER-27 §1.1 widened this: `tagline`, `sort_order`,
       * `available_until` and `active` are new. `active = false` RETIRES a
       * plan without deleting it — `clarity` is retired that way because
       * historical leads carry `selected_plan = 'clarity'` and must still
       * resolve to a label. Never delete a row here.
       */
      plan_settings: {
        Row: {
          plan_key: string;
          label: string;
          tagline: string | null;
          sort_order: number;
          photos_required: number;
          photos_max: number;
          includes_video_call: boolean;
          video_minutes: number | null;
          includes_whatsapp: boolean;
          support_days: number | null;
          expert_review: boolean;
          /**
           * When a limited-time plan stops being offered. Null means no end
           * date. Set to 2026-09-30T18:59:59Z (23:59:59 PKT) for `free`.
           * Editing this one value opens or closes the offer with no deploy.
           */
          available_until: string | null;
          active: boolean;
          updated_at: string;
        };
        Insert: {
          plan_key: string;
          label: string;
          tagline?: string | null;
          sort_order?: number;
          photos_required?: number;
          photos_max?: number;
          includes_video_call?: boolean;
          video_minutes?: number | null;
          includes_whatsapp?: boolean;
          support_days?: number | null;
          expert_review?: boolean;
          available_until?: string | null;
          active?: boolean;
          updated_at?: string;
        };
        Update: {
          plan_key?: string;
          label?: string;
          tagline?: string | null;
          sort_order?: number;
          photos_required?: number;
          photos_max?: number;
          includes_video_call?: boolean;
          video_minutes?: number | null;
          includes_whatsapp?: boolean;
          support_days?: number | null;
          expert_review?: boolean;
          available_until?: string | null;
          active?: boolean;
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
          /**
           * @deprecated HANDOVER-27 §1.2 — STALE. Do not read these.
           *
           * Prices moved to `plan_prices`, one row per region per plan,
           * because a column per plan meant retiring or adding a plan
           * needed a schema migration. These three columns still exist and
           * still hold the OLD numbers (2,000 / 3,500), so anything reading
           * them now renders a price that is not for sale. Read
           * `plans_public` via lib/plans/plansPublic.ts instead.
           *
           * A follow-up migration drops them once nothing references them.
           */
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
      /** One price per region per plan. Replaces pricing_regions.price_*. */
      plan_prices: {
        Row: {
          region_code: string;
          plan_key: string;
          price: number;
          updated_at: string;
        };
        Insert: {
          region_code: string;
          plan_key: string;
          price: number;
          updated_at?: string;
        };
        Update: {
          region_code?: string;
          plan_key?: string;
          price?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      /** Ordered feature bullets. The marketing copy lives here, not in TSX. */
      plan_features: {
        Row: {
          id: string;
          plan_key: string;
          label: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          plan_key: string;
          label: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          plan_key?: string;
          label?: string;
          sort_order?: number;
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
          /** HANDOVER-22 §8 — up to 3 slugs, chosen in the studio. Never null. */
          related_slugs: string[];
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
          related_slugs?: string[];
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
          related_slugs?: string[];
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
       * HANDOVER-35 — one row per city with its zone, latest reading,
       * three-day forecast, band advice and PUBLISHED siblings pre-joined.
       *
       * Read through lib/airQuality/areaPages.ts rather than querying
       * directly: the jsonb columns arrive loosely typed and every numeric
       * crosses PostgREST as a string, so the mapping belongs in one place.
       */
      area_page_data: {
        Row: {
          slug: string;
          city: string;
          province: string | null;
          latitude: number | string;
          longitude: number | string;
          timezone: string | null;
          title: string;
          h1: string;
          meta_description: string;
          target_keyword: string | null;
          intro_markdown: string | null;
          city_markdown: string | null;
          seasonal_markdown: string | null;
          water_note: string | null;
          related_slugs: string[] | null;
          status: string;
          sort_order: number;
          covers: string | null;
          population_rank: number | null;
          zone_slug: string | null;
          zone_name: string | null;
          zone_summary: string | null;
          zone_guidance: string | null;
          dominant_factor: string | null;
          /** Null until the cron has succeeded once for this city. */
          latest: Record<string, unknown> | null;
          forecast: Record<string, unknown>[] | null;
          advice: Record<string, unknown> | null;
          zone_siblings: Record<string, unknown>[] | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      /**
       * HOTFIX-29 §2.3 — one row per code with a computed `state`.
       *
       * `state` is `available` | `redeemed` | `expired` | `deactivated`,
       * derived in the view rather than in the app, so the studio list and
       * any future report cannot disagree about what a code's state is.
       */
      gift_codes_admin: {
        Row: {
          code: string;
          kind: string;
          batch_label: string | null;
          recipient: string | null;
          grants_plan: string;
          discount_pct: number;
          uses_count: number;
          max_uses: number;
          expires_at: string;
          created_at: string;
          note: string | null;
          issued_by: string | null;
          state: string;
          redeemed_by_lead: string | null;
          redeemed_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      /**
       * HOTFIX-29 §2.3 — one row per batch, with `redemption_pct`.
       *
       * This is the number that answers the only question worth tracking
       * codes for: did that collaboration actually bring anyone in.
       */
      gift_batches_admin: {
        Row: {
          batch_label: string | null;
          issued_on: string | null;
          codes: number;
          redeemed: number;
          available: number;
          recipient: string | null;
          redemption_pct: number | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      /**
       * HANDOVER-27 §1.2 — everything a pricing surface needs, per region.
       *
       * Joins `plan_settings`, `plan_prices` and `plan_features` and filters
       * to `active` plans, so a retired plan never reaches a visitor. Read
       * it through lib/plans/plansPublic.ts rather than querying directly.
       *
       * ⚠️ Because it filters to active plans, this view CANNOT resolve a
       * historical lead carrying `selected_plan = 'clarity'`. That path
       * reads `plan_settings` and `plan_prices` directly — see
       * `getPlanByKey`.
       */
      plans_public: {
        Row: {
          region_code: string;
          plan_key: string;
          label: string;
          tagline: string | null;
          sort_order: number;
          photos_required: number;
          photos_max: number;
          includes_video_call: boolean;
          video_minutes: number | null;
          includes_whatsapp: boolean;
          support_days: number | null;
          expert_review: boolean;
          available_until: string | null;
          /** Computed: false once `available_until` has passed. */
          currently_offered: boolean;
          currency: string;
          symbol: string;
          price: number;
          /** JSON array of bullet strings, already ordered. */
          features: string[];
        };
        Relationships: [];
      };
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
        /**
         * `p_attempt_key` selects the THREE-argument overload, which is the
         * one to use: it rate-limits (8 failures per caller per 15 minutes,
         * logged to `gift_code_attempts`) and can return `already_gifted`
         * and `plan_unavailable`. PostgREST picks the overload by argument
         * NAMES, so omitting this key silently falls back to the weaker
         * two-argument version.
         */
        Args: {
          p_code: string;
          p_person_key: string;
          p_attempt_key?: string;
        };
        Returns: {
          valid: boolean;
          reason: string;
          grants_plan: string | null;
          discount_pct: number | null;
        }[];
      };
      /**
       * HOTFIX-29 §2.2 — generates a batch of codes in one call.
       *
       * Generating one code and generating fifty are the same call. Null
       * `p_grants_plan` / `p_expires_days` fall back to
       * `pricing_settings.gift_default_plan` / `gift_expiry_days`.
       *
       * The function itself validates only `p_count` (1–500). The gift
       * toggle, the monthly cap and the retired-plan check are TRIGGERS on
       * `gift_codes`, so they raise during the insert rather than being
       * returned — catch them by message, see lib/gifts/issueBatch.ts.
       */
      issue_gift_codes: {
        Args: {
          p_count: number;
          p_batch_label: string;
          p_kind?: string;
          p_discount_pct?: number;
          p_grants_plan?: string | null;
          p_expires_days?: number | null;
          p_recipient?: string | null;
          p_note?: string | null;
          p_issued_by?: string | null;
        };
        Returns: { code: string; expires_at: string }[];
      };
      /** Deactivates a whole batch. Leaves already-redeemed codes alone. */
      deactivate_gift_batch: {
        Args: { p_batch_label: string };
        Returns: number;
      };
      /** `GR-XXXXX-XXXXX`, from a 32-character alphabet with no O/0/I/1. */
      generate_gift_code: {
        Args: Record<string, never>;
        Returns: string;
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
      /**
       * HANDOVER note — hand-written, like the air-quality block above. Do
       * NOT regenerate this file wholesale; a previous regeneration
       * destroyed the hand-written unions in it.
       */
      blog_publish_set: {
        Args: { p_slug: string };
        Returns: {
          slug: string;
          title: string;
          status: string;
          is_root: boolean;
        }[];
      };
      publish_blog_posts: {
        Args: { p_slugs: string[] };
        Returns: {
          slug: string;
          status: string;
          published_at: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
