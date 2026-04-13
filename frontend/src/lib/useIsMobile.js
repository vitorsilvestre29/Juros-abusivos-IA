import { useEffect, useState } from 'react'

export default function useIsMobile(breakpoint = 768) {
  const getIsMobile = () => {
    if (typeof window === 'undefined') return false
    return window.innerWidth <= breakpoint
  }

  const [isMobile, setIsMobile] = useState(getIsMobile)

  useEffect(() => {
    function handleResize() {
      setIsMobile(getIsMobile())
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [breakpoint])

  return isMobile
}
