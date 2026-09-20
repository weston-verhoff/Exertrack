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

      const fetchRows = (filterArchived: boolean) => {
        let query = supabase
          .from('templates')
          .select('*')
          .eq('user_id', userId)

        if (filterArchived) query = query.is('archived_at', null)
        return query.order('created_at', { ascending: false })
      }

      let { data, error } = await fetchRows(true)
      if (error?.code === '42703' && error.message.includes('archived_at')) {
        const fallbackResult = await fetchRows(false)
        data = fallbackResult.data
        error = fallbackResult.error
      }

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
