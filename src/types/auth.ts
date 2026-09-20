export interface UserPreferences {
  hasCompletedSurvey?: boolean;
  portion?: "1" | "2" | "3-4" | "5+";
  cuisines?: string[];
  healthGoal?: "healthy" | "loss" | "muscle" | "budget";
  restrictions?: string[];
  tasteProfile?: string[];
  cookingTime?: "quick" | "medium" | "standard" | "slow";
  updatedAt?: string;
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  avatar?: string;
  role?: string;
  chefExp?: number;
  level?: string;
  preferences?: UserPreferences;
}

export type StoredUser = User;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponseData {
  user: User;
  tokens?: AuthTokens;
  accessToken?: string;
  refreshToken?: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SurveyPayload {
  portion?: "1" | "2" | "3-4" | "5+";
  cuisines?: string[];
  healthGoal?: "healthy" | "loss" | "muscle" | "budget";
  restrictions?: string[];
  tasteProfile?: string[];
  cookingTime?: "quick" | "medium" | "standard" | "slow";
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  avatar?: string;
}
