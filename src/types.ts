export interface User {
  id: number;
  email: string;
}

export interface Appliance {
  id: number;
  userId: number;
  name: string;
  powerWatts: number;
  usageHours: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface DashboardStats {
  totalUsage: number;
  estimatedBill: number;
  applianceCount: number;
  highestConsuming: string;
}
