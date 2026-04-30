'use client'

import { CustomOverlayMap } from 'react-kakao-maps-sdk'

interface Props {
  lat:   number
  lng:   number
  count: number
}

export function ClusterMarker({ lat, lng, count }: Props) {
  const size = count > 100 ? 44 : count > 20 ? 38 : 32

  return (
    <CustomOverlayMap position={{ lat, lng }} xAnchor={0.5} yAnchor={0.5}>
      <div
        className="flex items-center justify-center rounded-full bg-blue-700 text-white font-semibold shadow-md cursor-pointer select-none"
        style={{ width: size, height: size, fontSize: count > 99 ? 10 : 12 }}
      >
        {count > 999 ? '999+' : count}
      </div>
    </CustomOverlayMap>
  )
}
