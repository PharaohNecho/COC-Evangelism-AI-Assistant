
export enum HungerLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export enum UserRole {
  SUPER_ADMIN = 'SuperAdmin',
  ADMIN = 'Admin',
  TEAM_MEMBER = 'Team Member'
}

export enum UserStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected'
}

export interface AIReview {
  hungerLevel: HungerLevel;
  suggestedVerse: string;
  suggestedNextAction: string;
  summary: string;
}

export interface FollowUp {
  id: string;
  date: string;
  notes: string;
  preacherName: string;
}

export interface Prospect {
  id: string;
  name: string;
  phone: string;
  manualAddress?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  photoUrl?: string;
  preachingNotes: string;
  aiReview?: AIReview;
  followUps: FollowUp[];
  timestamp: string;
  preacherName: string;
  status: 'New' | 'Followed Up' | 'Member';
  signifiedForBaptism: boolean;
  assignedToUserId?: string;
  assignedToUserName?: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  status: UserStatus;
  password?: string;
  createdAt: string;
  phone?: string;
  photoUrl?: string;
  team?: string;
  hasSeenTour?: boolean;
}
