import { AboutSection } from "@/components/profile/AboutSection"
import { ProfileInfoBox } from "@/components/profile/ProfileInfoBox"
import React from "react"

export interface ProfileDetailContentProps {
  height: string | null
  intent: string
  occupation: string | null
  city: string | null
  bio: string | null
  children?: React.ReactNode
}

/**
 * Shared block: ProfileInfoBox + AboutSection. Used in SwipeDeck (discover card)
 * and OtherUserProfileContent (modal profile). Caller wraps in contentSection layout
 * and passes optional children (e.g. PromptsList, FitnessBadges).
 */
export function ProfileDetailContent({
  height,
  intent,
  occupation,
  city,
  bio,
  children,
}: ProfileDetailContentProps) {
  return (
    <>
      <ProfileInfoBox
        height={height}
        intent={intent}
        occupation={occupation}
        city={city}
      />
      <AboutSection bio={bio} />
      {children}
    </>
  )
}
