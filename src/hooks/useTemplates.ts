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

      const fetchRows = (filterArchived: boolean, orderColumn: 'sort_order' | 'created_at') => {
        let query = supabase
          .from('templates')
          .select('*')
          .eq('user_id', userId)

        if (filterArchived) query = query.is('archived_at', null)
        return query.order(orderColumn, { ascending: orderColumn === 'sort_order' })
      }

      let { data, error } = await fetchRows(true, 'sort_order')
      if (error?.code === '42703' && error.message.includes('archived_at')) {
        const fallbackResult = await fetchRows(false, 'created_at')
        data = fallbackResult.data
        error = fallbackResult.error
      } else if (error?.code === '42703' && error.message.includes('sort_order')) {
        const fallbackResult = await fetchRows(true, 'created_at')
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
