import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

export type Council = {
  id: string;
  name: string;
  created_at: string;
};

export type CouncilAdmin = {
  id: string;
  user_id: string;
  council_id: string | null;
  role: 'admin' | 'superuser';
  created_at: string;
};

export type Event = {
  id: string;
  name: string;
  emoji: string;
  is_active: boolean;
  ends_at: string;
  created_at: string;
  council_id: string;
};

export type Volunteer = {
  id: string;
  event_id: string;
  full_name: string;
  has_volunteered_before: boolean;
  created_at: string;
};

