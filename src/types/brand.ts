export interface Brand {
  id: string;
  user_id: string;
  name: string;
  logo_url?: string | null;
  short_description: string;
  long_description?: string | null;
  category: string;
  website_url: string;
  instagram_url?: string | null;
  facebook_url?: string | null;
  is_active: boolean;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
}
