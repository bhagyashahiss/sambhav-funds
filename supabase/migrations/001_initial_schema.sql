-- ============================================
-- Sambhav Shanti Yuva Group - Fund Management
-- Database Schema & Seed Data
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Members table
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  auth_user_id UUID UNIQUE REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense Items Master (reusable line item names)
CREATE TABLE expense_items_master (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT,
  donor_name TEXT,
  created_by UUID NOT NULL REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event Expense Lines (bifurcation of expense transactions)
CREATE TABLE event_expense_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_events_category ON events(category_id);
CREATE INDEX idx_events_date ON events(date DESC);
CREATE INDEX idx_transactions_event ON transactions(event_id);
CREATE INDEX idx_transactions_member ON transactions(member_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_expense_lines_txn ON event_expense_lines(transaction_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_items_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_expense_lines ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members
    WHERE auth_user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- MEMBERS: Everyone can read, only admin can modify
CREATE POLICY "members_select" ON members FOR SELECT TO authenticated USING (true);
CREATE POLICY "members_insert" ON members FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "members_update" ON members FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "members_delete" ON members FOR DELETE TO authenticated USING (is_admin());

-- CATEGORIES: Everyone can read, only admin can modify
CREATE POLICY "categories_select" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_insert" ON categories FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "categories_update" ON categories FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "categories_delete" ON categories FOR DELETE TO authenticated USING (is_admin());

-- EVENTS: Everyone can read, only admin can modify
CREATE POLICY "events_select" ON events FOR SELECT TO authenticated USING (true);
CREATE POLICY "events_insert" ON events FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "events_update" ON events FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "events_delete" ON events FOR DELETE TO authenticated USING (is_admin());

-- EXPENSE ITEMS MASTER: Everyone can read, only admin can modify
CREATE POLICY "expense_items_select" ON expense_items_master FOR SELECT TO authenticated USING (true);
CREATE POLICY "expense_items_insert" ON expense_items_master FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "expense_items_update" ON expense_items_master FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "expense_items_delete" ON expense_items_master FOR DELETE TO authenticated USING (is_admin());

-- TRANSACTIONS: Everyone can read, only admin can modify
CREATE POLICY "transactions_select" ON transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "transactions_insert" ON transactions FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "transactions_update" ON transactions FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "transactions_delete" ON transactions FOR DELETE TO authenticated USING (is_admin());

-- EVENT EXPENSE LINES: Everyone can read, only admin can modify
CREATE POLICY "expense_lines_select" ON event_expense_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "expense_lines_insert" ON event_expense_lines FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "expense_lines_update" ON event_expense_lines FOR UPDATE TO authenticated USING (is_admin());
CREATE POLICY "expense_lines_delete" ON event_expense_lines FOR DELETE TO authenticated USING (is_admin());

-- ============================================
-- SEED DATA
-- ============================================

-- Common categories for a Jain youth organization
INSERT INTO categories (name, description) VALUES
  ('Bhakti', 'Religious devotional events and puja'),
  ('Seva', 'Community service and volunteer activities'),
  ('Shiksha', 'Educational and learning programs'),
  ('Utsav', 'Celebrations and festivals'),
  ('Samaj Seva', 'Social welfare and charity'),
  ('Sangh', 'Organization meetings and administration'),
  ('Pravas', 'Trips and pilgrimages');

-- Common expense items
INSERT INTO expense_items_master (name) VALUES
  ('Diva'),
  ('Prabhavna'),
  ('Lucky Draw'),
  ('Decoration'),
  ('Sound System'),
  ('Food & Snacks'),
  ('Transportation'),
  ('Printing'),
  ('Gifts & Prizes'),
  ('Venue Rent'),
  ('Photography'),
  ('Flowers & Garlands'),
  ('Pooja Material'),
  ('Stationery');
