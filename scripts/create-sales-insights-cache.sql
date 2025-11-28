-- Create sales_insights_cache table for storing weekly sales dashboard data
CREATE TABLE IF NOT EXISTS sales_insights_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  insights_json JSONB NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_insights_generated ON sales_insights_cache(generated_at);
CREATE INDEX IF NOT EXISTS idx_sales_insights_week ON sales_insights_cache(week_start, week_end);

COMMENT ON TABLE sales_insights_cache IS 'Caches weekly sales insights and analytics for the admin sales dashboard';
