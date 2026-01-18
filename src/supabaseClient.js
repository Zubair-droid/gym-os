import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 👇 ADD THESE DEBUG LOGS
console.log("----------------DEBUG----------------");
console.log("Trying to connect to URL:", supabaseUrl);
console.log("Is Key present?:", supabaseKey ? "YES" : "NO");
console.log("-------------------------------------");

export const supabase = createClient(supabaseUrl, supabaseKey)