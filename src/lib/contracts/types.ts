export type ContractData = {
  id: string;
  tenant_id: string;
  staff: {
    full_name: string;
    email: string;
    job_role: "KITCHEN" | "SERVICE";
    contract_type: "FULL_TIME" | "PART_TIME" | "CASUAL";
    date_of_birth: string;
  };
  tenant: { name: string };
  location: { name: string; address: string | null };
  rate_regular_usd: number;
  ot_policy: {
    basis: "weekly" | "daily" | "both";
    weekly_threshold_h: number;
    daily_threshold_h: number;
    multiplier: number;
    holiday_multiplier: number;
  };
  effective_from: string;
  effective_to: string | null;
  signed_at: string | null;
  signature_image_path: string | null;
};
