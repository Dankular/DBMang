-- Supabase Migration: Create tables for DBMang
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)

-- Database instances table
CREATE TABLE IF NOT EXISTS database_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    description TEXT DEFAULT '',
    region VARCHAR(50) DEFAULT 'us-east-1',
    status VARCHAR(20) DEFAULT 'pending',
    username VARCHAR(255),
    password VARCHAR(255),
    host VARCHAR(255),
    port INT,
    database_name VARCHAR(255),
    connection_string TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Database tables metadata
CREATE TABLE IF NOT EXISTS database_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    database_id UUID NOT NULL REFERENCES database_instances(id) ON DELETE CASCADE,
    table_name VARCHAR(255) NOT NULL,
    schema_definition TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(database_id, table_name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_instances_name ON database_instances(name);
CREATE INDEX IF NOT EXISTS idx_instances_type ON database_instances(type);
CREATE INDEX IF NOT EXISTS idx_instances_status ON database_instances(status);
CREATE INDEX IF NOT EXISTS idx_tables_database_id ON database_tables(database_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_database_instances_updated_at
    BEFORE UPDATE ON database_instances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (allow all for anon key - public app)
ALTER TABLE database_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_tables ENABLE ROW LEVEL SECURITY;

-- Policies: allow full access via anon key
CREATE POLICY "Allow full access to database_instances" ON database_instances
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow full access to database_tables" ON database_tables
    FOR ALL USING (true) WITH CHECK (true);
