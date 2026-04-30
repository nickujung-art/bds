import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { signOut } from '@/lib/auth/actions'

export async function UserMenu() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <Link href="/login" className="btn btn-md btn-secondary" style={{ textDecoration: 'none' }}>
        로그인
      </Link>
    )
  }

  const initial = (user.email ?? '?')[0]!.toUpperCase()

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Link
        href="/profile"
        style={{
          display: 'flex',
          width: 32,
          height: 32,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          background: 'var(--dj-orange)',
          color: '#fff',
          fontSize: 13,
          fontWeight: 700,
          textDecoration: 'none',
        }}
        title={user.email}
      >
        {initial}
      </Link>
      <form action={signOut}>
        <button
          type="submit"
          style={{
            font: '500 13px/1 var(--font-sans)',
            color: 'var(--fg-tertiary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          로그아웃
        </button>
      </form>
    </div>
  )
}
