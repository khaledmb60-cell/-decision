import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { RolePermission, Resource } from '@/types'
import { buildPermissionMap } from '@/utils/permissions'

type PermMap = Record<Resource, { view: boolean; create: boolean; edit: boolean; delete: boolean }>

export function usePermissions() {
  const { profile, tenant } = useAuth()
  const [permMap, setPermMap] = useState<PermMap | null>(null)

  useEffect(() => {
    if (!profile || !tenant) return

    supabase
      .from('role_permissions')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('role', profile.role)
      .then(({ data }) => {
        setPermMap(buildPermissionMap(profile.role, (data ?? []) as RolePermission[]))
      })
  }, [profile, tenant])

  function can(resource: Resource, action: 'view' | 'create' | 'edit' | 'delete') {
    if (!profile) return false
    return permMap?.[resource]?.[action] ?? false
  }

  return { permMap, can }
}
