import { SetMetadata } from '@nestjs/common';

export const LIMIT_KEY = 'limit_key';
/**
 * Decorator to specify which subscription limit to check.
 * Values should match keys in SubscriptionPackage.limits JSON.
 * e.g. 'maxBranches', 'maxServices'
 */
export const CheckLimit = (limitKey: string) => SetMetadata(LIMIT_KEY, limitKey);
