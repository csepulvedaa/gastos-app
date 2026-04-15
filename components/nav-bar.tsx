'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, PlusCircle, Clock, BarChart2 } from 'lucide-react'

const tabs = [
  { href: '/dashboard', label: 'Inicio', icon: Home },
  { href: '/add', label: 'Agregar', icon: PlusCircle },
  { href: '/history', label: 'Historial', icon: Clock },
  { href: '/stats', label: 'Stats', icon: BarChart2 },
]

export default function NavBar() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
      <div className="max-w-lg mx-auto flex">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
