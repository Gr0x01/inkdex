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
      airtable_sync_log: {
        Row: {
          completed_at: string | null
          direction: string
          errors: Json | null
          id: string
          records_created: number | null
          records_processed: number | null
          records_updated: number | null
          started_at: string | null
          sync_type: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          direction: string
          errors?: Json | null
          id?: string
          records_created?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string | null
          sync_type: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          direction?: string
          errors?: Json | null
          id?: string
          records_created?: number | null
          records_processed?: number | null
          records_updated?: number | null
          started_at?: string | null
          sync_type?: string
          triggered_by?: string | null
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
      artist_audit_log: {
        Row: {
          action: string
          artist_id: string
          created_at: string
          details: Json | null
          id: string
        }
        Insert: {
          action: string
          artist_id: string
          created_at?: string
          details?: Json | null
          id?: string
        }
        Update: {
          action?: string
          artist_id?: string
          created_at?: string
          details?: Json | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artist_audit_log_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_locations: {
        Row: {
          artist_id: string
          city: string | null
          country_code: string
          created_at: string | null
          display_order: number | null
          id: string
          is_primary: boolean | null
          location_type: string
          region: string | null
        }
        Insert: {
          artist_id: string
          city?: string | null
          country_code?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_primary?: boolean | null
          location_type: string
          region?: string | null
        }
        Update: {
          artist_id?: string
          city?: string | null
          country_code?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_primary?: boolean | null
          location_type?: string
          region?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_locations_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_pipeline_state: {
        Row: {
          artist_id: string
          blacklist_reason: string | null
          created_at: string | null
          exclude_from_scraping: boolean | null
          last_scraped_at: string | null
          pipeline_status: string | null
          scrape_priority: number | null
          scraping_blacklisted: boolean | null
          updated_at: string | null
        }
        Insert: {
          artist_id: string
          blacklist_reason?: string | null
          created_at?: string | null
          exclude_from_scraping?: boolean | null
          last_scraped_at?: string | null
          pipeline_status?: string | null
          scrape_priority?: number | null
          scraping_blacklisted?: boolean | null
          updated_at?: string | null
        }
        Update: {
          artist_id?: string
          blacklist_reason?: string | null
          created_at?: string | null
          exclude_from_scraping?: boolean | null
          last_scraped_at?: string | null
          pipeline_status?: string | null
          scrape_priority?: number | null
          scraping_blacklisted?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_pipeline_state_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: true
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
      artist_style_profiles: {
        Row: {
          artist_id: string
          id: string
          image_count: number
          percentage: number
          style_name: string
          taxonomy: Database["public"]["Enums"]["style_taxonomy"] | null
          updated_at: string | null
        }
        Insert: {
          artist_id: string
          id?: string
          image_count?: number
          percentage: number
          style_name: string
          taxonomy?: Database["public"]["Enums"]["style_taxonomy"] | null
          updated_at?: string | null
        }
        Update: {
          artist_id?: string
          id?: string
          image_count?: number
          percentage?: number
          style_name?: string
          taxonomy?: Database["public"]["Enums"]["style_taxonomy"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_style_profiles_artist_id_fkey"
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
      artist_sync_state: {
        Row: {
          artist_id: string
          auto_sync_enabled: boolean | null
          consecutive_failures: number | null
          created_at: string | null
          disabled_reason: string | null
          last_sync_at: string | null
          last_sync_started_at: string | null
          sync_in_progress: boolean | null
          updated_at: string | null
        }
        Insert: {
          artist_id: string
          auto_sync_enabled?: boolean | null
          consecutive_failures?: number | null
          created_at?: string | null
          disabled_reason?: string | null
          last_sync_at?: string | null
          last_sync_started_at?: string | null
          sync_in_progress?: boolean | null
          updated_at?: string | null
        }
        Update: {
          artist_id?: string
          auto_sync_enabled?: boolean | null
          consecutive_failures?: number | null
          created_at?: string | null
          disabled_reason?: string | null
          last_sync_at?: string | null
          last_sync_started_at?: string | null
          sync_in_progress?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artist_sync_state_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: true
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          availability_status: string | null
          bio: string | null
          bio_override: string | null
          blacklisted_at: string | null
          booking_url: string | null
          claimed_at: string | null
          claimed_by_user_id: string | null
          contact_email: string | null
          created_at: string | null
          deleted_at: string | null
          discovery_source: string | null
          featured_at: string | null
          featured_expires_at: string | null
          filter_non_tattoo_content: boolean | null
          follower_count: number | null
          google_place_id: string | null
          id: string
          instagram_handle: string
          instagram_id: string | null
          instagram_private: boolean | null
          instagram_url: string | null
          is_featured: boolean | null
          is_gdpr_blocked: boolean | null
          is_pro: boolean | null
          is_test_account: boolean | null
          name: string
          pricing_info: string | null
          profile_image_url: string | null
          profile_storage_path: string | null
          profile_storage_thumb_320: string | null
          profile_storage_thumb_640: string | null
          shop_name: string | null
          slug: string
          updated_at: string | null
          verification_status: string | null
          verification_token: string | null
          website_url: string | null
        }
        Insert: {
          availability_status?: string | null
          bio?: string | null
          bio_override?: string | null
          blacklisted_at?: string | null
          booking_url?: string | null
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          contact_email?: string | null
          created_at?: string | null
          deleted_at?: string | null
          discovery_source?: string | null
          featured_at?: string | null
          featured_expires_at?: string | null
          filter_non_tattoo_content?: boolean | null
          follower_count?: number | null
          google_place_id?: string | null
          id?: string
          instagram_handle: string
          instagram_id?: string | null
          instagram_private?: boolean | null
          instagram_url?: string | null
          is_featured?: boolean | null
          is_gdpr_blocked?: boolean | null
          is_pro?: boolean | null
          is_test_account?: boolean | null
          name: string
          pricing_info?: string | null
          profile_image_url?: string | null
          profile_storage_path?: string | null
          profile_storage_thumb_320?: string | null
          profile_storage_thumb_640?: string | null
          shop_name?: string | null
          slug: string
          updated_at?: string | null
          verification_status?: string | null
          verification_token?: string | null
          website_url?: string | null
        }
        Update: {
          availability_status?: string | null
          bio?: string | null
          bio_override?: string | null
          blacklisted_at?: string | null
          booking_url?: string | null
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          contact_email?: string | null
          created_at?: string | null
          deleted_at?: string | null
          discovery_source?: string | null
          featured_at?: string | null
          featured_expires_at?: string | null
          filter_non_tattoo_content?: boolean | null
          follower_count?: number | null
          google_place_id?: string | null
          id?: string
          instagram_handle?: string
          instagram_id?: string | null
          instagram_private?: boolean | null
          instagram_url?: string | null
          is_featured?: boolean | null
          is_gdpr_blocked?: boolean | null
          is_pro?: boolean | null
          is_test_account?: boolean | null
          name?: string
          pricing_info?: string | null
          profile_image_url?: string | null
          profile_storage_path?: string | null
          profile_storage_thumb_320?: string | null
          profile_storage_thumb_640?: string | null
          shop_name?: string | null
          slug?: string
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
      country_editorial_content: {
        Row: {
          country_code: string
          generated_at: string | null
          generated_by: string | null
          hero_text: string
          keywords: string[] | null
          major_cities: string[] | null
          scene_heading: string | null
          scene_text: string
          tips_heading: string | null
          tips_text: string
        }
        Insert: {
          country_code: string
          generated_at?: string | null
          generated_by?: string | null
          hero_text: string
          keywords?: string[] | null
          major_cities?: string[] | null
          scene_heading?: string | null
          scene_text: string
          tips_heading?: string | null
          tips_text: string
        }
        Update: {
          country_code?: string
          generated_at?: string | null
          generated_by?: string | null
          hero_text?: string
          keywords?: string[] | null
          major_cities?: string[] | null
          scene_heading?: string | null
          scene_text?: string
          tips_heading?: string | null
          tips_text?: string
        }
        Relationships: []
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
      encrypted_instagram_tokens: {
        Row: {
          created_at: string
          encrypted_data: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_data: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_data?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "encrypted_instagram_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
      image_style_tags: {
        Row: {
          confidence: number
          created_at: string | null
          id: string
          image_id: string
          is_primary: boolean | null
          style_name: string
          taxonomy: Database["public"]["Enums"]["style_taxonomy"] | null
        }
        Insert: {
          confidence: number
          created_at?: string | null
          id?: string
          image_id: string
          is_primary?: boolean | null
          style_name: string
          taxonomy?: Database["public"]["Enums"]["style_taxonomy"] | null
        }
        Update: {
          confidence?: number
          created_at?: string | null
          id?: string
          image_id?: string
          is_primary?: boolean | null
          style_name?: string
          taxonomy?: Database["public"]["Enums"]["style_taxonomy"] | null
        }
        Relationships: [
          {
            foreignKeyName: "image_style_tags_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "portfolio_images"
            referencedColumns: ["id"]
          },
        ]
      }
      indexnow_submissions: {
        Row: {
          created_at: string | null
          engine: string
          id: string
          response_body: Json | null
          response_status: number | null
          submitted_at: string | null
          trigger_source: string
          triggered_by: string | null
          url_count: number
          urls: string[]
        }
        Insert: {
          created_at?: string | null
          engine: string
          id?: string
          response_body?: Json | null
          response_status?: number | null
          submitted_at?: string | null
          trigger_source: string
          triggered_by?: string | null
          url_count: number
          urls: string[]
        }
        Update: {
          created_at?: string | null
          engine?: string
          id?: string
          response_body?: Json | null
          response_status?: number | null
          submitted_at?: string | null
          trigger_source?: string
          triggered_by?: string | null
          url_count?: number
          urls?: string[]
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
      locations: {
        Row: {
          city: string
          city_ascii: string
          country_code: string
          country_name: string
          created_at: string | null
          id: string
          lat: number | null
          lng: number | null
          population: number | null
          state_code: string | null
          state_name: string | null
          updated_at: string | null
        }
        Insert: {
          city: string
          city_ascii: string
          country_code: string
          country_name: string
          created_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          population?: number | null
          state_code?: string | null
          state_name?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string
          city_ascii?: string
          country_code?: string
          country_name?: string
          created_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          population?: number | null
          state_code?: string | null
          state_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      marketing_outreach: {
        Row: {
          airtable_record_id: string | null
          airtable_synced_at: string | null
          artist_id: string
          campaign_name: string
          claimed_at: string | null
          created_at: string | null
          dm_sent_at: string | null
          generated_at: string | null
          id: string
          notes: string | null
          outreach_type: string
          paired_artist_id: string | null
          post_images: string[] | null
          post_text: string | null
          posted_at: string | null
          pro_expires_at: string | null
          pro_granted_at: string | null
          similarity_score: number | null
          status: string
          updated_at: string | null
        }
        Insert: {
          airtable_record_id?: string | null
          airtable_synced_at?: string | null
          artist_id: string
          campaign_name?: string
          claimed_at?: string | null
          created_at?: string | null
          dm_sent_at?: string | null
          generated_at?: string | null
          id?: string
          notes?: string | null
          outreach_type?: string
          paired_artist_id?: string | null
          post_images?: string[] | null
          post_text?: string | null
          posted_at?: string | null
          pro_expires_at?: string | null
          pro_granted_at?: string | null
          similarity_score?: number | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          airtable_record_id?: string | null
          airtable_synced_at?: string | null
          artist_id?: string
          campaign_name?: string
          claimed_at?: string | null
          created_at?: string | null
          dm_sent_at?: string | null
          generated_at?: string | null
          id?: string
          notes?: string | null
          outreach_type?: string
          paired_artist_id?: string | null
          post_images?: string[] | null
          post_text?: string | null
          posted_at?: string | null
          pro_expires_at?: string | null
          pro_granted_at?: string | null
          similarity_score?: number | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_outreach_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_outreach_paired_artist_id_fkey"
            columns: ["paired_artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
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
          fetch_completed_at: string | null
          fetch_error: string | null
          fetch_started_at: string | null
          fetch_status: string | null
          fetched_images: Json | null
          id: string
          profile_data: Json | null
          profile_updates: Json | null
          user_id: string
        }
        Insert: {
          artist_id?: string | null
          booking_link?: string | null
          created_at?: string | null
          current_step?: number | null
          expires_at?: string | null
          fetch_completed_at?: string | null
          fetch_error?: string | null
          fetch_started_at?: string | null
          fetch_status?: string | null
          fetched_images?: Json | null
          id?: string
          profile_data?: Json | null
          profile_updates?: Json | null
          user_id: string
        }
        Update: {
          artist_id?: string | null
          booking_link?: string | null
          created_at?: string | null
          current_step?: number | null
          expires_at?: string | null
          fetch_completed_at?: string | null
          fetch_error?: string | null
          fetch_started_at?: string | null
          fetch_status?: string | null
          fetched_images?: Json | null
          id?: string
          profile_data?: Json | null
          profile_updates?: Json | null
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
          last_heartbeat_at: string | null
          process_pid: number | null
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
          last_heartbeat_at?: string | null
          process_pid?: number | null
          processed_items?: number | null
          result_summary?: Json | null
          started_at?: string | null
          status?: string
          target_artist_ids?: string[] | null
          target_city?: string | null
          target_scope?: string
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
          last_heartbeat_at?: string | null
          process_pid?: number | null
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
          is_color: boolean | null
          is_pinned: boolean | null
          likes_count: number | null
          manually_added: boolean | null
          pinned_position: number | null
          post_caption: string | null
          post_timestamp: string | null
          search_tier: Database["public"]["Enums"]["search_tier"] | null
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
          is_color?: boolean | null
          is_pinned?: boolean | null
          likes_count?: number | null
          manually_added?: boolean | null
          pinned_position?: number | null
          post_caption?: string | null
          post_timestamp?: string | null
          search_tier?: Database["public"]["Enums"]["search_tier"] | null
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
          is_color?: boolean | null
          is_pinned?: boolean | null
          likes_count?: number | null
          manually_added?: boolean | null
          pinned_position?: number | null
          post_caption?: string | null
          post_timestamp?: string | null
          search_tier?: Database["public"]["Enums"]["search_tier"] | null
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
          retry_count: number | null
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
          retry_count?: number | null
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
          retry_count?: number | null
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
      search_appearances: {
        Row: {
          artist_id: string
          boosted_score: number
          created_at: string
          id: string
          matching_images_count: number
          rank_position: number
          search_id: string
          similarity_score: number
        }
        Insert: {
          artist_id: string
          boosted_score: number
          created_at?: string
          id?: string
          matching_images_count?: number
          rank_position: number
          search_id: string
          similarity_score: number
        }
        Update: {
          artist_id?: string
          boosted_score?: number
          created_at?: string
          id?: string
          matching_images_count?: number
          rank_position?: number
          search_id?: string
          similarity_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "search_appearances_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_appearances_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
        ]
      }
      searches: {
        Row: {
          artist_id_source: string | null
          created_at: string | null
          detected_styles: Json | null
          embedding: string | null
          id: string
          image_url: string | null
          instagram_post_id: string | null
          instagram_username: string | null
          is_color: boolean | null
          primary_style: string | null
          query_text: string | null
          query_type: string
          searched_artist: Json | null
          user_id: string | null
        }
        Insert: {
          artist_id_source?: string | null
          created_at?: string | null
          detected_styles?: Json | null
          embedding?: string | null
          id?: string
          image_url?: string | null
          instagram_post_id?: string | null
          instagram_username?: string | null
          is_color?: boolean | null
          primary_style?: string | null
          query_text?: string | null
          query_type: string
          searched_artist?: Json | null
          user_id?: string | null
        }
        Update: {
          artist_id_source?: string | null
          created_at?: string | null
          detected_styles?: Json | null
          embedding?: string | null
          id?: string
          image_url?: string | null
          instagram_post_id?: string | null
          instagram_username?: string | null
          is_color?: boolean | null
          primary_style?: string | null
          query_text?: string | null
          query_type?: string
          searched_artist?: Json | null
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
          taxonomy: Database["public"]["Enums"]["style_taxonomy"] | null
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
          taxonomy?: Database["public"]["Enums"]["style_taxonomy"] | null
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
          taxonomy?: Database["public"]["Enums"]["style_taxonomy"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      style_training_labels: {
        Row: {
          created_at: string | null
          id: string
          image_id: string
          labeled_by: string
          notes: string | null
          skipped: boolean | null
          styles: string[]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_id: string
          labeled_by: string
          notes?: string | null
          skipped?: boolean | null
          styles?: string[]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_id?: string
          labeled_by?: string
          notes?: string | null
          skipped?: boolean | null
          styles?: string[]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "style_training_labels_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: true
            referencedRelation: "portfolio_images"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          account_type: string
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string
          instagram_id: string | null
          instagram_token_expires_at: string | null
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
          instagram_token_expires_at?: string | null
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
          instagram_token_expires_at?: string | null
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
      classify_embedding_styles: {
        Args: {
          p_embedding: string
          p_max_styles?: number
          p_min_confidence?: number
          p_taxonomy?: Database["public"]["Enums"]["style_taxonomy"]
        }
        Returns: {
          confidence: number
          style_name: string
          taxonomy: Database["public"]["Enums"]["style_taxonomy"]
        }[]
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
      delete_encrypted_token: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      expire_featured_artists: { Args: never; Returns: undefined }
      find_related_artists: {
        Args: {
          city_filter?: string
          country_filter?: string
          match_count?: number
          region_filter?: string
          source_artist_id: string
        }
        Returns: {
          artist_id: string
          artist_name: string
          artist_slug: string
          city: string
          country_code: string
          follower_count: number
          instagram_url: string
          is_verified: boolean
          location_count: number
          profile_image_url: string
          region: string
          shop_name: string
          similarity: number
        }[]
      }
      format_location: {
        Args: { p_city: string; p_country_code: string; p_region: string }
        Returns: string
      }
      get_all_cities_with_min_artists: {
        Args: { min_artist_count?: number }
        Returns: {
          artist_count: number
          city: string
          country_code: string
          region: string
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
      get_artist_locations: {
        Args: { p_artist_id: string }
        Returns: {
          city: string
          country_code: string
          display_order: number
          formatted: string
          id: string
          is_primary: boolean
          location_type: string
          region: string
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
      get_artist_stats: { Args: never; Returns: Json }
      get_artist_subscription_status: {
        Args: { p_artist_id: string }
        Returns: {
          current_period_end: string
          is_active: boolean
          status: string
          subscription_type: string
        }[]
      }
      get_artist_tier_counts: {
        Args: never
        Returns: {
          claimed_free: number
          featured: number
          pro: number
          total: number
          unclaimed: number
        }[]
      }
      get_artists_with_image_counts: {
        Args: {
          p_has_images?: boolean
          p_is_featured?: boolean
          p_limit?: number
          p_location_city?: string
          p_location_state?: string
          p_max_followers?: number
          p_max_images?: number
          p_min_followers?: number
          p_min_images?: number
          p_offset?: number
          p_search?: string
          p_sort_by?: string
          p_sort_order?: string
          p_tier?: string
        }
        Returns: {
          city: string
          deleted_at: string
          follower_count: number
          id: string
          image_count: number
          instagram_handle: string
          is_featured: boolean
          is_pro: boolean
          name: string
          slug: string
          state: string
          total_count: number
          verification_status: string
        }[]
      }
      get_cities_with_counts: {
        Args: { min_count?: number; p_country_code?: string; p_region?: string }
        Returns: {
          artist_count: number
          city: string
          country_code: string
          region: string
        }[]
      }
      get_countries_with_counts: {
        Args: never
        Returns: {
          artist_count: number
          country_code: string
          country_name: string
        }[]
      }
      get_decrypted_token: {
        Args: { p_encryption_key: string; p_user_id: string }
        Returns: string
      }
      get_homepage_stats: {
        Args: never
        Returns: {
          artist_count: number
          city_count: number
          country_count: number
          image_count: number
        }[]
      }
      get_mining_city_distribution: { Args: never; Returns: Json }
      get_mining_stats: { Args: never; Returns: Json }
      get_recent_search_appearances: {
        Args: { p_artist_id: string; p_days: number; p_limit?: number }
        Returns: {
          s_instagram_username: string
          s_query_text: string
          s_query_type: string
          sa_boosted_score: number
          sa_created_at: string
          sa_rank_position: number
          sa_search_id: string
          sa_similarity_score: number
        }[]
      }
      get_regions_with_counts: {
        Args: { p_country_code?: string }
        Returns: {
          artist_count: number
          region: string
          region_name: string
        }[]
      }
      get_search_location_counts: {
        Args: { match_threshold?: number; query_embedding: string }
        Returns: {
          artist_count: number
          city: string
          country_code: string
          location_type: string
          region: string
        }[]
      }
      get_state_cities_with_counts: {
        Args: { state_code: string }
        Returns: {
          artist_count: number
          city: string
        }[]
      }
      get_top_artists_by_style: {
        Args: { p_limit?: number; p_style_slug: string }
        Returns: {
          artist_id: string
          artist_name: string
          best_image_url: string
          city: string
          instagram_handle: string
          is_featured: boolean
          is_pro: boolean
          similarity_score: number
          state: string
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
      increment_pipeline_progress: {
        Args: { failed_delta: number; processed_delta: number; run_id: string }
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
      is_gdpr_country: { Args: { country_code: string }; Returns: boolean }
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
      matches_location_filter: {
        Args: {
          city_filter: string
          country_filter: string
          p_city: string
          p_country_code: string
          p_region: string
          region_filter: string
        }
        Returns: boolean
      }
      recompute_artist_styles: {
        Args: { p_artist_id: string }
        Returns: undefined
      }
      search_artists: {
        Args: {
          city_filter?: string
          country_filter?: string
          is_color_query?: boolean
          match_count?: number
          match_threshold?: number
          offset_param?: number
          query_embedding: string
          query_techniques?: Json
          query_themes?: Json
          region_filter?: string
        }
        Returns: {
          artist_id: string
          artist_name: string
          artist_slug: string
          boosted_score: number
          city: string
          color_boost: number
          country_code: string
          follower_count: number
          instagram_url: string
          is_featured: boolean
          is_pro: boolean
          is_verified: boolean
          location_count: number
          matching_images: Json
          max_likes: number
          profile_image_url: string
          region: string
          shop_name: string
          similarity: number
          style_boost: number
          theme_boost: number
          total_count: number
        }[]
      }
      store_encrypted_token: {
        Args: {
          p_encryption_key: string
          p_token_data: string
          p_user_id: string
        }
        Returns: string
      }
      track_search_appearances_with_details: {
        Args: { p_appearances: Json; p_search_id: string }
        Returns: undefined
      }
      unsubscribe_from_emails: {
        Args: {
          p_email: string
          p_reason?: string
          p_unsubscribe_all?: boolean
        }
        Returns: string
      }
      update_artist_locations: {
        Args: { p_artist_id: string; p_locations: Json; p_user_id?: string }
        Returns: undefined
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
      search_tier: "active" | "archive"
      style_taxonomy: "technique" | "theme"
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
    Enums: {
      search_tier: ["active", "archive"],
      style_taxonomy: ["technique", "theme"],
    },
  },
} as const
