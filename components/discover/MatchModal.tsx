import { Text } from "@/components/ui/Text"
import { borderRadius, fontFamily, fontSize, palette, spacing } from "@/theme"
import type { Profile } from "@/types"
import { Image } from "expo-image"
import { X } from "lucide-react-native"
import React, { useCallback, useState } from "react"
import {
  ActivityIndicator,
  Dimensions,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native"
import { ConfettiAnimation } from "./ConfettiAnimation"

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window")
const PHOTO_SIZE = 200
const PHOTO_OVERLAP = PHOTO_SIZE * 0.18
const MATCH_BG = require("@/assets/images/MatchUnlockedBg.png")

interface MatchModalProps {
  visible: boolean
  currentUser: Profile
  matchedUser: Profile
  /** Called with trimmed message content when user taps Send. */
  onSend: (content: string) => Promise<void> | void
  /** Called when user dismisses (X or backdrop). */
  onClose: () => void
}

export function MatchModal({
  visible,
  currentUser,
  matchedUser,
  onSend,
  onClose,
}: MatchModalProps) {
  const [draft, setDraft] = useState("")
  const [isSending, setIsSending] = useState(false)

  const handleSend = useCallback(async () => {
    const trimmed = draft.trim()
    if (!trimmed || isSending) return
    setIsSending(true)
    try {
      await onSend(trimmed)
      setDraft("")
    } finally {
      setIsSending(false)
    }
  }, [draft, isSending, onSend])

  if (!visible) return null

  const currentUserPhoto = currentUser.photo_urls?.[0] || null
  const matchedUserPhoto = matchedUser.photo_urls?.[0] || null

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.fill}>
        {/* Background art — fixed full-screen, KAV doesn't compress it */}
        <ImageBackground
          source={MATCH_BG}
          resizeMode="cover"
          style={StyleSheet.absoluteFillObject}
        />

        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Backdrop tap to close */}
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={onClose}
          />

          {/* Photos + subtitle, anchored near top */}
          <View style={styles.upperContent} pointerEvents="box-none">
            <View style={styles.photoRow}>
              <View style={[styles.photoCircle, styles.photoLeft]}>
                {matchedUserPhoto ? (
                  <Image
                    source={{ uri: matchedUserPhoto }}
                    style={styles.photo}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={[styles.photo, styles.photoPlaceholder]}>
                    <Text style={styles.photoPlaceholderText}>
                      {matchedUser.display_name?.[0]?.toUpperCase() || "?"}
                    </Text>
                  </View>
                )}
              </View>
              <View style={[styles.photoCircle, styles.photoRight]}>
                {currentUserPhoto ? (
                  <Image
                    source={{ uri: currentUserPhoto }}
                    style={styles.photo}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={[styles.photo, styles.photoPlaceholder]}>
                    <Text style={styles.photoPlaceholderText}>
                      {currentUser.display_name?.[0]?.toUpperCase() || "?"}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <Text style={styles.subtitle}>
              You matched with {matchedUser.display_name}.
            </Text>
          </View>

          {/* Spacer pushes input to the bottom */}
          <View style={styles.spacer} pointerEvents="none" />

          {/* Input pill */}
          <View style={styles.inputWrapper}>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Say something nice"
                placeholderTextColor={`${palette.peachDark}99`}
                value={draft}
                onChangeText={setDraft}
                autoCorrect
                autoCapitalize="sentences"
                returnKeyType="send"
                onSubmitEditing={handleSend}
                editable={!isSending}
              />
              <Pressable
                onPress={handleSend}
                disabled={!draft.trim() || isSending}
                style={[
                  styles.sendButton,
                  (!draft.trim() || isSending) && styles.sendButtonDisabled,
                ]}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color={palette.white} />
                ) : (
                  <Text style={styles.sendButtonText}>Send</Text>
                )}
              </Pressable>
            </View>
          </View>

        </KeyboardAvoidingView>

        {/* Close button — outside KAV so it stays put */}
        <Pressable style={styles.closeButton} onPress={onClose} hitSlop={10}>
          <X size={22} color={palette.peachDark} />
        </Pressable>

        {/* Confetti */}
        <View style={styles.confettiOverlay} pointerEvents="none">
          <ConfettiAnimation active={visible} />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  closeButton: {
    position: "absolute",
    top: spacing[12],
    right: spacing[5],
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${palette.white}66`,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  upperContent: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.32,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: spacing[6],
    gap: spacing[4],
  },
  spacer: {
    flex: 1,
  },
  inputWrapper: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[8],
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: PHOTO_SIZE,
    marginBottom: 100,
  },
  photoCircle: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_SIZE / 2,
    overflow: "hidden",
    borderWidth: 6,
    borderColor: palette.white,
    backgroundColor: palette.peach300,
    shadowColor: palette.peachDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  photoLeft: {
    transform: [{ rotate: "-6deg" }],
  },
  photoRight: {
    marginLeft: -PHOTO_OVERLAP,
    transform: [{ rotate: "6deg" }],
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    backgroundColor: palette.peach100,
    alignItems: "center",
    justifyContent: "center",
  },
  photoPlaceholderText: {
    color: palette.white,
    fontSize: fontSize["4xl"],
    fontFamily: fontFamily.manropeBold,
  },
  subtitle: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.manropeSemibold,
    color: palette.white,
    textAlign: "center",
    textShadowColor: `${palette.peachDark}55`,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: `${palette.peach300}E6`,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: `${palette.white}CC`,
    paddingLeft: spacing[5],
    paddingRight: spacing[2],
    paddingVertical: spacing[2],
    shadowColor: palette.peachDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  input: {
    flex: 1,
    fontSize: fontSize.base,
    fontFamily: fontFamily.manrope,
    color: palette.peachDark,
    paddingVertical: spacing[2],
  },
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.peach200,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    minWidth: 80,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: fontSize.base,
    fontFamily: fontFamily.manropeSemibold,
    color: palette.white,
  },
  confettiOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    elevation: 30,
  },
})
