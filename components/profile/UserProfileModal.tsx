import { OtherUserProfileContent } from "@/components/profile/OtherUserProfileContent"
import { useUserProfileModal } from "@/lib/contexts/UserProfileModalContext"
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query"
import React, { useEffect, useRef } from "react"
import { BackHandler, Modal, StyleSheet, View } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"

/**
 * Global modal to view another user's profile. Opened via useUserProfileModal().openUserProfile(userId)
 * from Discover, Matches, or Chat. Close returns the user to the screen they were on.
 * Wraps content in QueryClientProvider so the modal (which may render in a separate native window) has
 * access to the same React Query client.
 */
export function UserProfileModal() {
  const { userId, closeUserProfile } = useUserProfileModal()
  const queryClient = useQueryClient()
  const isOpenRef = useRef(false)
  isOpenRef.current = userId !== null

  // Only handle hardware back when modal is actually open; otherwise let the navigator handle it
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!isOpenRef.current) return false
      closeUserProfile()
      return true
    })
    return () => sub.remove()
  }, [closeUserProfile])

  return (
    <Modal
      visible={userId !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={closeUserProfile}
    >
      {userId !== null && (
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <View style={styles.container}>
              <OtherUserProfileContent
                key={userId}
                userId={userId}
                onBack={closeUserProfile}
                onOpenImageChat={closeUserProfile}
              />
            </View>
          </SafeAreaProvider>
        </QueryClientProvider>
      )}
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
