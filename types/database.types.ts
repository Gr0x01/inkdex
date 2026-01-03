export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_email: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_email: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_email?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      artist_analytics: {
        Row: {
          artist_id: string | null
          booking_link_clicks: number | null
          created_at: string | null
          date: string
          id: string
          image_views: number | null
          instagram_clicks: number | null
          profile_views: number | null
          search_appearances: number | null
        }
        Insert: {
          artist_id?: string | null
          booking_link_clicks?: number | null
          created_at?: string | null
          date: string
          id?: string
          image_views?: number | null
          instagram_clicks?: number | null
          profile_views?: number | null
          search_appearances?: number | null
        }
        Update: {
          artist_id?: string | null
          booking_link_clicks?: number | null
          created_at?: string | null
          date?: string
          id?: string
          image_views?: number | null
          instagram_clicks?: number | null
          profile_views?: number | null
          search_appearances?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_analytics_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_recommendations: {
        Row: {
          artist_id: string | null
          bio: string | null
          classifier_result: Json | null
          created_at: string
          follower_count: number | null
          id: string
          instagram_handle: string
          instagram_id: string | null
          status: string
          submitter_ip: string | null
          updated_at: string
        }
        Insert: {
          artist_id?: string | null
          bio?: string | null
          classifier_result?: Json | null
          created_at?: string
          follower_count?: number | null
          id?: string
          instagram_handle: string
          instagram_id?: string | null
          status?: string
          submitter_ip?: string | null
          updated_at?: string
        }
        Update: {
          artist_id?: string | null
          bio?: string | null
          classifier_result?: Json | null
          created_at?: string
          follower_count?: number | null
          id?: string
          instagram_handle?: string
          instagram_id?: string | null
          status?: string
          submitter_ip?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_recommendations_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_subscriptions: {
        Row: {
          artist_id: string | null
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          promo_code: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          artist_id?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          promo_code?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          artist_id?: string | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          promo_code?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_subscriptions_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artist_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          auto_sync_enabled: boolean | null
          availability_status: string | null
          bio: string | null
          bio_override: string | null
          booking_url: string | null
          city: string | null
          claimed_at: string | null
          claimed_by_user_id: string | null
          contact_email: string | null
          created_at: string | null
          deleted_at: string | null
          discovery_source: string | null
          exclude_from_scraping: boolean | null
          follower_count: number | null
          google_place_id: string | null
          id: string
          instagram_handle: string
          instagram_id: string | null
          instagram_private: boolean | null
          instagram_url: string | null
          is_featured: boolean | null
          is_pro: boolean | null
          last_instagram_sync_at: string | null
          last_scraped_at: string | null
          last_sync_started_at: string | null
          name: string
          pipeline_status: string | null
          pricing_info: string | null
          profile_image_url: string | null
          shop_name: string | null
          slug: string
          state: string | null
          sync_consecutive_failures: number | null
          sync_disabled_reason: string | null
          sync_in_progress: boolean | null
          updated_at: string | null
          verification_status: string | null
          verification_token: string | null
          website_url: string | null
        }
        Insert: {
          auto_sync_enabled?: boolean | null
          availability_status?: string | null
          bio?: string | null
          bio_override?: string | null
          booking_url?: string | null
          city?: string | null
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          contact_email?: string | null
          created_at?: string | null
          deleted_at?: string | null
          discovery_source?: string | null
          exclude_from_scraping?: boolean | null
          follower_count?: number | null
          google_place_id?: string | null
          id?: string
          instagram_handle: string
          instagram_id?: string | null
          instagram_private?: boolean | null
          instagram_url?: string | null
          is_featured?: boolean | null
          is_pro?: boolean | null
          last_instagram_sync_at?: string | null
          last_scraped_at?: string | null
          last_sync_started_at?: string | null
          name: string
          pipeline_status?: string | null
          pricing_info?: string | null
          profile_image_url?: string | null
          shop_name?: string | null
          slug: string
          state?: string | null
          sync_consecutive_failures?: number | null
          sync_disabled_reason?: string | null
          sync_in_progress?: boolean | null
          updated_at?: string | null
          verification_status?: string | null
          verification_token?: string | null
          website_url?: string | null
        }
        Update: {
          auto_sync_enabled?: boolean | null
          availability_status?: string | null
          bio?: string | null
          bio_override?: string | null
          booking_url?: string | null
          city?: string | null
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          contact_email?: string | null
          created_at?: string | null
          deleted_at?: string | null
          discovery_source?: string | null
          exclude_from_scraping?: boolean | null
          follower_count?: number | null
          google_place_id?: string | null
          id?: string
          instagram_handle?: string
          instagram_id?: string | null
          instagram_private?: boolean | null
          instagram_url?: string | null
          is_featured?: boolean | null
          is_pro?: boolean | null
          last_instagram_sync_at?: string | null
          last_scraped_at?: string | null
          last_sync_started_at?: string | null
          name?: string
          pipeline_status?: string | null
          pricing_info?: string | null
          profile_image_url?: string | null
          shop_name?: string | null
          slug?: string
          state?: string | null
          sync_consecutive_failures?: number | null
          sync_disabled_reason?: string | null
          sync_in_progress?: boolean | null
          updated_at?: string | null
          verification_status?: string | null
          verification_token?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artists_claimed_by_user_id_fkey"
            columns: ["claimed_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      artists_slug_backup: {
        Row: {
          backed_up_at: string | null
          id: string
          instagram_handle: string
          old_slug: string
        }
        Insert: {
          backed_up_at?: string | null
          id: string
          instagram_handle: string
          old_slug: string
        }
        Update: {
          backed_up_at?: string | null
          id?: string
          instagram_handle?: string
          old_slug?: string
        }
        Relationships: []
      }
      claim_attempts: {
        Row: {
          artist_handle: string
          artist_id: string
          created_at: string | null
          id: string
          instagram_handle_attempted: string
          ip_address: unknown
          outcome: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          artist_handle: string
          artist_id: string
          created_at?: string | null
          id?: string
          instagram_handle_attempted: string
          ip_address?: unknown
          outcome: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          artist_handle?: string
          artist_id?: string
          created_at?: string | null
          id?: string
          instagram_handle_attempted?: string
          ip_address?: unknown
          outcome?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_attempts_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claim_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_queries: {
        Row: {
          api_cost_estimate: number | null
          artists_found: string[] | null
          city: string
          created_at: string | null
          id: string
          query: string
          results_count: number | null
          source: string
        }
        Insert: {
          api_cost_estimate?: number | null
          artists_found?: string[] | null
          city: string
          created_at?: string | null
          id?: string
          query: string
          results_count?: number | null
          source: string
        }
        Update: {
          api_cost_estimate?: number | null
          artists_found?: string[] | null
          city?: string
          created_at?: string | null
          id?: string
          query?: string
          results_count?: number | null
          source?: string
        }
        Relationships: []
      }
      email_log: {
        Row: {
          artist_id: string | null
          created_at: string
          email_type: string
          error_message: string | null
          id: string
          recipient_email: string
          resend_id: string | null
          sent_at: string
          subject: string
          success: boolean
          user_id: string | null
        }
        Insert: {
          artist_id?: string | null
          created_at?: string
          email_type: string
          error_message?: string | null
          id?: string
          recipient_email: string
          resend_id?: string | null
          sent_at?: string
          subject: string
          success: boolean
          user_id?: string | null
        }
        Update: {
          artist_id?: string | null
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          recipient_email?: string
          resend_id?: string | null
          sent_at?: string
          subject?: string
          success?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_log_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      email_preferences: {
        Row: {
          created_at: string
          email: string
          id: string
          receive_marketing: boolean
          receive_subscription_updates: boolean
          receive_sync_notifications: boolean
          receive_welcome: boolean
          unsubscribe_reason: string | null
          unsubscribed_all: boolean
          unsubscribed_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          receive_marketing?: boolean
          receive_subscription_updates?: boolean
          receive_sync_notifications?: boolean
          receive_welcome?: boolean
          unsubscribe_reason?: string | null
          unsubscribed_all?: boolean
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          receive_marketing?: boolean
          receive_subscription_updates?: boolean
          receive_sync_notifications?: boolean
          receive_welcome?: boolean
          unsubscribe_reason?: string | null
          unsubscribed_all?: boolean
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      follower_mining_runs: {
        Row: {
          apify_cost_estimate: number | null
          artists_inserted: number | null
          artists_skipped_private: number | null
          bio_filter_passed: number | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          followers_scraped: number | null
          id: string
          image_filter_passed: number | null
          openai_cost_estimate: number | null
          seed_account: string
          seed_type: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          apify_cost_estimate?: number | null
          artists_inserted?: number | null
          artists_skipped_private?: number | null
          bio_filter_passed?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          followers_scraped?: number | null
          id?: string
          image_filter_passed?: number | null
          openai_cost_estimate?: number | null
          seed_account: string
          seed_type?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          apify_cost_estimate?: number | null
          artists_inserted?: number | null
          artists_skipped_private?: number | null
          bio_filter_passed?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          followers_scraped?: number | null
          id?: string
          image_filter_passed?: number | null
          openai_cost_estimate?: number | null
          seed_account?: string
          seed_type?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      hashtag_mining_runs: {
        Row: {
          apify_cost_estimate: number | null
          artists_inserted: number | null
          bio_filter_passed: number | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          hashtag: string
          id: string
          image_filter_passed: number | null
          openai_cost_estimate: number | null
          posts_scraped: number | null
          started_at: string | null
          status: string | null
          unique_handles_found: number | null
        }
        Insert: {
          apify_cost_estimate?: number | null
          artists_inserted?: number | null
          bio_filter_passed?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          hashtag: string
          id?: string
          image_filter_passed?: number | null
          openai_cost_estimate?: number | null
          posts_scraped?: number | null
          started_at?: string | null
          status?: string | null
          unique_handles_found?: number | null
        }
        Update: {
          apify_cost_estimate?: number | null
          artists_inserted?: number | null
          bio_filter_passed?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          hashtag?: string
          id?: string
          image_filter_passed?: number | null
          openai_cost_estimate?: number | null
          posts_scraped?: number | null
          started_at?: string | null
          status?: string | null
          unique_handles_found?: number | null
        }
        Relationships: []
      }
      instagram_sync_log: {
        Row: {
          artist_id: string | null
          completed_at: string | null
          error_message: string | null
          id: string
          images_added: number | null
          images_fetched: number | null
          images_skipped: number | null
          started_at: string | null
          status: string
          sync_type: string
          user_id: string | null
        }
        Insert: {
          artist_id?: string | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          images_added?: number | null
          images_fetched?: number | null
          images_skipped?: number | null
          started_at?: string | null
          status: string
          sync_type: string
          user_id?: string | null
        }
        Update: {
          artist_id?: string | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          images_added?: number | null
          images_fetched?: number | null
          images_skipped?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_sync_log_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_sync_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      mining_candidates: {
        Row: {
          bio_filter_passed: boolean | null
          biography: string | null
          created_at: string | null
          extracted_city: string | null
          extracted_state: string | null
          follower_count: number | null
          id: string
          image_filter_passed: boolean | null
          inserted_as_artist_id: string | null
          instagram_handle: string
          is_private: boolean | null
          location_confidence: string | null
          processed_at: string | null
          source_id: string | null
          source_type: string
        }
        Insert: {
          bio_filter_passed?: boolean | null
          biography?: string | null
          created_at?: string | null
          extracted_city?: string | null
          extracted_state?: string | null
          follower_count?: number | null
          id?: string
          image_filter_passed?: boolean | null
          inserted_as_artist_id?: string | null
          instagram_handle: string
          is_private?: boolean | null
          location_confidence?: string | null
          processed_at?: string | null
          source_id?: string | null
          source_type: string
        }
        Update: {
          bio_filter_passed?: boolean | null
          biography?: string | null
          created_at?: string | null
          extracted_city?: string | null
          extracted_state?: string | null
          follower_count?: number | null
          id?: string
          image_filter_passed?: boolean | null
          inserted_as_artist_id?: string | null
          instagram_handle?: string
          is_private?: boolean | null
          location_confidence?: string | null
          processed_at?: string | null
          source_id?: string | null
          source_type?: string
        }
        Relationships: []
      }
      onboarding_sessions: {
        Row: {
          artist_id: string | null
          booking_link: string | null
          created_at: string | null
          current_step: number | null
          expires_at: string | null
          fetched_images: Json | null
          id: string
          profile_data: Json | null
          profile_updates: Json | null
          selected_image_ids: string[] | null
          user_id: string
        }
        Insert: {
          artist_id?: string | null
          booking_link?: string | null
          created_at?: string | null
          current_step?: number | null
          expires_at?: string | null
          fetched_images?: Json | null
          id?: string
          profile_data?: Json | null
          profile_updates?: Json | null
          selected_image_ids?: string[] | null
          user_id: string
        }
        Update: {
          artist_id?: string | null
          booking_link?: string | null
          created_at?: string | null
          current_step?: number | null
          expires_at?: string | null
          fetched_images?: Json | null
          id?: string
          profile_data?: Json | null
          profile_updates?: Json | null
          selected_image_ids?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_sessions_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_runs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          failed_items: number | null
          id: string
          job_type: string
          processed_items: number | null
          result_summary: Json | null
          started_at: string | null
          status: string
          target_artist_ids: string[] | null
          target_city: string | null
          target_scope: string
          total_items: number | null
          triggered_by: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          failed_items?: number | null
          id?: string
          job_type: string
          processed_items?: number | null
          result_summary?: Json | null
          started_at?: string | null
          status?: string
          target_artist_ids?: string[] | null
          target_city?: string | null
          target_scope: string
          total_items?: number | null
          triggered_by: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          failed_items?: number | null
          id?: string
          job_type?: string
          processed_items?: number | null
          result_summary?: Json | null
          started_at?: string | null
          status?: string
          target_artist_ids?: string[] | null
          target_city?: string | null
          target_scope?: string
          total_items?: number | null
          triggered_by?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      portfolio_image_analytics: {
        Row: {
          artist_id: string
          created_at: string
          date: string
          id: string
          image_id: string
          view_count: number
        }
        Insert: {
          artist_id: string
          created_at?: string
          date: string
          id?: string
          image_id: string
          view_count?: number
        }
        Update: {
          artist_id?: string
          created_at?: string
          date?: string
          id?: string
          image_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_image_analytics_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_image_analytics_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "portfolio_images"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_images: {
        Row: {
          artist_id: string
          auto_synced: boolean | null
          created_at: string | null
          embedding: string | null
          featured: boolean | null
          hidden: boolean | null
          id: string
          import_source: string | null
          instagram_media_id: string | null
          instagram_post_id: string
          instagram_url: string
          is_pinned: boolean | null
          likes_count: number | null
          manually_added: boolean | null
          pinned_position: number | null
          post_caption: string | null
          post_timestamp: string | null
          status: string
          storage_original_path: string | null
          storage_thumb_1280: string | null
          storage_thumb_320: string | null
          storage_thumb_640: string | null
        }
        Insert: {
          artist_id: string
          auto_synced?: boolean | null
          created_at?: string | null
          embedding?: string | null
          featured?: boolean | null
          hidden?: boolean | null
          id?: string
          import_source?: string | null
          instagram_media_id?: string | null
          instagram_post_id: string
          instagram_url: string
          is_pinned?: boolean | null
          likes_count?: number | null
          manually_added?: boolean | null
          pinned_position?: number | null
          post_caption?: string | null
          post_timestamp?: string | null
          status?: string
          storage_original_path?: string | null
          storage_thumb_1280?: string | null
          storage_thumb_320?: string | null
          storage_thumb_640?: string | null
        }
        Update: {
          artist_id?: string
          auto_synced?: boolean | null
          created_at?: string | null
          embedding?: string | null
          featured?: boolean | null
          hidden?: boolean | null
          id?: string
          import_source?: string | null
          instagram_media_id?: string | null
          instagram_post_id?: string
          instagram_url?: string
          is_pinned?: boolean | null
          likes_count?: number | null
          manually_added?: boolean | null
          pinned_position?: number | null
          post_caption?: string | null
          post_timestamp?: string | null
          status?: string
          storage_original_path?: string | null
          storage_thumb_1280?: string | null
          storage_thumb_320?: string | null
          storage_thumb_640?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_images_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          active: boolean | null
          code: string
          created_at: string | null
          current_uses: number | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          max_uses: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string | null
          current_uses?: number | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string | null
          current_uses?: number | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      saved_artists: {
        Row: {
          artist_id: string | null
          created_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          artist_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          artist_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_artists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_artists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      scraping_jobs: {
        Row: {
          artist_id: string | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          images_scraped: number
          started_at: string | null
          status: string
        }
        Insert: {
          artist_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          images_scraped?: number
          started_at?: string | null
          status?: string
        }
        Update: {
          artist_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          images_scraped?: number
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scraping_jobs_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      searches: {
        Row: {
          artist_id_source: string | null
          created_at: string | null
          embedding: string | null
          id: string
          image_url: string | null
          instagram_post_id: string | null
          instagram_username: string | null
          query_text: string | null
          query_type: string
          user_id: string | null
        }
        Insert: {
          artist_id_source?: string | null
          created_at?: string | null
          embedding?: string | null
          id?: string
          image_url?: string | null
          instagram_post_id?: string | null
          instagram_username?: string | null
          query_text?: string | null
          query_type: string
          user_id?: string | null
        }
        Update: {
          artist_id_source?: string | null
          created_at?: string | null
          embedding?: string | null
          id?: string
          image_url?: string | null
          instagram_post_id?: string | null
          instagram_username?: string | null
          query_text?: string | null
          query_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "searches_artist_id_source_fkey"
            columns: ["artist_id_source"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "searches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      style_seeds: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          embedding: string
          id: string
          seed_image_url: string
          style_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          embedding: string
          id?: string
          seed_image_url: string
          style_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          embedding?: string
          id?: string
          seed_image_url?: string
          style_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          account_type: string
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string
          instagram_id: string | null
          instagram_token_vault_id: string | null
          instagram_username: string | null
          updated_at: string | null
        }
        Insert: {
          account_type?: string
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          instagram_id?: string | null
          instagram_token_vault_id?: string | null
          instagram_username?: string | null
          updated_at?: string | null
        }
        Update: {
          account_type?: string
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          instagram_id?: string | null
          instagram_token_vault_id?: string | null
          instagram_username?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_claim_artist: {
        Args: {
          p_artist_id: string
          p_instagram_handle?: string
          p_instagram_id?: string
        }
        Returns: boolean
      }
      can_receive_email: {
        Args: { p_email: string; p_email_type: string }
        Returns: boolean
      }
      check_email_rate_limit: {
        Args: {
          p_email_type: string
          p_max_per_day?: number
          p_max_per_hour?: number
          p_recipient_email: string
        }
        Returns: {
          allowed: boolean
          daily_count: number
          hourly_count: number
          reason: string
        }[]
      }
      claim_artist_profile: {
        Args: {
          p_artist_id: string
          p_instagram_handle: string
          p_instagram_id?: string
          p_user_id: string
        }
        Returns: Json
      }
      cleanup_old_email_logs: { Args: never; Returns: number }
      count_artists_without_images: { Args: never; Returns: number }
      count_matching_artists: {
        Args: {
          city_filter?: string
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          count: number
        }[]
      }
      create_pipeline_run: {
        Args: {
          p_job_type: string
          p_target_artist_ids?: string[]
          p_target_city?: string
          p_target_scope?: string
          p_triggered_by: string
        }
        Returns: string
      }
      find_related_artists: {
        Args: {
          city_filter?: string
          match_count?: number
          source_artist_id: string
        }
        Returns: {
          artist_id: string
          artist_name: string
          artist_slug: string
          city: string
          follower_count: number
          instagram_url: string
          is_verified: boolean
          profile_image_url: string
          shop_name: string
          similarity: number
        }[]
      }
      get_artist_by_handle: {
        Args: { p_instagram_handle: string }
        Returns: {
          claimed_by_user_id: string
          id: string
          instagram_handle: string
          name: string
          slug: string
          verification_status: string
        }[]
      }
      get_artist_portfolio: {
        Args: { p_artist_id: string }
        Returns: {
          created_at: string
          hidden: boolean
          id: string
          import_source: string
          instagram_post_id: string
          instagram_url: string
          is_pinned: boolean
          likes_count: number
          pinned_position: number
          post_caption: string
          post_timestamp: string
          storage_original_path: string
          storage_thumb_1280: string
          storage_thumb_320: string
          storage_thumb_640: string
        }[]
      }
      get_artist_subscription_status: {
        Args: { p_artist_id: string }
        Returns: {
          current_period_end: string
          is_active: boolean
          status: string
          subscription_type: string
        }[]
      }
      get_mining_stats: {
        Args: never
        Returns: {
          completed_runs: number
          source_type: string
          total_apify_cost: number
          total_artists_found: number
          total_openai_cost: number
          total_runs: number
        }[]
      }
      get_state_cities_with_counts: {
        Args: { state_code: string }
        Returns: {
          artist_count: number
          city: string
        }[]
      }
      increment_booking_click: {
        Args: { p_artist_id: string }
        Returns: undefined
      }
      increment_image_view: { Args: { p_image_id: string }; Returns: undefined }
      increment_instagram_click: {
        Args: { p_artist_id: string }
        Returns: undefined
      }
      increment_profile_view: {
        Args: { p_artist_id: string }
        Returns: undefined
      }
      increment_search_appearances: {
        Args: { p_artist_ids: string[] }
        Returns: undefined
      }
      log_email_send: {
        Args: {
          p_artist_id: string
          p_email_type: string
          p_error_message?: string
          p_recipient_email: string
          p_resend_id?: string
          p_subject: string
          p_success: boolean
          p_user_id: string
        }
        Returns: string
      }
      search_artists_by_embedding: {
        Args: {
          city_filter?: string
          match_count?: number
          match_threshold?: number
          offset_param?: number
          query_embedding: string
        }
        Returns: {
          artist_id: string
          artist_name: string
          artist_slug: string
          city: string
          instagram_url: string
          is_featured: boolean
          is_pro: boolean
          is_verified: boolean
          matching_images: Json
          profile_image_url: string
          similarity: number
        }[]
      }
      search_artists_with_count: {
        Args: {
          city_filter?: string
          match_count?: number
          match_threshold?: number
          offset_param?: number
          query_embedding: string
        }
        Returns: {
          artist_id: string
          artist_name: string
          artist_slug: string
          city: string
          follower_count: number
          instagram_url: string
          is_featured: boolean
          is_pro: boolean
          is_verified: boolean
          matching_images: Json
          max_likes: number
          profile_image_url: string
          shop_name: string
          similarity: number
          total_count: number
        }[]
      }
      unsubscribe_from_emails: {
        Args: {
          p_email: string
          p_reason?: string
          p_unsubscribe_all?: boolean
        }
        Returns: string
      }
      user_has_vault_tokens: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      validate_promo_code: {
        Args: { p_code: string }
        Returns: {
          discount_type: string
          discount_value: number
          id: string
          is_valid: boolean
        }[]
      }
      vault_create_secret: {
        Args: { description?: string; name: string; secret: string }
        Returns: {
          id: string
        }[]
      }
      vault_delete_secret: { Args: { secret_id: string }; Returns: undefined }
      vault_get_decrypted_secret: {
        Args: { secret_id: string }
        Returns: string
      }
      vault_update_secret: {
        Args: { new_secret: string; secret_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
