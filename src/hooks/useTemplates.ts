import { useEffect, useState } from 'react'
import { supabase } from '../supabase/client'

export function useTemplates() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTemplates() {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) console.error('Error fetching templates:', error)
      else setTemplates(data || [])

      setLoading(false)
    }

    fetchTemplates()
  }, [])

  return { templates, loading }
}
