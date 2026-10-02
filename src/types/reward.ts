export type RewardType = "voucher" | "recipe_vip" | "badge";

export interface RewardCatalogItem {
  id: string;
  title: string;
  brand: string;
  description: string;
  discountValue: string;
  xpCost: number;
  type: RewardType;
  icon: string;
  badgeColor: string;
}

export interface ClaimedReward {
  id: string;
  title: string;
  description: string;
  code: string;
  discountValue: string;
  type: RewardType;
  claimedAt: string;
  expiresAt: string;
  isUsed: boolean;
}

export interface RewardStatus {
  chefExp: number;
  level: string;
  streakDays: number;
  hasCheckedInToday: boolean;
  streakRewards: number[];
  catalog: RewardCatalogItem[];
  claimedRewards: ClaimedReward[];
}

export interface CheckInResult {
  message: string;
  xpGained: number;
  chefExp: number;
  level: string;
  streakDays: number;
  hasCheckedInToday: boolean;
}

export interface RedeemResult {
  message: string;
  reward: ClaimedReward;
  remainingExp: number;
}
