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
    Views: Record<string, never>;
    Functions: {
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
