'use client'

import { MapMarker, CustomOverlayMap } from 'react-kakao-maps-sdk'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props {
  id:   string
  name: string
  lat:  number
  lng:  number
}

export function ComplexMarker({ id, name, lat, lng }: Props) {
  const router  = useRouter()
  const [hover, setHover] = useState(false)

  return (
    <>
      <MapMarker
        position={{ lat, lng }}
        onClick={() => router.push(`/complexes/${id}`)}
        onMouseOver={() => setHover(true)}
        onMouseOut={() => setHover(false)}
      />
      {hover && (
        <CustomOverlayMap position={{ lat, lng }} yAnchor={2.2}>
          <div className="rounded bg-white px-2 py-1 text-xs font-medium shadow-md ring-1 ring-gray-200 whitespace-nowrap">
            {name}
          </div>
        </CustomOverlayMap>
      )}
    </>
  )
}
