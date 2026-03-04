import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useAuthStore } from "@/lib/stores/authStore"
import { supabase } from "@/lib/supabase"
import { loginSchema } from "@/lib/utils/validation"
import { colors, fontSize, fontWeight, spacing } from "@/theme"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "burnt"
import { Image } from "expo-image"
import { Link, useRouter } from "expo-router"
import { Eye, EyeOff } from "lucide-react-native"
import React, { useState } from "react"
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

type LoginFormData = {
  email: string
  password: string
}

export default function LoginScreen() {
  const router = useRouter()
  const setSession = useAuthStore((s) => s.setSession);
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

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
        setSession(authData.session)
        toast({ preset: "done", title: "Welcome back!" })
        // Navigation will be handled by root layout based on auth state
      }
    } catch (error: any) {
      toast({ preset: "error", title: "Login failed", message: error.message })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAppleSignIn = async () => {
    // TODO: Implement Apple OAuth
    toast({ preset: "none", title: "Apple Sign In", message: "Coming soon" })
  }

  const handleGoogleSignIn = async () => {
    // TODO: Implement Google OAuth
    toast({ preset: "none", title: "Google Sign In", message: "Coming soon" })
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
            <Text style={styles.signupText}>Don't have an account? </Text>
            <Link href="/(auth)/signup" asChild>
              <Text style={styles.signupLink}>Sign Up</Text>
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
})
