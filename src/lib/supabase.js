import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Standard Client: Configured for PWA Persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,       // Essential for PWAs
    autoRefreshToken: true,     // Keeps the session alive in the background
    detectSessionInUrl: true,   // Helpful for magic links/social auth
    storageKey: 'easyorder-auth', // Unique key for your app's local storage
    storage: window.localStorage // Explicitly use browser local storage
  }
});

// Admin Client: Remains stateless for secure server-side/service-role tasks
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});