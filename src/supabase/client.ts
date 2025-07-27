// src/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wgshggokdkopnoutsizz.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indnc2hnZ29rZGtvcG5vdXRzaXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwOTQ4MjksImV4cCI6MjA2ODY3MDgyOX0.3h2LCvSJyjYASa9nVG2hNAv5x2SPdiwR1lJDmHtZHQw'

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
)
