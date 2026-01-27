export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface Brand {
  id: string;
  user_id: string;
  name: string;
  category: string;
  short_description: string;
  logo_url: string | null;
  website_url: string;
  instagram_url: string | null;
  facebook_url: string | null;
  is_active: boolean;
  approval_status: ApprovalStatus;
  rejected_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBrandData {
  name: string;
  category: string;
  short_description: string;
  logo_url?: string;
  website_url: string;
  instagram_url?: string;
  facebook_url?: string;
}

export interface BrandFormData extends CreateBrandData {}
