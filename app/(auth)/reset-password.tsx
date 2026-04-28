import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useAuthStore } from "@/lib/stores/authStore"
import { supabase } from "@/lib/supabase"
import { resetPasswordSchema } from "@/lib/utils/validation"
import { colors, fontSize, fontFamily, spacing } from "@/theme"
import { zodResolver } from "@hookform/resolvers/zod"
import { Image } from "expo-image"
import { useRouter } from "expo-router"
import { Eye, EyeOff } from "lucide-react-native"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"

const backgroundImage = require("@/assets/images/GymCrushBackground.jpg")
const logoImage = require("@/assets/images/GymCrush-FP-Logo-GRADIENT.png")

type ResetPasswordFormData = {
  password: string
  confirmPassword: string
}

export default function ResetPasswordScreen() {
  const router = useRouter()
  const setInPasswordRecovery = useAuthStore((s) => s.setInPasswordRecovery)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  })

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsSubmitting(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password })
      if (error) throw error

      // Sign out so the user has to log in with the new password. This also
      // confirms the new password works and kills the short-lived recovery session.
      await supabase.auth.signOut()
      setInPasswordRecovery(false)

      Alert.alert(
        "Password updated",
        "Your password has been reset. Please sign in with your new password.",
        [{ text: "OK", onPress: () => router.replace("/(auth)/login" as never) }],
      )
    } catch (error: any) {
      Alert.alert("Reset failed", error?.message ?? "Something went wrong.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <View style={styles.wrapper}>
      <Image
        source={backgroundImage}
        style={styles.backgroundImage}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <View style={styles.overlay} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Image
              source={logoImage}
              style={styles.logoImage}
              contentFit="contain"
              cachePolicy="memory-disk"
              accessibilityLabel="GymCrush logo"
            />
            <Text style={styles.title}>Set a new password</Text>
            <Text style={styles.subtitle}>
              Pick something you haven{"'"}t used here before.
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="New password"
                  placeholder="At least 8 characters"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password-new"
                  rightIcon={
                    showPassword ? (
                      <EyeOff size={20} color={colors.mutedForeground} />
                    ) : (
                      <Eye size={20} color={colors.mutedForeground} />
                    )
                  }
                  onRightIconPress={() => setShowPassword(!showPassword)}
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Confirm new password"
                  placeholder="Re-enter your new password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.confirmPassword?.message}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  autoComplete="password-new"
                  rightIcon={
                    showConfirm ? (
                      <EyeOff size={20} color={colors.mutedForeground} />
                    ) : (
                      <Eye size={20} color={colors.mutedForeground} />
                    )
                  }
                  onRightIconPress={() => setShowConfirm(!showConfirm)}
                />
              )}
            />
          </View>

          <Button
            variant="primary"
            size="lg"
            onPress={handleSubmit(onSubmit)}
            isLoading={isSubmitting}
            style={styles.submitButton}
          >
            Update password
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    position: "relative",
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  container: {
    flex: 1,
    position: "relative",
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[12],
    position: "relative",
    zIndex: 1,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: spacing[6],
  },
  logoImage: {
    width: 160,
    height: 80,
    marginBottom: spacing[4],
  },
  title: {
    color: colors.foreground,
    fontSize: fontSize.xl,
    fontFamily: fontFamily.manropeBold as "bold",
    marginBottom: spacing[2],
  },
  subtitle: {
    color: colors.mutedForeground,
    fontSize: fontSize.sm,
    textAlign: "center",
  },
  formContainer: {
    gap: spacing[4],
    marginBottom: spacing[4],
  },
  submitButton: {
    marginTop: spacing[2],
  },
})
