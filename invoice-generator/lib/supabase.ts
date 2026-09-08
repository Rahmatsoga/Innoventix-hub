import { createClient } from '@supabase/supabase-js'

const defaultUrl = 'https://ekpngjsfhipdahjhigix.supabase.co'
const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

const supabaseUrl = (envUrl && envUrl.trim().length > 0) ? envUrl.trim() : defaultUrl
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey).trim()

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)