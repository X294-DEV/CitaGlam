import type { Money, UUID } from './index';

/** Solo los campos públicos de TenantConfig; nunca customSettings ni la entidad completa. */
export interface PublicTenantConfigDto {
  primaryColor: string;
  secondaryColor: string | null;
  welcomeMessage: string | null;
  businessCategory: string | null;
}

export interface PublicTenantDto {
  id: UUID;
  name: string;
  slug: string;
  logoUrl: string | null;
  config: PublicTenantConfigDto | null;
}

export interface PublicServiceCategoryDto {
  id: UUID;
  name: string;
  order: number;
}

export interface PublicServiceDto {
  id: UUID;
  name: string;
  description: string | null;
  durationMin: number;
  price: Money;
  imageUrl: string | null;
  color: string | null;
  category: PublicServiceCategoryDto | null;
}
