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
      artists: {
        Row: {
          bio: string | null
          bio_override: string | null
          booking_url: string | null
          city: string
          claimed_at: string | null
          claimed_by_user_id: string | null
          contact_email: string | null
          created_at: string | null
          discovery_source: string | null
          follower_count: number | null
          google_place_id: string | null
          id: string
          instagram_handle: string
          instagram_id: string | null
          instagram_private: boolean | null
          instagram_url: string | null
          last_scraped_at: string | null
          name: string
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
          bio?: string | null
          bio_override?: string | null
          booking_url?: string | null
          city: string
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          contact_email?: string | null
          created_at?: string | null
          discovery_source?: string | null
          follower_count?: number | null
          google_place_id?: string | null
          id?: string
          instagram_handle: string
          instagram_id?: string | null
          instagram_private?: boolean | null
          instagram_url?: string | null
          last_scraped_at?: string | null
          name: string
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
          bio?: string | null
          bio_override?: string | null
          booking_url?: string | null
          city?: string
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          contact_email?: string | null
          created_at?: string | null
          discovery_source?: string | null
          follower_count?: number | null
          google_place_id?: string | null
          id?: string
          instagram_handle?: string
          instagram_id?: string | null
          instagram_private?: boolean | null
          instagram_url?: string | null
          last_scraped_at?: string | null
          name?: string
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
      portfolio_images: {
        Row: {
          artist_id: string
          created_at: string | null
          embedding: string | null
          featured: boolean | null
          id: string
          instagram_post_id: string
          instagram_url: string
          likes_count: number | null
          post_caption: string | null
          post_timestamp: string | null
          r2_original_path: string | null
          r2_thumbnail_large: string | null
          r2_thumbnail_medium: string | null
          r2_thumbnail_small: string | null
          status: string
        }
        Insert: {
          artist_id: string
          created_at?: string | null
          embedding?: string | null
          featured?: boolean | null
          id?: string
          instagram_post_id: string
          instagram_url: string
          likes_count?: number | null
          post_caption?: string | null
          post_timestamp?: string | null
          r2_original_path?: string | null
          r2_thumbnail_large?: string | null
          r2_thumbnail_medium?: string | null
          r2_thumbnail_small?: string | null
          status?: string
        }
        Update: {
          artist_id?: string
          created_at?: string | null
          embedding?: string | null
          featured?: boolean | null
          id?: string
          instagram_post_id?: string
          instagram_url?: string
          likes_count?: number | null
          post_caption?: string | null
          post_timestamp?: string | null
          r2_original_path?: string | null
          r2_thumbnail_large?: string | null
          r2_thumbnail_medium?: string | null
          r2_thumbnail_small?: string | null
          status?: string
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
          created_at: string | null
          embedding: string | null
          id: string
          image_url: string | null
          query_text: string | null
          query_type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          embedding?: string | null
          id?: string
          image_url?: string | null
          query_text?: string | null
          query_type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          embedding?: string | null
          id?: string
          image_url?: string | null
          query_text?: string | null
          query_type?: string
          user_id?: string | null
        }
        Relationships: [
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
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string
          instagram_id: string | null
          instagram_username: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          instagram_id?: string | null
          instagram_username?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          instagram_id?: string | null
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
          is_verified: boolean
          matching_images: Json
          profile_image_url: string
          similarity: number
        }[]
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
