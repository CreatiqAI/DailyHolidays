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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      destinations: {
        Row: {
          cover_image_url: string | null
          created_at: string
          id: string
          name: string
          parent_id: string | null
          region: string | null
          slug: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          region?: string | null
          slug: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          region?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "destinations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiries: {
        Row: {
          created_at: string
          departure_id: string | null
          email: string | null
          handled: boolean
          id: string
          message: string | null
          name: string
          pax: number | null
          phone: string
          tour_id: string | null
        }
        Insert: {
          created_at?: string
          departure_id?: string | null
          email?: string | null
          handled?: boolean
          id?: string
          message?: string | null
          name: string
          pax?: number | null
          phone: string
          tour_id?: string | null
        }
        Update: {
          created_at?: string
          departure_id?: string | null
          email?: string | null
          handled?: boolean
          id?: string
          message?: string | null
          name?: string
          pax?: number | null
          phone?: string
          tour_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enquiries_departure_id_fkey"
            columns: ["departure_id"]
            isOneToOne: false
            referencedRelation: "tour_departures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enquiries_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          created_at: string
          description: string | null
          destination_id: string | null
          id: string
          image_url: string | null
          lat: number | null
          lng: number | null
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          destination_id?: string | null
          id?: string
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          destination_id?: string | null
          id?: string
          image_url?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "places_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_day_places: {
        Row: {
          place_id: string
          sort_order: number
          tour_day_id: string
        }
        Insert: {
          place_id: string
          sort_order?: number
          tour_day_id: string
        }
        Update: {
          place_id?: string
          sort_order?: number
          tour_day_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_day_places_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tour_day_places_tour_day_id_fkey"
            columns: ["tour_day_id"]
            isOneToOne: false
            referencedRelation: "tour_days"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_days: {
        Row: {
          day_number: number
          description: string | null
          hotel: string | null
          id: string
          meals: string[]
          title: string
          tour_id: string
        }
        Insert: {
          day_number: number
          description?: string | null
          hotel?: string | null
          id?: string
          meals?: string[]
          title: string
          tour_id: string
        }
        Update: {
          day_number?: number
          description?: string | null
          hotel?: string | null
          id?: string
          meals?: string[]
          title?: string
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_days_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_departures: {
        Row: {
          created_at: string
          departure_date: string
          id: string
          price_myr: number | null
          price_note: string | null
          status: Database["public"]["Enums"]["departure_status"]
          tour_id: string
        }
        Insert: {
          created_at?: string
          departure_date: string
          id?: string
          price_myr?: number | null
          price_note?: string | null
          status?: Database["public"]["Enums"]["departure_status"]
          tour_id: string
        }
        Update: {
          created_at?: string
          departure_date?: string
          id?: string
          price_myr?: number | null
          price_note?: string | null
          status?: Database["public"]["Enums"]["departure_status"]
          tour_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_departures_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tour_media: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["media_kind"]
          sort_order: number
          tour_id: string
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["media_kind"]
          sort_order?: number
          tour_id: string
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["media_kind"]
          sort_order?: number
          tour_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "tour_media_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "tours"
            referencedColumns: ["id"]
          },
        ]
      }
      tours: {
        Row: {
          airline: string | null
          code: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          destination_id: string | null
          duration_days: number | null
          duration_nights: number | null
          exclusions: string[]
          highlights: string[]
          hotel_rating: string | null
          id: string
          inclusions: string[]
          price_from_myr: number | null
          slug: string
          source: string | null
          source_ref: string | null
          status: Database["public"]["Enums"]["tour_status"]
          summary: string | null
          title: string
          tour_type: Database["public"]["Enums"]["tour_type"]
          updated_at: string
        }
        Insert: {
          airline?: string | null
          code?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          destination_id?: string | null
          duration_days?: number | null
          duration_nights?: number | null
          exclusions?: string[]
          highlights?: string[]
          hotel_rating?: string | null
          id?: string
          inclusions?: string[]
          price_from_myr?: number | null
          slug: string
          source?: string | null
          source_ref?: string | null
          status?: Database["public"]["Enums"]["tour_status"]
          summary?: string | null
          title: string
          tour_type?: Database["public"]["Enums"]["tour_type"]
          updated_at?: string
        }
        Update: {
          airline?: string | null
          code?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          destination_id?: string | null
          duration_days?: number | null
          duration_nights?: number | null
          exclusions?: string[]
          highlights?: string[]
          hotel_rating?: string | null
          id?: string
          inclusions?: string[]
          price_from_myr?: number | null
          slug?: string
          source?: string | null
          source_ref?: string | null
          status?: Database["public"]["Enums"]["tour_status"]
          summary?: string | null
          title?: string
          tour_type?: Database["public"]["Enums"]["tour_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tours_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "destinations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      departure_status: "available" | "limited" | "full" | "cancelled"
      media_kind: "image" | "pdf"
      tour_status: "draft" | "published" | "archived"
      tour_type: "group" | "ground" | "cruise" | "malaysia" | "other"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      departure_status: ["available", "limited", "full", "cancelled"],
      media_kind: ["image", "pdf"],
      tour_status: ["draft", "published", "archived"],
      tour_type: ["group", "ground", "cruise", "malaysia", "other"],
    },
  },
} as const
