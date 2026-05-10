'use client'

import { useRef } from 'react'
import { IcpBuilder } from './IcpBuilder'
import { LeadsContent } from './LeadsContent'

export function LeadsClientWrapper({ token }: { token: string }) {
  const refreshRef = useRef<(() => void) | null>(null)

  function triggerRefresh() {
    refreshRef.current?.()
  }

  return (
    <>
      <IcpBuilder token={token} onLeadsRefresh={triggerRefresh} />
      <LeadsContent token={token} refreshRef={refreshRef} />
    </>
  )
}
