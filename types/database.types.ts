export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
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
          city: string
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
          name: string
          pricing_info: string | null
          profile_image_url: string | null
          shop_name: string | null
          slug: string
          state: string | null
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
          city: string
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
          name: string
          pricing_info?: string | null
          profile_image_url?: string | null
          shop_name?: string | null
          slug: string
          state?: string | null
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
          city?: string
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
          name?: string
          pricing_info?: string | null
          profile_image_url?: string | null
          shop_name?: string | null
          slug?: string
          state?: string | null
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
          instagram_access_token: string | null
          instagram_id: string | null
          instagram_refresh_token: string | null
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
          instagram_access_token?: string | null
          instagram_id?: string | null
          instagram_refresh_token?: string | null
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
          instagram_access_token?: string | null
          instagram_id?: string | null
          instagram_refresh_token?: string | null
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
        Args: { p_artist_id: string; p_instagram_id: string }
        Returns: boolean
      }
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
      get_artist_portfolio: {
        Args: { p_artist_id: string }
        Returns: {
          created_at: string
          id: string
          instagram_post_id: string
          instagram_url: string
          is_pinned: boolean
          likes_count: number
          pinned_position: number
          post_caption: string
          post_timestamp: string
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
          follower_count: number
          instagram_url: string
          is_verified: boolean
          matching_images: Json
          max_likes: number
          profile_image_url: string
          shop_name: string
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
          is_verified: boolean
          matching_images: Json
          max_likes: number
          profile_image_url: string
          shop_name: string
          similarity: number
          total_count: number
        }[]
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

