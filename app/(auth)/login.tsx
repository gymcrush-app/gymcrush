import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useAuthStore } from "@/lib/stores/authStore"
import { supabase } from "@/lib/supabase"
import { getAppVersionLabel } from "@/lib/utils/appVersion"
import { loginSchema } from "@/lib/utils/validation"
import { signInWithApple } from "@/lib/auth/appleSignIn"
import { GoogleSignInCancelled, signInWithGoogle } from "@/lib/auth/googleSignIn"
import { track } from "@/lib/utils/analytics"
import { colors, fontSize, fontWeight, spacing } from "@/theme"
import { zodResolver } from "@hookform/resolvers/zod"
import { Image } from "expo-image"
import { Link } from "expo-router"
import { Eye, EyeOff } from "lucide-react-native"
import React, { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"

const backgroundImage = require("@/assets/images/GymCrushBackground.jpg")
const logoImage = require("@/assets/images/GymCrush-FP-Logo-GRADIENT.png")

type LoginFormData = {
  email: string
  password: string
}

export default function LoginScreen() {
  const setSession = useAuthStore((s) => s.setSession)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [resetSending, setResetSending] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) throw error

      if (authData.session) {
        track('login_success')
        setSession(authData.session)
        // Navigation will be handled by root layout based on auth state
      }
    } catch (error: any) {
      track('login_failed', { error: error?.message })
      Alert.alert("Login failed", error?.message ?? "Something went wrong.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleAppleSignIn = async () => {
    setIsLoading(true)
    try {
      const { session } = await signInWithApple()
      if (session) {
        track('login_success', { method: 'apple' })
        setSession(session)
      }
    } catch (error: any) {
      // Apple cancellation is code ERR_REQUEST_CANCELED — don't show an alert
      if (error?.code === 'ERR_REQUEST_CANCELED') return
      track('login_failed', { method: 'apple', error: error?.message })
      Alert.alert("Apple Sign In failed", error?.message ?? "Something went wrong.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      const { session } = await signInWithGoogle()
      if (session) {
        track('login_success', { method: 'google' })
        setSession(session)
      }
    } catch (error: any) {
      if (error instanceof GoogleSignInCancelled) return
      track('login_failed', { method: 'google', error: error?.message })
      Alert.alert("Google Sign In failed", error?.message ?? "Something went wrong.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    const email = control._formValues.email?.trim()
    if (!email) {
      Alert.alert("Enter your email", "Type your email above, then tap Forgot Password.")
      return
    }
    setResetSending(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "gymcrush://reset-password",
      })
      if (error) throw error
      Alert.alert("Check your inbox", "We sent a password reset link to " + email + ".")
    } catch (error: any) {
      Alert.alert("Reset failed", error?.message ?? "Something went wrong.")
    } finally {
      setResetSending(false)
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
            <Text style={styles.subtitle}>Connect with gym-goers near you</Text>
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
                  spellCheck={false}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Password"
                  placeholder="Enter your password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
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
          </View>

          {/* Forgot Password */}
          <Pressable onPress={handleForgotPassword} disabled={resetSending} style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>
              {resetSending ? "Sending..." : "Forgot password?"}
            </Text>
          </Pressable>

          {/* Sign In Button */}
          <Button
            variant="primary"
            size="lg"
            onPress={handleSubmit(onSubmit)}
            isLoading={isLoading}
            style={styles.signInButton}
          >
            Sign In
          </Button>

          {/* OAuth Buttons */}
          <View style={styles.oauthContainer}>
            <Button
              variant="outline"
              onPress={handleAppleSignIn}
              style={styles.oauthButton}
            >
              Continue with Apple
            </Button>
            <Button
              variant="outline"
              onPress={handleGoogleSignIn}
              style={styles.oauthButton}
            >
              Continue with Google
            </Button>
          </View>

          {/* Sign Up Link */}
          <View style={styles.signupLinkContainer}>
            <Text style={styles.signupText}>Don{"'"}t have an account? </Text>
            <Link href="/(auth)/signup" asChild>
              <Text style={styles.signupLink}>Sign Up</Text>
            </Link>
          </View>

          <Text
            style={styles.supabaseUrl}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {getAppVersionLabel()}
          </Text>
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
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: spacing[4],
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: fontSize.sm,
  },
  signInButton: {
    marginBottom: spacing[4],
  },
  oauthContainer: {
    marginBottom: spacing[6],
    gap: spacing[3],
  },
  oauthButton: {
    backgroundColor: colors.card,
  },
  signupLinkContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signupText: {
    color: colors.mutedForeground,
  },
  signupLink: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  supabaseUrl: {
    marginTop: spacing[6],
    color: colors.mutedForeground,
    fontSize: fontSize.xs,
    textAlign: "center",
  },
})
