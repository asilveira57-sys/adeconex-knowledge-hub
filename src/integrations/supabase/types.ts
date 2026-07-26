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
      bundle_offer_items: {
        Row: {
          created_at: string
          id: string
          is_anchor: boolean
          is_complement_target: boolean
          offer_id: string
          product_id: string
          quantity: number
          sort_order: number
          updated_at: string
          variant_id: string | null
          variant_scope: Database["public"]["Enums"]["bundle_variant_scope"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_anchor?: boolean
          is_complement_target?: boolean
          offer_id: string
          product_id: string
          quantity?: number
          sort_order?: number
          updated_at?: string
          variant_id?: string | null
          variant_scope?: Database["public"]["Enums"]["bundle_variant_scope"]
        }
        Update: {
          created_at?: string
          id?: string
          is_anchor?: boolean
          is_complement_target?: boolean
          offer_id?: string
          product_id?: string
          quantity?: number
          sort_order?: number
          updated_at?: string
          variant_id?: string | null
          variant_scope?: Database["public"]["Enums"]["bundle_variant_scope"]
        }
        Relationships: [
          {
            foreignKeyName: "bundle_offer_items_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "bundle_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_offer_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_offer_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      bundle_offers: {
        Row: {
          add_to_cart_count: number
          allow_stack_with_coupon: boolean
          conversions: number
          created_at: string
          discount_total: number
          discount_type: Database["public"]["Enums"]["bundle_discount_type"]
          discount_value: number
          ends_at: string | null
          id: string
          impressions: number
          is_active: boolean
          name: string
          product_id: string
          revenue_total: number
          sort_order: number
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          add_to_cart_count?: number
          allow_stack_with_coupon?: boolean
          conversions?: number
          created_at?: string
          discount_total?: number
          discount_type?: Database["public"]["Enums"]["bundle_discount_type"]
          discount_value?: number
          ends_at?: string | null
          id?: string
          impressions?: number
          is_active?: boolean
          name: string
          product_id: string
          revenue_total?: number
          sort_order?: number
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          add_to_cart_count?: number
          allow_stack_with_coupon?: boolean
          conversions?: number
          created_at?: string
          discount_total?: number
          discount_type?: Database["public"]["Enums"]["bundle_discount_type"]
          discount_value?: number
          ends_at?: string | null
          id?: string
          impressions?: number
          is_active?: boolean
          name?: string
          product_id?: string
          revenue_total?: number
          sort_order?: number
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bundle_offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          metadata: Json
          product_id: string
          quantity: number
          unit_price: number
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          metadata?: Json
          product_id: string
          quantity: number
          unit_price: number
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          product_id?: string
          quantity?: number
          unit_price?: number
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          coupon_code: string | null
          created_at: string
          currency: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["cart_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["cart_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["cart_status"]
          updated_at?: string
          user_id?: string
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
      companies: {
        Row: {
          cnpj: string
          created_at: string
          email: string | null
          id: string
          is_default: boolean
          legal_name: string
          municipal_registration: string | null
          phone: string | null
          state_registration: string | null
          trade_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cnpj: string
          created_at?: string
          email?: string | null
          id?: string
          is_default?: boolean
          legal_name: string
          municipal_registration?: string | null
          phone?: string | null
          state_registration?: string | null
          trade_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cnpj?: string
          created_at?: string
          email?: string | null
          id?: string
          is_default?: boolean
          legal_name?: string
          municipal_registration?: string | null
          phone?: string | null
          state_registration?: string | null
          trade_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          amount: number
          coupon_id: string
          created_at: string
          id: string
          order_id: string
          user_id: string
        }
        Insert: {
          amount: number
          coupon_id: string
          created_at?: string
          id?: string
          order_id: string
          user_id: string
        }
        Update: {
          amount?: number
          coupon_id?: string
          created_at?: string
          id?: string
          order_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          max_uses_per_user: number | null
          min_order_amount: number
          starts_at: string | null
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at: string
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_order_amount?: number
          starts_at?: string | null
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          value?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_order_amount?: number
          starts_at?: string | null
          type?: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          city: string
          company_id: string | null
          complement: string | null
          country: string
          created_at: string
          district: string
          id: string
          is_default_billing: boolean
          is_default_shipping: boolean
          kind: Database["public"]["Enums"]["address_kind"]
          label: string | null
          number: string
          recipient_document: string | null
          recipient_name: string
          reference: string | null
          state: string
          street: string
          updated_at: string
          user_id: string
          zip: string
        }
        Insert: {
          city: string
          company_id?: string | null
          complement?: string | null
          country?: string
          created_at?: string
          district: string
          id?: string
          is_default_billing?: boolean
          is_default_shipping?: boolean
          kind?: Database["public"]["Enums"]["address_kind"]
          label?: string | null
          number: string
          recipient_document?: string | null
          recipient_name: string
          reference?: string | null
          state: string
          street: string
          updated_at?: string
          user_id: string
          zip: string
        }
        Update: {
          city?: string
          company_id?: string | null
          complement?: string | null
          country?: string
          created_at?: string
          district?: string
          id?: string
          is_default_billing?: boolean
          is_default_shipping?: boolean
          kind?: Database["public"]["Enums"]["address_kind"]
          label?: string | null
          number?: string
          recipient_document?: string | null
          recipient_name?: string
          reference?: string | null
          state?: string
          street?: string
          updated_at?: string
          user_id?: string
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_logs: {
        Row: {
          action: string
          created_at: string
          error_message: string | null
          id: string
          order_id: string | null
          provider: string
          request: Json | null
          response: Json | null
          status_code: number | null
          success: boolean
        }
        Insert: {
          action: string
          created_at?: string
          error_message?: string | null
          id?: string
          order_id?: string | null
          provider: string
          request?: Json | null
          response?: Json | null
          status_code?: number | null
          success?: boolean
        }
        Update: {
          action?: string
          created_at?: string
          error_message?: string | null
          id?: string
          order_id?: string | null
          provider?: string
          request?: Json | null
          response?: Json | null
          status_code?: number | null
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "integration_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
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
      order_addresses: {
        Row: {
          city: string
          complement: string | null
          country: string
          created_at: string
          district: string
          email: string | null
          id: string
          kind: Database["public"]["Enums"]["address_kind"]
          number: string
          order_id: string
          phone: string | null
          recipient_document: string | null
          recipient_name: string
          reference: string | null
          state: string
          street: string
          zip: string
        }
        Insert: {
          city: string
          complement?: string | null
          country?: string
          created_at?: string
          district: string
          email?: string | null
          id?: string
          kind: Database["public"]["Enums"]["address_kind"]
          number: string
          order_id: string
          phone?: string | null
          recipient_document?: string | null
          recipient_name: string
          reference?: string | null
          state: string
          street: string
          zip: string
        }
        Update: {
          city?: string
          complement?: string | null
          country?: string
          created_at?: string
          district?: string
          email?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["address_kind"]
          number?: string
          order_id?: string
          phone?: string | null
          recipient_document?: string | null
          recipient_name?: string
          reference?: string | null
          state?: string
          street?: string
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_addresses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_files: {
        Row: {
          created_at: string
          id: string
          mime_type: string | null
          order_id: string
          order_item_id: string | null
          original_name: string
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_notes: string | null
          size_bytes: number | null
          status: Database["public"]["Enums"]["file_status"]
          storage_path: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          mime_type?: string | null
          order_id: string
          order_item_id?: string | null
          original_name: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          size_bytes?: number | null
          status?: Database["public"]["Enums"]["file_status"]
          storage_path: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          id?: string
          mime_type?: string | null
          order_id?: string
          order_item_id?: string | null
          original_name?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          size_bytes?: number | null
          status?: Database["public"]["Enums"]["file_status"]
          storage_path?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_files_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_files_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          discount: number
          id: string
          metadata: Json
          order_id: string
          product_id: string
          product_name: string
          product_sku: string | null
          quantity: number
          requires_art: boolean
          subtotal: number
          unit_price: number
          variant_id: string | null
          variant_label: string | null
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          discount?: number
          id?: string
          metadata?: Json
          order_id: string
          product_id: string
          product_name: string
          product_sku?: string | null
          quantity: number
          requires_art?: boolean
          subtotal: number
          unit_price: number
          variant_id?: string | null
          variant_label?: string | null
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          discount?: number
          id?: string
          metadata?: Json
          order_id?: string
          product_id?: string
          product_name?: string
          product_sku?: string | null
          quantity?: number
          requires_art?: boolean
          subtotal?: number
          unit_price?: number
          variant_id?: string | null
          variant_label?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          comment: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: string
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_by?: string | null
          comment?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_by?: string | null
          comment?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          order_id?: string
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancelled_at: string | null
          company_id: string | null
          coupon_code: string | null
          created_at: string
          currency: string
          customer_notes: string | null
          delivered_at: string | null
          discount_total: number
          id: string
          internal_notes: string | null
          metadata: Json
          order_number: string
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          requires_art: boolean
          shipped_at: string | null
          shipping_carrier: string | null
          shipping_deadline_days: number | null
          shipping_quote_id: string | null
          shipping_service: string | null
          shipping_total: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_total: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          company_id?: string | null
          coupon_code?: string | null
          created_at?: string
          currency?: string
          customer_notes?: string | null
          delivered_at?: string | null
          discount_total?: number
          id?: string
          internal_notes?: string | null
          metadata?: Json
          order_number?: string
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          requires_art?: boolean
          shipped_at?: string | null
          shipping_carrier?: string | null
          shipping_deadline_days?: number | null
          shipping_quote_id?: string | null
          shipping_service?: string | null
          shipping_total?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          company_id?: string | null
          coupon_code?: string | null
          created_at?: string
          currency?: string
          customer_notes?: string | null
          delivered_at?: string | null
          discount_total?: number
          id?: string
          internal_notes?: string | null
          metadata?: Json
          order_number?: string
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          requires_art?: boolean
          shipped_at?: string | null
          shipping_carrier?: string | null
          shipping_deadline_days?: number | null
          shipping_quote_id?: string | null
          shipping_service?: string | null
          shipping_total?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_total?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          created_at: string
          event_key: string
          event_type: string | null
          id: string
          payload: Json
          payment_id: string | null
          provider: string
        }
        Insert: {
          created_at?: string
          event_key: string
          event_type?: string | null
          id?: string
          payload?: Json
          payment_id?: string | null
          provider?: string
        }
        Update: {
          created_at?: string
          event_key?: string
          event_type?: string | null
          id?: string
          payload?: Json
          payment_id?: string | null
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          external_id: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"] | null
          order_id: string
          preference_id: string | null
          provider: string
          raw: Json
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          external_id?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"] | null
          order_id: string
          preference_id?: string | null
          provider?: string
          raw?: Json
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          external_id?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"] | null
          order_id?: string
          preference_id?: string | null
          provider?: string
          raw?: Json
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
          height_cm: number | null
          height_mm: number | null
          id: string
          insurance_value: number | null
          is_active: boolean
          is_kit: boolean
          legacy_id: number | null
          length_cm: number | null
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
          stock_mode: string
          stock_quantity: number | null
          units_per_pack: number
          updated_at: string
          weight_kg: number | null
          width_cm: number | null
          width_mm: number | null
        }
        Insert: {
          additional_images?: string[] | null
          cost_price?: number | null
          created_at?: string
          ean?: string | null
          height_cm?: number | null
          height_mm?: number | null
          id?: string
          insurance_value?: number | null
          is_active?: boolean
          is_kit?: boolean
          legacy_id?: number | null
          length_cm?: number | null
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
          stock_mode?: string
          stock_quantity?: number | null
          units_per_pack?: number
          updated_at?: string
          weight_kg?: number | null
          width_cm?: number | null
          width_mm?: number | null
        }
        Update: {
          additional_images?: string[] | null
          cost_price?: number | null
          created_at?: string
          ean?: string | null
          height_cm?: number | null
          height_mm?: number | null
          id?: string
          insurance_value?: number | null
          is_active?: boolean
          is_kit?: boolean
          legacy_id?: number | null
          length_cm?: number | null
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
          stock_mode?: string
          stock_quantity?: number | null
          units_per_pack?: number
          updated_at?: string
          weight_kg?: number | null
          width_cm?: number | null
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
          height_cm: number | null
          height_mm: number | null
          id: string
          imported_at: string | null
          included_items: string | null
          insurance_value: number | null
          is_available: boolean
          legacy_id: number | null
          legacy_store_id: number | null
          length_cm: number | null
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
          sells_by_kit: boolean
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
          width_cm: number | null
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
          height_cm?: number | null
          height_mm?: number | null
          id?: string
          imported_at?: string | null
          included_items?: string | null
          insurance_value?: number | null
          is_available?: boolean
          legacy_id?: number | null
          legacy_store_id?: number | null
          length_cm?: number | null
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
          sells_by_kit?: boolean
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
          width_cm?: number | null
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
          height_cm?: number | null
          height_mm?: number | null
          id?: string
          imported_at?: string | null
          included_items?: string | null
          insurance_value?: number | null
          is_available?: boolean
          legacy_id?: number | null
          legacy_store_id?: number | null
          length_cm?: number | null
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
          sells_by_kit?: boolean
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
          width_cm?: number | null
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
          birth_date: string | null
          cpf: string | null
          created_at: string
          customer_type: Database["public"]["Enums"]["customer_type"]
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          customer_type?: Database["public"]["Enums"]["customer_type"]
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          customer_type?: Database["public"]["Enums"]["customer_type"]
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
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
      shipments: {
        Row: {
          carrier: string | null
          created_at: string
          delivered_at: string | null
          external_id: string | null
          id: string
          label_url: string | null
          order_id: string
          posted_at: string | null
          provider: string
          raw: Json
          service: string | null
          status: string
          tracking_code: string | null
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          external_id?: string | null
          id?: string
          label_url?: string | null
          order_id: string
          posted_at?: string | null
          provider?: string
          raw?: Json
          service?: string | null
          status?: string
          tracking_code?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          carrier?: string | null
          created_at?: string
          delivered_at?: string | null
          external_id?: string | null
          id?: string
          label_url?: string | null
          order_id?: string
          posted_at?: string | null
          provider?: string
          raw?: Json
          service?: string | null
          status?: string
          tracking_code?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_quotes: {
        Row: {
          carrier: string
          cart_id: string | null
          created_at: string
          deadline_days: number
          destination_zip: string
          expires_at: string | null
          id: string
          order_id: string | null
          origin_zip: string
          price: number
          provider: string
          quote_token: string | null
          raw: Json
          service_id: string
          service_name: string
          user_id: string | null
        }
        Insert: {
          carrier: string
          cart_id?: string | null
          created_at?: string
          deadline_days: number
          destination_zip: string
          expires_at?: string | null
          id?: string
          order_id?: string | null
          origin_zip: string
          price: number
          provider?: string
          quote_token?: string | null
          raw?: Json
          service_id: string
          service_name: string
          user_id?: string | null
        }
        Update: {
          carrier?: string
          cart_id?: string | null
          created_at?: string
          deadline_days?: number
          destination_zip?: string
          expires_at?: string | null
          id?: string
          order_id?: string | null
          origin_zip?: string
          price?: number
          provider?: string
          quote_token?: string | null
          raw?: Json
          service_id?: string
          service_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shipping_quotes_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_quotes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
      next_order_number: { Args: never; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      address_kind: "shipping" | "billing" | "both"
      app_role: "admin" | "editor" | "viewer"
      availability_status:
        | "in_stock"
        | "out_of_stock"
        | "preorder"
        | "discontinued"
        | "made_to_order"
      bundle_discount_type:
        | "percent"
        | "fixed"
        | "fixed_price"
        | "complement_percent"
        | "complement_fixed"
      bundle_variant_scope: "any" | "specific" | "any_kit"
      cart_status: "active" | "converted" | "abandoned"
      compatibility_type:
        | "printer"
        | "marketplace"
        | "ribbon"
        | "label"
        | "software"
        | "device"
        | "brand"
        | "other"
      coupon_type: "percent" | "fixed" | "free_shipping"
      customer_type: "pf" | "pj"
      file_status:
        | "enviado"
        | "em_analise"
        | "aprovado"
        | "rejeitado"
        | "correcao_solicitada"
      image_type:
        | "main"
        | "gallery"
        | "variant"
        | "lifestyle"
        | "technical"
        | "packaging"
      import_action: "create" | "update" | "skip" | "error" | "link" | "enrich"
      import_status: "success" | "warning" | "error"
      order_status:
        | "draft"
        | "aguardando_pagamento"
        | "pago"
        | "em_preparacao"
        | "aguardando_arte"
        | "arte_aprovada"
        | "em_producao"
        | "enviado"
        | "entregue"
        | "cancelado"
        | "estornado"
      payment_method: "pix" | "boleto" | "credit_card" | "debit_card" | "other"
      payment_status:
        | "pending"
        | "in_process"
        | "approved"
        | "authorized"
        | "rejected"
        | "refunded"
        | "cancelled"
        | "charged_back"
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
      address_kind: ["shipping", "billing", "both"],
      app_role: ["admin", "editor", "viewer"],
      availability_status: [
        "in_stock",
        "out_of_stock",
        "preorder",
        "discontinued",
        "made_to_order",
      ],
      bundle_discount_type: [
        "percent",
        "fixed",
        "fixed_price",
        "complement_percent",
        "complement_fixed",
      ],
      bundle_variant_scope: ["any", "specific", "any_kit"],
      cart_status: ["active", "converted", "abandoned"],
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
      coupon_type: ["percent", "fixed", "free_shipping"],
      customer_type: ["pf", "pj"],
      file_status: [
        "enviado",
        "em_analise",
        "aprovado",
        "rejeitado",
        "correcao_solicitada",
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
      order_status: [
        "draft",
        "aguardando_pagamento",
        "pago",
        "em_preparacao",
        "aguardando_arte",
        "arte_aprovada",
        "em_producao",
        "enviado",
        "entregue",
        "cancelado",
        "estornado",
      ],
      payment_method: ["pix", "boleto", "credit_card", "debit_card", "other"],
      payment_status: [
        "pending",
        "in_process",
        "approved",
        "authorized",
        "rejected",
        "refunded",
        "cancelled",
        "charged_back",
      ],
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
