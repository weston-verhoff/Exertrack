import { useEffect, useState } from 'react'
import { supabase } from '../supabase/client'
import { useAuth } from '../context/AuthContext'

export function useTemplates() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { userId, loading: authLoading } = useAuth()

  useEffect(() => {
    async function fetchTemplates() {
      if (!userId) return

      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) console.error('Error fetching templates:', error)
      else setTemplates(data || [])

      setLoading(false)
    }

    if (authLoading) return

    if (!userId) {
      setTemplates([])
      setLoading(false)
      return
    }

    fetchTemplates()
  }, [authLoading, userId])

  return { templates, loading }
}
