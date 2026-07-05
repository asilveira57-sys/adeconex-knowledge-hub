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
      applications: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          legacy_id: number | null
          name: string
          parent_id: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          legacy_id?: number | null
          name: string
          parent_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          legacy_id?: number | null
          name?: string
          parent_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_import_logs: {
        Row: {
          action: Database["public"]["Enums"]["import_action"]
          batch_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          legacy_id: string | null
          message: string | null
          payload: Json | null
          source_file: string | null
          status: Database["public"]["Enums"]["import_status"]
        }
        Insert: {
          action: Database["public"]["Enums"]["import_action"]
          batch_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          legacy_id?: string | null
          message?: string | null
          payload?: Json | null
          source_file?: string | null
          status: Database["public"]["Enums"]["import_status"]
        }
        Update: {
          action?: Database["public"]["Enums"]["import_action"]
          batch_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          legacy_id?: string | null
          message?: string | null
          payload?: Json | null
          source_file?: string | null
          status?: Database["public"]["Enums"]["import_status"]
        }
        Relationships: []
      }
      legacy_redirects: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type:
            | Database["public"]["Enums"]["redirect_entity_type"]
            | null
          hits: number
          http_status: number
          id: string
          is_active: boolean
          last_hit_at: string | null
          new_url: string
          old_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?:
            | Database["public"]["Enums"]["redirect_entity_type"]
            | null
          hits?: number
          http_status?: number
          id?: string
          is_active?: boolean
          last_hit_at?: string | null
          new_url: string
          old_url: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?:
            | Database["public"]["Enums"]["redirect_entity_type"]
            | null
          hits?: number
          http_status?: number
          id?: string
          is_active?: boolean
          last_hit_at?: string | null
          new_url?: string
          old_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      markets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          name: string
          slug: string
          technical_notes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          name: string
          slug: string
          technical_notes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          name?: string
          slug?: string
          technical_notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          category_id: string
          created_at: string
          is_primary: boolean
          product_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          is_primary?: boolean
          product_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          is_primary?: boolean
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_compatibilities: {
        Row: {
          compatible_brand: string | null
          compatible_model: string | null
          compatible_name: string
          compatible_type: Database["public"]["Enums"]["compatibility_type"]
          created_at: string
          id: string
          is_verified: boolean
          notes: string | null
          position: number
          product_id: string
          updated_at: string
        }
        Insert: {
          compatible_brand?: string | null
          compatible_model?: string | null
          compatible_name: string
          compatible_type: Database["public"]["Enums"]["compatibility_type"]
          created_at?: string
          id?: string
          is_verified?: boolean
          notes?: string | null
          position?: number
          product_id: string
          updated_at?: string
        }
        Update: {
          compatible_brand?: string | null
          compatible_model?: string | null
          compatible_name?: string
          compatible_type?: Database["public"]["Enums"]["compatibility_type"]
          created_at?: string
          id?: string
          is_verified?: boolean
          notes?: string | null
          position?: number
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_compatibilities_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_families: {
        Row: {
          canonical_url: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          name: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          name: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          name?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_ai_generated: boolean
          is_reviewed: boolean
          position: number
          product_id: string
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          is_ai_generated?: boolean
          is_reviewed?: boolean
          position?: number
          product_id: string
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_ai_generated?: boolean
          is_reviewed?: boolean
          position?: number
          product_id?: string
          question?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_faqs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          caption: string | null
          created_at: string
          height_px: number | null
          id: string
          image_type: Database["public"]["Enums"]["image_type"]
          is_main: boolean
          position: number
          product_id: string
          source_url: string | null
          storage_path: string | null
          updated_at: string
          variant_id: string | null
          width_px: number | null
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          height_px?: number | null
          id?: string
          image_type?: Database["public"]["Enums"]["image_type"]
          is_main?: boolean
          position?: number
          product_id: string
          source_url?: string | null
          storage_path?: string | null
          updated_at?: string
          variant_id?: string | null
          width_px?: number | null
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          height_px?: number | null
          id?: string
          image_type?: Database["public"]["Enums"]["image_type"]
          is_main?: boolean
          position?: number
          product_id?: string
          source_url?: string | null
          storage_path?: string | null
          updated_at?: string
          variant_id?: string | null
          width_px?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_relationships: {
        Row: {
          created_at: string
          id: string
          position: number
          product_id: string
          related_product_id: string
          relationship_type: Database["public"]["Enums"]["relationship_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          product_id: string
          related_product_id: string
          relationship_type: Database["public"]["Enums"]["relationship_type"]
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          product_id?: string
          related_product_id?: string
          relationship_type?: Database["public"]["Enums"]["relationship_type"]
        }
        Relationships: [
          {
            foreignKeyName: "product_relationships_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_relationships_related_product_id_fkey"
            columns: ["related_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_specifications: {
        Row: {
          created_at: string
          id: string
          position: number
          product_id: string
          spec_group: string | null
          spec_name: string
          spec_value: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          product_id: string
          spec_group?: string | null
          spec_name: string
          spec_value?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          product_id?: string
          spec_group?: string | null
          spec_name?: string
          spec_value?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_specifications_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          additional_images: string[] | null
          cost_price: number | null
          created_at: string
          ean: string | null
          height_mm: number | null
          id: string
          legacy_id: number | null
          length_mm: number | null
          main_image_url: string | null
          name: string | null
          option1_name: string | null
          option1_value: string | null
          option2_name: string | null
          option2_value: string | null
          price: number | null
          product_id: string
          promotional_price: number | null
          reference: string | null
          sku: string | null
          sort_order: number
          stock_quantity: number | null
          updated_at: string
          weight_kg: number | null
          width_mm: number | null
        }
        Insert: {
          additional_images?: string[] | null
          cost_price?: number | null
          created_at?: string
          ean?: string | null
          height_mm?: number | null
          id?: string
          legacy_id?: number | null
          length_mm?: number | null
          main_image_url?: string | null
          name?: string | null
          option1_name?: string | null
          option1_value?: string | null
          option2_name?: string | null
          option2_value?: string | null
          price?: number | null
          product_id: string
          promotional_price?: number | null
          reference?: string | null
          sku?: string | null
          sort_order?: number
          stock_quantity?: number | null
          updated_at?: string
          weight_kg?: number | null
          width_mm?: number | null
        }
        Update: {
          additional_images?: string[] | null
          cost_price?: number | null
          created_at?: string
          ean?: string | null
          height_mm?: number | null
          id?: string
          legacy_id?: number | null
          length_mm?: number | null
          main_image_url?: string | null
          name?: string | null
          option1_name?: string | null
          option1_value?: string | null
          option2_name?: string | null
          option2_value?: string | null
          price?: number | null
          product_id?: string
          promotional_price?: number | null
          reference?: string | null
          sku?: string | null
          sort_order?: number
          stock_quantity?: number | null
          updated_at?: string
          weight_kg?: number | null
          width_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_videos: {
        Row: {
          created_at: string
          description: string | null
          id: string
          platform: Database["public"]["Enums"]["video_platform"]
          position: number
          product_id: string
          title: string | null
          transcript: string | null
          updated_at: string
          video_url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          platform?: Database["public"]["Enums"]["video_platform"]
          position?: number
          product_id: string
          title?: string | null
          transcript?: string | null
          updated_at?: string
          video_url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          platform?: Database["public"]["Enums"]["video_platform"]
          position?: number
          product_id?: string
          title?: string | null
          transcript?: string | null
          updated_at?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_videos_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          adhesive_type: string | null
          application_id: string | null
          availability_status: Database["public"]["Enums"]["availability_status"]
          brand_id: string | null
          category_id: string | null
          color: string | null
          commercial_description: string | null
          core_diameter_mm: number | null
          cost_price: number | null
          created_at: string
          ean: string | null
          family_id: string | null
          height_mm: number | null
          id: string
          imported_at: string | null
          included_items: string | null
          is_available: boolean
          legacy_id: number | null
          legacy_store_id: number | null
          length_mm: number | null
          market_id: string | null
          material_id: string | null
          min_stock: number | null
          model: string | null
          name: string
          new_url: string | null
          old_url: string | null
          price: number | null
          print_type: string | null
          promo_ends_at: string | null
          promo_starts_at: string | null
          promotional_price: number | null
          published_at: string | null
          quality_flags: Json
          raw_html: string | null
          redirect_status: string
          reference: string | null
          roll_quantity: number | null
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          short_description: string | null
          sku: string | null
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          stock_quantity: number | null
          technical_description: string | null
          updated_at: string
          warranty: string | null
          weight_kg: number | null
          width_mm: number | null
        }
        Insert: {
          adhesive_type?: string | null
          application_id?: string | null
          availability_status?: Database["public"]["Enums"]["availability_status"]
          brand_id?: string | null
          category_id?: string | null
          color?: string | null
          commercial_description?: string | null
          core_diameter_mm?: number | null
          cost_price?: number | null
          created_at?: string
          ean?: string | null
          family_id?: string | null
          height_mm?: number | null
          id?: string
          imported_at?: string | null
          included_items?: string | null
          is_available?: boolean
          legacy_id?: number | null
          legacy_store_id?: number | null
          length_mm?: number | null
          market_id?: string | null
          material_id?: string | null
          min_stock?: number | null
          model?: string | null
          name: string
          new_url?: string | null
          old_url?: string | null
          price?: number | null
          print_type?: string | null
          promo_ends_at?: string | null
          promo_starts_at?: string | null
          promotional_price?: number | null
          published_at?: string | null
          quality_flags?: Json
          raw_html?: string | null
          redirect_status?: string
          reference?: string | null
          roll_quantity?: number | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          short_description?: string | null
          sku?: string | null
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          stock_quantity?: number | null
          technical_description?: string | null
          updated_at?: string
          warranty?: string | null
          weight_kg?: number | null
          width_mm?: number | null
        }
        Update: {
          adhesive_type?: string | null
          application_id?: string | null
          availability_status?: Database["public"]["Enums"]["availability_status"]
          brand_id?: string | null
          category_id?: string | null
          color?: string | null
          commercial_description?: string | null
          core_diameter_mm?: number | null
          cost_price?: number | null
          created_at?: string
          ean?: string | null
          family_id?: string | null
          height_mm?: number | null
          id?: string
          imported_at?: string | null
          included_items?: string | null
          is_available?: boolean
          legacy_id?: number | null
          legacy_store_id?: number | null
          length_mm?: number | null
          market_id?: string | null
          material_id?: string | null
          min_stock?: number | null
          model?: string | null
          name?: string
          new_url?: string | null
          old_url?: string | null
          price?: number | null
          print_type?: string | null
          promo_ends_at?: string | null
          promo_starts_at?: string | null
          promotional_price?: number | null
          published_at?: string | null
          quality_flags?: Json
          raw_html?: string | null
          redirect_status?: string
          reference?: string | null
          roll_quantity?: number | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          short_description?: string | null
          sku?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          stock_quantity?: number | null
          technical_description?: string | null
          updated_at?: string
          warranty?: string | null
          weight_kg?: number | null
          width_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "product_families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_pages: {
        Row: {
          canonical_url: string | null
          created_at: string
          entity_id: string | null
          entity_type: Database["public"]["Enums"]["seo_entity_type"]
          id: string
          indexable: boolean
          is_published: boolean
          keywords: string | null
          meta_description: string | null
          path: string | null
          schema_type: string | null
          structured_data_json: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: Database["public"]["Enums"]["seo_entity_type"]
          id?: string
          indexable?: boolean
          is_published?: boolean
          keywords?: string | null
          meta_description?: string | null
          path?: string | null
          schema_type?: string | null
          structured_data_json?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["seo_entity_type"]
          id?: string
          indexable?: boolean
          is_published?: boolean
          keywords?: string | null
          meta_description?: string | null
          path?: string | null
          schema_type?: string | null
          structured_data_json?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "editor" | "viewer"
      availability_status:
        | "in_stock"
        | "out_of_stock"
        | "preorder"
        | "discontinued"
        | "made_to_order"
      compatibility_type:
        | "printer"
        | "marketplace"
        | "ribbon"
        | "label"
        | "software"
        | "device"
        | "brand"
        | "other"
      image_type:
        | "main"
        | "gallery"
        | "variant"
        | "lifestyle"
        | "technical"
        | "packaging"
      import_action: "create" | "update" | "skip" | "error" | "link" | "enrich"
      import_status: "success" | "warning" | "error"
      product_status:
        | "imported"
        | "needs_review"
        | "enriched"
        | "published"
        | "hidden"
        | "discontinued"
      redirect_entity_type:
        | "product"
        | "product_family"
        | "category"
        | "page"
        | "other"
      relationship_type:
        | "complementary"
        | "replacement"
        | "similar"
        | "required_accessory"
        | "recommended_ribbon"
        | "recommended_label"
        | "same_family"
      seo_entity_type:
        | "product"
        | "product_family"
        | "category"
        | "brand"
        | "material"
        | "application"
        | "market"
        | "page"
      video_platform: "youtube" | "vimeo" | "mp4" | "other"
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
      app_role: ["admin", "editor", "viewer"],
      availability_status: [
        "in_stock",
        "out_of_stock",
        "preorder",
        "discontinued",
        "made_to_order",
      ],
      compatibility_type: [
        "printer",
        "marketplace",
        "ribbon",
        "label",
        "software",
        "device",
        "brand",
        "other",
      ],
      image_type: [
        "main",
        "gallery",
        "variant",
        "lifestyle",
        "technical",
        "packaging",
      ],
      import_action: ["create", "update", "skip", "error", "link", "enrich"],
      import_status: ["success", "warning", "error"],
      product_status: [
        "imported",
        "needs_review",
        "enriched",
        "published",
        "hidden",
        "discontinued",
      ],
      redirect_entity_type: [
        "product",
        "product_family",
        "category",
        "page",
        "other",
      ],
      relationship_type: [
        "complementary",
        "replacement",
        "similar",
        "required_accessory",
        "recommended_ribbon",
        "recommended_label",
        "same_family",
      ],
      seo_entity_type: [
        "product",
        "product_family",
        "category",
        "brand",
        "material",
        "application",
        "market",
        "page",
      ],
      video_platform: ["youtube", "vimeo", "mp4", "other"],
    },
  },
} as const
