export interface IServiceCard {
  id: string;
  icon: string;
  title: string;
  description: string;
  features: string[];
  badge?: string;
  comingSoon?: boolean;
}
