export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  householdId: string;
  householdName?: string;
}

export interface Account {
  id: string;
  name: string;
  currency: 'ARS' | 'USD';
  balance: number;
  color: string;
  icon: string;
  isActive: boolean;
  _count?: { transactions: number };
}

export interface HouseholdMember {
  id: string;
  name: string;
  isMinor: boolean;
  avatar: string | null;
  notes: string | null;
  _count?: { transactions: number };
}

export interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  avatar: string | null;
  notes: string | null;
  _count?: { transactions: number };
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  icon: string;
  color: string;
  isDefault: boolean;
  subcategories?: Subcategory[];
  _count?: { subcategories: number; transactions: number };
}

export interface Subcategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  categoryId: string;
  isDefault: boolean;
}

export interface Transaction {
  id: string;
  type: 'expense' | 'income';
  amount: number;
  description: string;
  date: string;
  notes: string | null;
  accountId: string;
  categoryId: string;
  subcategoryId: string | null;
  memberId: string | null;
  petId: string | null;
  userId: string | null;
  account?: Account;
  category?: Category;
  subcategory?: Subcategory;
  member?: HouseholdMember;
  pet?: Pet;
  user?: { id: string; name: string } | null;
}

export interface AnalyticsData {
  memberSpending: { memberId: string; memberName: string; totalExpense: number; totalIncome: number; transactions: number }[];
  categoryBreakdown: { categoryId: string; categoryName: string; categoryIcon: string; categoryColor: string; total: number; percentage: number; subcategories: { subcategoryId: string; subcategoryName: string; total: number; percentage: number }[] }[];
  monthlyTrend: { month: string; income: number; expense: number; balance: number }[];
  accountSummary: { accountId: string; accountName: string; currency: string; balance: number; income: number; expense: number }[];
}

export type ViewMode = 'dashboard' | 'accounts' | 'members' | 'categories' | 'transactions' | 'analytics' | 'users' | 'settings';
