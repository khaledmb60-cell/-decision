import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { BusinessType } from '@/types'
import toast from 'react-hot-toast'

const businessTypeOptions = [
  { value: 'nursery',      label: 'Nursery'             },
  { value: 'construction', label: 'Construction Company' },
  { value: 'car_wash',     label: 'Car Wash'            },
  { value: 'laundry',      label: 'Laundry'             },
  { value: 'logistics',    label: 'Logistics'           },
]

const currencyOptions = [
  { value: 'USD', label: 'USD - US Dollar'     },
  { value: 'EUR', label: 'EUR - Euro'          },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'SAR', label: 'SAR - Saudi Riyal'   },
  { value: 'AED', label: 'AED - UAE Dirham'    },
  { value: 'EGP', label: 'EGP - Egyptian Pound'},
  { value: 'KWD', label: 'KWD - Kuwaiti Dinar' },
]

const timezoneOptions = [
  { value: 'UTC',              label: 'UTC'           },
  { value: 'America/New_York', label: 'US Eastern'    },
  { value: 'America/Chicago',  label: 'US Central'    },
  { value: 'America/Denver',   label: 'US Mountain'   },
  { value: 'America/Los_Angeles', label: 'US Pacific' },
  { value: 'Europe/London',    label: 'London'        },
  { value: 'Europe/Paris',     label: 'Paris'         },
  { value: 'Asia/Dubai',       label: 'Dubai'         },
  { value: 'Asia/Riyadh',      label: 'Riyadh'        },
  { value: 'Asia/Kuwait',      label: 'Kuwait'        },
  { value: 'Africa/Cairo',     label: 'Cairo'         },
]

export function Settings() {
  const { tenant, profile, refreshProfile } = useAuth()
  const [bizForm, setBizForm] = useState({ name: '', business_type: 'nursery' as BusinessType, currency: 'USD', timezone: 'UTC' })
  const [profForm, setProfForm] = useState({ full_name: '', email: '' })
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [bizSaving, setBizSaving]   = useState(false)
  const [profSaving, setProfSaving] = useState(false)
  const [pwSaving, setPwSaving]     = useState(false)

  useEffect(() => {
    if (tenant) setBizForm({ name: tenant.name, business_type: tenant.business_type, currency: tenant.currency, timezone: tenant.timezone })
    if (profile) setProfForm({ full_name: profile.full_name, email: profile.email })
  }, [tenant, profile])

  async function saveBusiness() {
    if (!tenant) return
    setBizSaving(true)
    const { error } = await supabase.from('tenants').update({ ...bizForm }).eq('id', tenant.id)
    if (error) toast.error(error.message)
    else toast.success('Business settings saved')
    setBizSaving(false)
  }

  async function saveProfile() {
    if (!profile) return
    setProfSaving(true)
    const { error } = await supabase.from('profiles').update({ full_name: profForm.full_name }).eq('id', profile.id)
    if (error) toast.error(error.message)
    else { await refreshProfile(); toast.success('Profile updated') }
    setProfSaving(false)
  }

  async function changePassword() {
    if (pwForm.next !== pwForm.confirm) { toast.error('Passwords do not match'); return }
    if (pwForm.next.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: pwForm.next })
    if (error) toast.error(error.message)
    else { toast.success('Password changed'); setPwForm({ current: '', next: '', confirm: '' }) }
    setPwSaving(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Business Settings */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Business Settings</h3>
        <div className="space-y-4">
          <Input
            label="Business Name"
            value={bizForm.name}
            onChange={e => setBizForm(f => ({ ...f, name: e.target.value }))}
          />
          <Select
            label="Business Type"
            value={bizForm.business_type}
            onChange={e => setBizForm(f => ({ ...f, business_type: e.target.value as BusinessType }))}
            options={businessTypeOptions}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Currency"
              value={bizForm.currency}
              onChange={e => setBizForm(f => ({ ...f, currency: e.target.value }))}
              options={currencyOptions}
            />
            <Select
              label="Timezone"
              value={bizForm.timezone}
              onChange={e => setBizForm(f => ({ ...f, timezone: e.target.value }))}
              options={timezoneOptions}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveBusiness} loading={bizSaving}>Save Changes</Button>
          </div>
        </div>
      </Card>

      {/* Profile */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Your Profile</h3>
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={profForm.full_name}
            onChange={e => setProfForm(f => ({ ...f, full_name: e.target.value }))}
          />
          <Input label="Email" value={profForm.email} disabled hint="Email cannot be changed" />
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">{profForm.full_name?.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{profForm.full_name}</p>
              <p className="text-xs text-gray-500 capitalize">{profile?.role}</p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveProfile} loading={profSaving}>Update Profile</Button>
          </div>
        </div>
      </Card>

      {/* Change Password */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Change Password</h3>
        <div className="space-y-4">
          <Input
            label="New Password"
            type="password"
            value={pwForm.next}
            onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
            placeholder="Min. 8 characters"
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={pwForm.confirm}
            onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
            placeholder="Repeat password"
          />
          <div className="flex justify-end">
            <Button onClick={changePassword} loading={pwSaving}>Change Password</Button>
          </div>
        </div>
      </Card>

      {/* Tenant Info */}
      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Workspace Info</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">Workspace ID</span>
            <span className="font-mono text-gray-700">{tenant?.id?.slice(0, 8)}…</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">Slug</span>
            <span className="font-mono text-gray-700">{tenant?.slug}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">Created</span>
            <span className="text-gray-700">{tenant?.created_at ? new Date(tenant.created_at).toLocaleDateString() : '—'}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Status</span>
            <span className={`font-medium ${tenant?.is_active ? 'text-green-600' : 'text-red-600'}`}>
              {tenant?.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}
