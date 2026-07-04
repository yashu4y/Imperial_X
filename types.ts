export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'image';
  timestamp: Date;
  sources?: { title: string; uri: string }[];
}

export interface ImageHistoryItem {
  id: string;
  prompt: string;
  url: string;
  timestamp: number;
}

export type PlanType = 'free' | 'weekly_pro' | 'monthly_pro' | 'yearly_pro';

export interface User {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  userPlan: PlanType;
  messagesUsed: number;
  imagesUsed?: number; // Tracks number of generated images
  createdAt: string;
  referredBy?: string;
  referralCode: string;
  referralsCount: number;
  earnings: number;
  password?: string; // Stored locally for mock auth demo purposes
}

export interface SystemConfig {
  freeLimit: number;
  maintenanceMode: boolean;
  allowNewRegistrations: boolean;
  systemNotification: string;
}
