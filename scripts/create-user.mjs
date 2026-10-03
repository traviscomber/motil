import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import bcrypt from 'bcrypt'

dotenv.config({ path: '.env.development.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const initialPassword = process.env.MOTIL_INITIAL_PASSWORD
const organizationId = process.env.MOTIL_ORGANIZATION_ID

const email = String(process.argv[2] || '').trim().toLowerCase()
const fullName = String(process.argv[3] || '').trim()
const role = String(process.argv[4] || '').trim()

if (!supabaseUrl || !serviceRoleKey || !initialPassword || !organizationId) {
  console.error('Missing required environment configuration.')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MOTIL_INITIAL_PASSWORD, MOTIL_ORGANIZATION_ID')
  process.exit(1)
}

if (!email || !fullName || !role) {
  console.error('Usage: node scripts/create-user.mjs <email> <full-name> <role>')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function createUser() {
  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) throw listError

  let authUser = existingUsers?.users?.find((user) => user.email?.toLowerCase() === email)
  const creatingIdentity = !authUser

  if (!authUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: initialPassword,
      email_confirm: true,
    })
    if (error) throw error
    authUser = data.user
  }

  if (!authUser?.id) throw new Error('Auth identity could not be resolved')

  const profilePayload = {
    id: authUser.id,
    email,
    full_name: fullName,
    role,
    organization_id: organizationId,
    status: 'active',
  }

  if (creatingIdentity) {
    profilePayload.password_hash = await bcrypt.hash(initialPassword, 12)
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert([profilePayload], { onConflict: 'id' })

  if (profileError) throw profileError

  console.log('User provisioning completed without printing credential values.')
}

createUser().catch((error) => {
  console.error('User provisioning failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
