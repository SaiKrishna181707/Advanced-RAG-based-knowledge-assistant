import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatedTopDock } from '../../shaders/animated-top-dock/AnimatedTopDock'
import '../../shaders/threeui.css'
import './AnimatedTopDockHost.css'

export default function AnimatedTopDockHost() {
  const navigate = useNavigate()

  useEffect(() => {
    const root = document.querySelector('.landing-dock-host')
    if (!root) return undefined

    const onClick = (event) => {
      const target = event.target instanceof Element ? event.target : null
      if (!target) return

      if (target.closest('.atd-modern__ghost')) {
        event.preventDefault()
        navigate('/login')
        return
      }

      if (target.closest('.atd-modern__cta')) {
        event.preventDefault()
        navigate('/signup')
        return
      }

      const item = target.closest('.atd-modern__item')
      if (!item) return
      const label = item.textContent?.trim().toLowerCase()
      const destinations = {
        product: '#product',
        solutions: '#how-it-works',
        docs: '#product',
        pricing: '#pricing',
      }
      const href = destinations[label]
      if (!href) return
      event.preventDefault()
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    root.addEventListener('click', onClick)
    return () => root.removeEventListener('click', onClick)
  }, [navigate])

  return (
    <div className="landing-dock-host shader-frame">
      <AnimatedTopDock
        variant="modern"
        proximity={122}
        spring={0.19}
        damping={0.70}
        widthGrowth={17}
        heightGrowth={16}
        drop={3.5}
      />
    </div>
  )
}
