import { Suspense } from 'react'
import { SearchInput } from './SearchInput'
import { ComplexList } from './ComplexList'
import type { ComplexSearchResult } from '@/lib/data/complex-search'

interface Props {
  query:     string
  complexes: ComplexSearchResult[]
}

export function SidePanel({ query, complexes }: Props) {
  return (
    <aside
      style={{
        width: 320,
        flexShrink: 0,
        borderRight: '1px solid var(--line-default)',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--line-default)',
        }}
      >
        <Suspense>
          <SearchInput initialValue={query} />
        </Suspense>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <ComplexList complexes={complexes} query={query} />
      </div>
    </aside>
  )
}
