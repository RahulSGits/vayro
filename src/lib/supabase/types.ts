/**
 * Minimal typed surface for the VAYRO schema. Regenerate the full definition
 * with `npx supabase gen types typescript --linked > src/lib/supabase/types.ts`
 * once a project is linked; this hand-written stub keeps the app type-safe and
 * buildable before that happens.
 */
export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: Record<string, {
      Row: Record<string, Json>;
      Insert: Record<string, Json>;
      Update: Record<string, Json>;
      Relationships: [];
    }>;
    Views: Record<string, { Row: Record<string, Json> }>;
    Functions: Record<string, { Args: Record<string, Json>; Returns: Json }>;
    Enums: {
      order_status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
      product_status: 'draft' | 'published' | 'archived';
      user_role: 'customer' | 'admin';
    };
    CompositeTypes: Record<string, never>;
  };
}
