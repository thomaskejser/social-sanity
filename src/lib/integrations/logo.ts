import type { SocialBrand } from '../social-logos/social-logos.ts';

/** A logo from the social-logos set, a product logo kept as an asset, or a generic app icon. */
export type IntegrationLogo =
	| { brand: SocialBrand }
	| { product: 'google-contacts' }
	| { icon: 'claude' | 'repository' | 'blog' };
