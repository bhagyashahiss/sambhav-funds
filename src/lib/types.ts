export type UserRole = "super-admin" | "admin" | "viewer";

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  auth_user_id: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Event {
  id: string;
  category_id: string;
  name: string;
  date: string;
  description: string | null;
  created_at: string;
  // joined
  category?: Category;
}

export interface ExpenseItemMaster {
  id: string;
  name: string;
  created_at: string;
}

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  event_id: string | null;
  member_id: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  donor_name: string | null;
  created_at: string;
  created_by: string;
  // joined
  event?: Event;
  member?: Member;
  expense_lines?: EventExpenseLine[];
}

export interface EventExpenseLine {
  id: string;
  transaction_id: string;
  item_name: string;
  amount: number;
}

// Dashboard summary types
export interface DashboardSummary {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  categorySummaries: CategorySummary[];
  recentTransactions: Transaction[];
}

export interface CategorySummary {
  category: Category;
  income: number;
  expense: number;
  balance: number;
}

export interface MemberBalance {
  member: Member;
  totalCollected: number;
  totalSpent: number;
  holding: number;
}

export interface EventBalance {
  event: Event;
  income: number;
  expense: number;
  balance: number;
}
