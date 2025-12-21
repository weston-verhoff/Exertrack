import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY

const missingVars = [
  !SUPABASE_URL ? 'REACT_APP_SUPABASE_URL' : null,
  !SUPABASE_ANON_KEY ? 'REACT_APP_SUPABASE_ANON_KEY' : null,
].filter(Boolean)

export const supabase: SupabaseClient =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : new Proxy({} as SupabaseClient, {
        get() {
          const error = new Error(
            `Missing Supabase environment variables: ${missingVars.join(
              ', '
            )}. Set them in your .env file and restart the dev server so Create React App can pick them up.`
          )
          console.error(error)
          throw error
        },
      })
