import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { formatRelativeTime, truncateText } from '@/lib/utils/formatting';
import { colors, gradients, spacing, borderRadius, fontSize } from '@/theme';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
  senderName?: string;
}

function ReactionContext({
  message,
  isSent,
}: {
  message: Message;
  isSent: boolean;
}) {
  const reactionType = message.reaction_type;
  const promptTitle = message.reaction_prompt_title;
  const promptAnswer = message.reaction_prompt_answer;

  if (!reactionType) return null;

  const labelStyle = [
    styles.reactionLabel,
    isSent ? styles.reactionLabelSent : styles.reactionLabelReceived,
  ];

  if (reactionType === 'prompt' && promptTitle) {
    return (
      <View style={styles.reactionBlock}>
        <Text style={labelStyle} numberOfLines={1}>
          Re: {promptTitle}
        </Text>
        {promptAnswer != null && promptAnswer.trim() !== '' && (
          <Text
            style={[labelStyle, styles.reactionAnswer]}
            numberOfLines={2}
          >
            {truncateText(promptAnswer.trim(), 80)}
          </Text>
        )}
      </View>
    );
  }

  if (reactionType === 'image') {
    const imageUrl = message.reaction_image_url;
    return (
      <View style={styles.reactionBlock}>
        {imageUrl ? (
          <View style={styles.reactionImageWrap}>
            <Text style={[labelStyle, styles.reactionImageLabel]}>Re: Photo</Text>
            <Image
              source={{ uri: imageUrl }}
              style={styles.reactionImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              placeholder={colors.muted}
            />
          </View>
        ) : (
          <Text style={labelStyle}>Re: Photo</Text>
        )}
      </View>
    );
  }

  return null;
}

const MessageBubbleInner = ({ message, isSent }: MessageBubbleProps) => {
  const { width } = useWindowDimensions();
  const maxBubbleWidth = width * 0.75;
  const timestamp = formatRelativeTime(message.created_at || new Date().toISOString());

  const bubbleContent = (
    <View style={[styles.bubble, { maxWidth: maxBubbleWidth }]}>
      <Text
        style={[
          styles.messageText,
          isSent ? styles.messageTextSent : styles.messageTextReceived,
        ]}
      >
        {message.content}
      </Text>
      <Text
        style={[
          styles.timestamp,
          isSent ? styles.timestampSent : styles.timestampReceived,
        ]}
      >
        {timestamp}
      </Text>
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        isSent ? styles.containerSent : styles.containerReceived,
      ]}
    >
      {message.reaction_type ? (
        <View
          style={[
            styles.reactionBorderedWrap,
            isSent
              ? styles.reactionBorderedWrapSent
              : styles.reactionBorderedWrapReceived,
          ]}
        >
          <ReactionContext message={message} isSent={isSent} />
        </View>
      ) : (
        <ReactionContext message={message} isSent={isSent} />
      )}
      {isSent ? (
        <LinearGradient
          colors={gradients.primary.colors}
          start={gradients.primary.start}
          end={gradients.primary.end}
          style={[styles.gradientBubble, { maxWidth: maxBubbleWidth }]}
        >
          <Text style={styles.messageTextSent}>{message.content}</Text>
          <Text style={styles.timestampSent}>{timestamp}</Text>
        </LinearGradient>
      ) : (
        bubbleContent
      )}
    </View>
  );
}

export const MessageBubble = React.memo(MessageBubbleInner);

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing[1],
    paddingHorizontal: spacing[4],
  },
  containerSent: {
    alignItems: 'flex-end',
  },
  containerReceived: {
    alignItems: 'flex-start',
  },
  reactionBlock: {
    marginBottom: spacing[1],
  },
  reactionBorderedWrap: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing[2],
    marginBottom: spacing[1],
  },
  reactionBorderedWrapSent: {
    alignItems: 'flex-end',
  },
  reactionBorderedWrapReceived: {
    alignItems: 'flex-start',
  },
  reactionLabel: {
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * 1.35,
  },
  reactionLabelSent: {
    color: colors.primaryForeground,
    opacity: 0.85,
  },
  reactionLabelReceived: {
    color: colors.mutedForeground,
  },
  reactionAnswer: {
    marginTop: spacing[0.5],
    opacity: 0.9,
  },
  reactionImageWrap: {
    marginTop: spacing[0.5],
  },
  reactionImageLabel: {
    marginBottom: spacing[1],
  },
  reactionImage: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.lg,
  },
  bubble: {
    borderRadius: borderRadius['2xl'],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    backgroundColor: colors.muted,
  },
  gradientBubble: {
    borderRadius: borderRadius['2xl'],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    borderBottomRightRadius: borderRadius.md,
  },
  messageText: {
    fontSize: fontSize.base,
    lineHeight: fontSize.base * 1.4,
  },
  messageTextSent: {
    color: colors.primaryForeground,
  },
  messageTextReceived: {
    color: colors.foreground,
  },
  timestamp: {
    fontSize: fontSize.xs,
    marginTop: spacing[1],
  },
  timestampSent: {
    color: colors.primaryForeground,
    opacity: 0.7,
  },
  timestampReceived: {
    color: colors.mutedForeground,
  },
});
