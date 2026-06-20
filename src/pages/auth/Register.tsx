import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { BusinessType } from '@/types'
import toast from 'react-hot-toast'

const businessTypeOptions = [
  { value: 'nursery',      label: 'Nursery' },
  { value: 'construction', label: 'Construction Company' },
  { value: 'car_wash',     label: 'Car Wash' },
  { value: 'laundry',      label: 'Laundry' },
  { value: 'logistics',    label: 'Logistics' },
]

export function Register() {
  const navigate = useNavigate()
  const [step, setStep]   = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)

  // Step 1: Business info
  const [bizName, setBizName]       = useState('')
  const [bizType, setBizType]       = useState<BusinessType>('nursery')
  const [currency, setCurrency]     = useState('USD')

  // Step 2: Owner account
  const [fullName, setFullName]     = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (step === 1) { setStep(2); return }

    setLoading(true)
    try {
      // 1. Create auth user
      const { data: authData, error: authErr } = await supabase.auth.signUp({ email, password })
      if (authErr) throw authErr
      const userId = authData.user?.id
      if (!userId) throw new Error('User creation failed')

      // 2. Create tenant
      const slug = bizName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Math.random().toString(36).slice(2, 6)
      const { data: tenant, error: tenantErr } = await supabase
        .from('tenants')
        .insert({ name: bizName, slug, business_type: bizType, currency })
        .select()
        .single()
      if (tenantErr) throw tenantErr

      // 3. Create profile
      const { error: profileErr } = await supabase
        .from('profiles')
        .insert({ id: userId, tenant_id: tenant.id, full_name: fullName, email, role: 'owner' })
      if (profileErr) throw profileErr

      // 4. Seed default permissions
      await supabase.rpc('seed_default_permissions', { p_tenant_id: tenant.id })

      toast.success('Account created! Please check your email to verify.')
      navigate('/login')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <span className="text-white font-bold text-3xl">G</span>
          </div>
          <h1 className="text-3xl font-bold text-white">GrowCore</h1>
          <p className="text-primary-300 mt-1">Start your free workspace</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Steps */}
          <div className="flex items-center mb-6">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step >= s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-400'
                }`}>{s}</div>
                {s < 2 && <div className={`h-0.5 w-12 mx-2 ${step > 1 ? 'bg-primary-500' : 'bg-gray-200'}`} />}
              </div>
            ))}
            <p className="ml-4 text-sm text-gray-500">
              {step === 1 ? 'Business info' : 'Your account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 ? (
              <>
                <Input label="Business Name" value={bizName} onChange={e => setBizName(e.target.value)} placeholder="Acme Corp" required />
                <Select
                  label="Business Type"
                  value={bizType}
                  onChange={e => setBizType(e.target.value as BusinessType)}
                  options={businessTypeOptions}
                />
                <Select
                  label="Currency"
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  options={[
                    { value: 'USD', label: 'USD - US Dollar' },
                    { value: 'EUR', label: 'EUR - Euro' },
                    { value: 'GBP', label: 'GBP - British Pound' },
                    { value: 'SAR', label: 'SAR - Saudi Riyal' },
                    { value: 'AED', label: 'AED - UAE Dirham' },
                  ]}
                />
              </>
            ) : (
              <>
                <Input label="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="John Smith" required />
                <Input label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@company.com" required />
                <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" required minLength={8} />
              </>
            )}

            <div className="flex gap-3 pt-2">
              {step === 2 && (
                <Button type="button" variant="secondary" onClick={() => setStep(1)} className="flex-1 justify-center">Back</Button>
              )}
              <Button type="submit" loading={loading} className="flex-1 justify-center">
                {step === 1 ? 'Next' : 'Create Account'}
              </Button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:text-primary-700">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
