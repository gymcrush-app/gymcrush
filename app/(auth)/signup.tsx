import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useAuthStore } from "@/lib/stores/authStore"
import { useOnboardingStore } from "@/lib/stores/onboardingStore"
import { supabase } from "@/lib/supabase"
import { signupSchema } from "@/lib/utils/validation"
import { colors, fontSize, fontWeight, spacing } from "@/theme"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "burnt"
import { Image } from "expo-image"
import { Link, useRouter } from "expo-router"
import { Eye, EyeOff } from "lucide-react-native"
import React, { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"

const backgroundImage = require("@/assets/images/GymCrushBackground.jpg")
const logoImage = require("@/assets/images/GymCrush-FP-Logo-GRADIENT.png")

type SignupFormData = {
  email: string
  password: string
  confirmPassword: string
}

export default function SignupScreen() {
  const router = useRouter()
  const setSession = useAuthStore((s) => s.setSession);
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  })

  // Clear any previous onboarding data when entering signup (e.g. after logout or closing onboarding)
  useEffect(() => {
    useOnboardingStore.getState().clearData()
  }, [])

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true)
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })

      if (error) throw error

      if (authData.session) {
        setSession(authData.session)
        toast({ preset: "done", title: "Account created!" })
        router.replace("/(auth)/onboarding")
      } else {
        toast({
          title: "Check your email",
          message: "We sent you a confirmation link",
        })
      }
    } catch (error: any) {
      toast({ preset: "error", title: "Signup failed", message: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <View style={styles.wrapper}>
      {/* Background image */}
      <Image
        source={backgroundImage}
        style={styles.backgroundImage}
        contentFit="cover"
        cachePolicy="memory-disk"
      />

      {/* Overlay for text readability */}
      <View style={styles.overlay} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo/Title */}
          <View style={styles.logoContainer}>
            <Image
              source={logoImage}
              style={styles.logoImage}
              contentFit="contain"
              cachePolicy="memory-disk"
              accessibilityLabel="GymCrush logo"
            />
            <Text style={styles.subtitle}>
              Create your account to get started
            </Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email"
                  placeholder="Enter your email"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Password"
                  placeholder="Create a password (min 8 characters)"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="off"
                  textContentType="newPassword"
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
                  label="Confirm Password"
                  placeholder="Confirm your password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.confirmPassword?.message}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoComplete="off"
                  textContentType="none"
                  rightIcon={
                    showConfirmPassword ? (
                      <EyeOff size={20} color={colors.mutedForeground} />
                    ) : (
                      <Eye size={20} color={colors.mutedForeground} />
                    )
                  }
                  onRightIconPress={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                />
              )}
            />
          </View>

          {/* Create Account Button */}
          <Button
            variant="primary"
            size="lg"
            onPress={handleSubmit(onSubmit)}
            isLoading={isLoading}
            style={styles.createButton}
          >
            Create Account
          </Button>

          {/* Sign In Link */}
          <View style={styles.signinLinkContainer}>
            <Text style={styles.signinText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <Text style={styles.signinLink}>Sign In</Text>
            </Link>
          </View>
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
    marginBottom: spacing[4],
  },
  logoImage: {
    width: "80%",
    maxWidth: 440,
    height: 280,
    // marginBottom: spacing[1],
  },
  subtitle: {
    color: colors.mutedForeground,
    textAlign: "center",
    fontSize: fontSize.base,
  },
  formContainer: {
    marginBottom: spacing[6],
    gap: spacing[4],
  },
  createButton: {
    marginBottom: spacing[6],
  },
  signinLinkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signinText: {
    color: colors.mutedForeground,
  },
  signinLink: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
})
