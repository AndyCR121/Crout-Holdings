export interface IPricingTier {
  id: string;
  name: string;
  setupFee: number;
  monthlyFrom: number;
  monthlyTo?: number;
  description: string;
  features: string[];
  highlight: boolean;
  badge?: string;
}
