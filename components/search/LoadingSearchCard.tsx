'use client'

import { useEffect, useState } from 'react'
import styles from './LoadingSearchCard.module.css'
import shimmerStyles from '../home/ShimmerSearch.module.css'

interface LoadingMessage {
  text: string
  duration: number
}

const IMAGE_SEARCH_MESSAGES: LoadingMessage[] = [
  { text: "Analyzing your image...", duration: 2500 },
  { text: "Comparing with our portfolio...", duration: 2500 },
  { text: "Finding your perfect match...", duration: 2500 },
  { text: "Almost there...", duration: 2500 }
]

const TEXT_SEARCH_MESSAGES: LoadingMessage[] = [
  { text: "Understanding your style...", duration: 2500 },
  { text: "Searching through portfolios...", duration: 2500 },
  { text: "Finding the best artists...", duration: 2500 },
  { text: "Curating your results...", duration: 2500 }
]

const INSTAGRAM_POST_MESSAGES: LoadingMessage[] = [
  { text: "Fetching from Instagram...", duration: 2500 },
  { text: "Analyzing the post...", duration: 2500 },
  { text: "Finding similar artists...", duration: 2500 },
  { text: "Almost there...", duration: 2500 }
]

const INSTAGRAM_PROFILE_MESSAGES: LoadingMessage[] = [
  { text: "Fetching portfolio from Instagram...", duration: 2500 },
  { text: "Analyzing recent posts...", duration: 2500 },
  { text: "Finding artists with similar style...", duration: 2500 },
  { text: "Almost there...", duration: 2500 }
]

interface LoadingSearchCardProps {
  isVisible: boolean
  searchType: 'image' | 'text' | 'instagram_post' | 'instagram_profile'
}

export default function LoadingSearchCard({
  isVisible,
  searchType
}: LoadingSearchCardProps) {
  const [messageIndex, setMessageIndex] = useState(0)

  const messages =
    searchType === 'image' ? IMAGE_SEARCH_MESSAGES :
    searchType === 'instagram_post' ? INSTAGRAM_POST_MESSAGES :
    searchType === 'instagram_profile' ? INSTAGRAM_PROFILE_MESSAGES :
    TEXT_SEARCH_MESSAGES

  // Message rotation
  useEffect(() => {
    if (!isVisible) {
      setMessageIndex(0)
      return
    }

    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length)
    }, 2500)

    return () => clearInterval(interval)
  }, [isVisible, messages.length])

  const currentMessage = messages[messageIndex]

  if (!isVisible) return null

  return (
    <div className="relative">
      {/* Glowing aura behind search bar - AI power bleeding out */}
      <div className={shimmerStyles.loadingGlow} />

      <div className="relative bg-white rounded-full shadow-2xl px-6 py-5 border border-gray-200 animate-fade-in flex items-center justify-center overflow-hidden">
        {/* Particle Field Background */}
        <div className={shimmerStyles.particleField} />

        {/* Loading Text - clean, no shimmer */}
        <div key={messageIndex} className={`${styles.messageRotate} relative z-10`}>
          <p className="font-body text-base sm:text-lg text-gray-600">
            {currentMessage.text}
          </p>
        </div>
      </div>
    </div>
  )
}
