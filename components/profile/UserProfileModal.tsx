import { OtherUserProfileContent } from "@/components/profile/OtherUserProfileContent"
import { ZoomPortalProvider } from "@/lib/contexts/ZoomPortalContext"
import { useUserProfileModal } from "@/lib/contexts/UserProfileModalContext"
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query"
import React, { useEffect, useRef } from "react"
import { BackHandler, Modal, StyleSheet, View } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
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
        <GestureHandlerRootView style={styles.container}>
          <QueryClientProvider client={queryClient}>
            <SafeAreaProvider>
              <ZoomPortalProvider>
                <View style={styles.container}>
                  <OtherUserProfileContent
                    key={userId}
                    userId={userId}
                    onBack={closeUserProfile}
                    onOpenImageChat={closeUserProfile}
                  />
                </View>
              </ZoomPortalProvider>
            </SafeAreaProvider>
          </QueryClientProvider>
        </GestureHandlerRootView>
      )}
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
