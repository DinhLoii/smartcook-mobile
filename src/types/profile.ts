export type HealthGoal = "loss" | "muscle" | "healthy";

export interface GoalOption {
  id: HealthGoal;
  label: string;
  desc: string;
}

export interface ProfileViewProps {
  insetsTop: number;
}
