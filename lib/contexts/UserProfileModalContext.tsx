import { fetchProfileById } from "@/lib/api/profiles"
import React, { createContext, useCallback, useContext, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

interface UserProfileModalContextValue {
  /** Open the modal for the given user id (from any tab: Discover, Matches, Chat). */
  openUserProfile: (userId: string) => void
  /** Close the modal; user returns to the screen they were on. */
  closeUserProfile: () => void
  /** Currently shown user id, or null when modal is closed. */
  userId: string | null
}

const UserProfileModalContext = createContext<
  UserProfileModalContextValue | undefined
>(undefined)

export function UserProfileModalProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [userId, setUserId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const openUserProfile = useCallback(
    (id: string) => {
      queryClient.prefetchQuery({
        queryKey: ["profile", id],
        queryFn: () => fetchProfileById(id),
      })
      setUserId(id)
    },
    [queryClient]
  )

  const closeUserProfile = useCallback(() => {
    setUserId(null)
  }, [])

  const value: UserProfileModalContextValue = {
    openUserProfile,
    closeUserProfile,
    userId,
  }

  return (
    <UserProfileModalContext.Provider value={value}>
      {children}
    </UserProfileModalContext.Provider>
  )
}

export function useUserProfileModal(): UserProfileModalContextValue {
  const ctx = useContext(UserProfileModalContext)
  if (ctx === undefined) {
    throw new Error(
      "useUserProfileModal must be used within UserProfileModalProvider"
    )
  }
  return ctx
}
