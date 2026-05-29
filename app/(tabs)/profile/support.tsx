import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Text } from '@/components/ui/Text';
import { Textarea } from '@/components/ui/Textarea';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { track } from '@/lib/utils/analytics';
import { borderRadius, colors, fontFamily, fontSize, spacing } from '@/theme';
import Constants from 'expo-constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Bug, ChevronLeft, HelpCircle, MessageSquareHeart } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MAX_SUBJECT = 200;
const MAX_BODY = 5000;

type SupportKind = 'bug' | 'question' | 'feedback';

interface KindOption {
  value: SupportKind;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const KIND_OPTIONS: KindOption[] = [
  {
    value: 'bug',
    label: 'Bug',
    description: 'Something broken? Tell us what happened.',
    icon: <Bug size={18} color={colors.foreground} />,
  },
  {
    value: 'question',
    label: 'Question',
    description: 'Need a hand? Ask the GymCrush team.',
    icon: <HelpCircle size={18} color={colors.foreground} />,
  },
  {
    value: 'feedback',
    label: 'Feedback',
    description: 'Ideas, suggestions, or general feedback.',
    icon: <MessageSquareHeart size={18} color={colors.foreground} />,
  },
];

function isSupportKind(v: unknown): v is SupportKind {
  return v === 'bug' || v === 'question' || v === 'feedback';
}

export default function SupportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string }>();
  const initialKind: SupportKind = isSupportKind(params.kind) ? params.kind : 'question';

  const [kind, setKind] = useState<SupportKind>(initialKind);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const appVersion = useMemo(() => {
    const v = Constants.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '0.0.0';
    const build =
      Constants.nativeBuildVersion ??
      Platform.select({
        ios: Constants.expoConfig?.ios?.buildNumber,
        android: String(Constants.expoConfig?.android?.versionCode ?? ''),
      });
    return build ? `${v} (${build})` : v;
  }, []);

  const trimmedSubject = subject.trim();
  const trimmedBody = body.trim();
  const canSubmit =
    !isSubmitting &&
    trimmedSubject.length > 0 &&
    trimmedSubject.length <= MAX_SUBJECT &&
    trimmedBody.length > 0 &&
    trimmedBody.length <= MAX_BODY;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-support-message', {
        body: {
          kind,
          subject: trimmedSubject,
          body: trimmedBody,
          app_version: appVersion,
          platform: Platform.OS,
        },
      });
      if (error) throw new Error(error.message ?? 'Failed to send');
      if (data && typeof data === 'object' && 'error' in data && data.error) {
        throw new Error(String(data.error));
      }
      track('support_message_submitted', { kind });
      toast({
        preset: 'done',
        title: 'Message sent',
        message: 'Thanks — the team will be in touch if needed.',
      });
      router.back();
    } catch (err: any) {
      toast({
        preset: 'error',
        title: 'Could not send',
        message: err?.message ?? 'Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const headerTitle =
    kind === 'bug' ? 'Report a Bug' : kind === 'question' ? 'Help & Support' : 'Send Feedback';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
          <ChevronLeft size={24} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.intro}>
            Tell us what's going on. Submissions go straight to the GymCrush team.
          </Text>

          <View style={styles.kindGroup}>
            {KIND_OPTIONS.map((opt) => {
              const selected = kind === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setKind(opt.value)}
                  style={[styles.kindOption, selected && styles.kindOptionSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <View style={styles.kindIcon}>{opt.icon}</View>
                  <View style={styles.kindText}>
                    <Text style={styles.kindLabel}>{opt.label}</Text>
                    <Text variant="mutedSmall">{opt.description}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Input
            label="Subject"
            value={subject}
            onChangeText={setSubject}
            placeholder={kind === 'bug' ? 'e.g. Crash on opening chat' : 'Short summary'}
            maxLength={MAX_SUBJECT}
            autoCapitalize="sentences"
          />

          <Textarea
            label="Details"
            value={body}
            onChangeText={setBody}
            placeholder={
              kind === 'bug'
                ? 'What were you doing? What did you expect to happen? What happened instead?'
                : 'Share as much detail as you can.'
            }
            maxLength={MAX_BODY}
            showCharCount
            style={styles.textarea}
          />

          <Text variant="mutedSmall" style={styles.footnote}>
            We'll include your account so the team can follow up. App version {appVersion} • {Platform.OS}
          </Text>

          <Button
            variant="primary"
            size="lg"
            onPress={handleSubmit}
            disabled={!canSubmit}
            isLoading={isSubmitting}
            style={styles.submit}
          >
            Send
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { padding: spacing[2] },
  headerTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamily.manropeSemibold,
    color: colors.foreground,
  },
  headerSpacer: { width: 40 },
  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
    gap: spacing[4],
  },
  intro: {
    fontSize: fontSize.sm,
    color: colors.mutedForeground,
    marginBottom: spacing[1],
  },
  kindGroup: { gap: spacing[2] },
  kindOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  kindOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}1A`,
  },
  kindIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindText: { flex: 1 },
  kindLabel: {
    fontFamily: fontFamily.manropeSemibold,
    fontSize: fontSize.base,
    color: colors.foreground,
  },
  textarea: { minHeight: 160 },
  footnote: {
    marginTop: spacing[1],
  },
  submit: {
    marginTop: spacing[2],
  },
});
