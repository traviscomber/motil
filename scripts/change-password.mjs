import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import bcrypt from 'bcrypt'

dotenv.config({ path: '.env.development.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function changePasswords() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════╗')
    console.log('║       Cambiando contraseñas de usuarios                 ║')
    console.log('╚════════════════════════════════════════════════════════╝\n')

    const users = [
      'mastudillo@lapatagua.cl',
      'ariellopez@lapatagua.cl'
    ]
    const newPassword = process.env.MOTIL_NEW_PASSWORD
    if (!newPassword) {
      console.error('Missing MOTIL_NEW_PASSWORD')
      process.exit(1)
    }

    // Hash password with bcrypt (12 rounds)
    const passwordHash = await bcrypt.hash(newPassword, 12)

    for (const email of users) {
      console.log(`Actualizando ${email}...`)

      // 1. Update Auth password
      const { data: authUsers } = await supabase.auth.admin.listUsers()
      const user = authUsers.users.find(u => u.email === email)

      if (!user) {
        console.log(`  ⚠️  Usuario no encontrado en Auth`)
        continue
      }

      const { error: authError } = await supabase.auth.admin.updateUserById(user.id, {
        password: newPassword
      })

      if (authError) {
        console.error(`  ❌ Error actualizando Auth:`, authError.message)
        continue
      }

      console.log(`  ✓ Contraseña en Auth actualizada`)

      // 2. Update profiles password_hash
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ password_hash: passwordHash })
        .eq('email', email)

      if (profileError) {
        console.error(`  ❌ Error actualizando profiles:`, profileError.message)
        continue
      }

      console.log(`  ✓ Hash en profiles actualizado`)
      console.log(`  ✓ ${email} actualizado correctamente\n`)
    }

    console.log('╔════════════════════════════════════════════════════════╗')
    console.log('║         ✅ Contraseñas actualizadas                     ║')
    console.log('╚════════════════════════════════════════════════════════╝\n')
    console.log('Password update completed; credential values are not printed.')


  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

changePasswords()
