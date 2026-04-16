import { createClient } from '@supabase/supabase-js';

// HYPR-STATIONS Supabase project (sa-east-1)
const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL || 'https://lmufoxmlqdliphprnwya.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtdWZveG1scWRsaXBocHJud3lhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMDA1NDYsImV4cCI6MjA5MTg3NjU0Nn0.y4Bpd2x7r5XYgJSqF_mOtr6dBCNzLlmVmisFQqFg3Vo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
