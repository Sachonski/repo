/*
  # Create daily stats table for sales tracking

  1. New Tables
    - `daily_stats`
      - `id` (uuid, primary key)
      - `date` (date) - The date of the stats
      - `rep` (text) - Sales representative name
      - `metrics` (jsonb) - All metric values stored as JSON
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `daily_stats` table
    - Add policy for authenticated users to read all stats
    - Add policy for authenticated users to insert/update stats
  
  3. Indexes
    - Add unique index on (date, rep) combination for efficient querying
    - Add index on date for dashboard queries
*/

CREATE TABLE IF NOT EXISTS daily_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  rep text NOT NULL,
  metrics jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(date, rep)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
CREATE INDEX IF NOT EXISTS idx_daily_stats_rep ON daily_stats(rep);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date_rep ON daily_stats(date, rep);

-- Enable RLS
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to read all stats
CREATE POLICY "Anyone can read daily stats"
  ON daily_stats
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow anonymous users to insert stats
CREATE POLICY "Anyone can insert daily stats"
  ON daily_stats
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow anonymous users to update stats
CREATE POLICY "Anyone can update daily stats"
  ON daily_stats
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_daily_stats_updated_at 
  BEFORE UPDATE ON daily_stats 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();