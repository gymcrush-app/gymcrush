import { AboutSection } from "@/components/profile/AboutSection"
import { ProfileInfoBox } from "@/components/profile/ProfileInfoBox"
import { ProfileLifestyleBox } from "@/components/profile/ProfileLifestyleBox"
import React from "react"

export interface ProfileDetailContentProps {
  height: string | null
  intent: string
  occupation: string | null
  city: string | null
  bio: string | null
  religion?: string | null
  alcohol?: string | null
  smoking?: string | null
  marijuana?: string | null
  hasKids?: string | null
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
  religion,
  alcohol,
  smoking,
  marijuana,
  hasKids,
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
      <ProfileLifestyleBox
        religion={religion ?? null}
        alcohol={alcohol ?? null}
        smoking={smoking ?? null}
        marijuana={marijuana ?? null}
        hasKids={hasKids ?? null}
      />
      <AboutSection bio={bio} />
      {children}
    </>
  )
}
