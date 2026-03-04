import { PhotoCarousel } from '@/components/profile/PhotoCarousel';
import { Text } from '@/components/ui/Text';
import { borderRadius, colors, fontSize, spacing } from '@/theme';
import { MessageCircle } from 'lucide-react-native';
import React from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import Tooltip from 'react-native-walkthrough-tooltip';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PhotoSectionProps {
  photos: string[];
  imageHeight: number;
  onOpenImageChat: () => void;
  showPhotoSwipeTooltip?: boolean;
  showImageCommentTooltip?: boolean;
  onPhotoSwipeTooltipClose?: () => void;
  onImageCommentTooltipClose?: () => void;
}

export const PhotoSection = React.memo<PhotoSectionProps>(({ 
  photos, 
  imageHeight, 
  onOpenImageChat,
  showPhotoSwipeTooltip = false,
  showImageCommentTooltip = false,
  onPhotoSwipeTooltipClose,
  onImageCommentTooltipClose,
}) => {
  return (
    <View style={[styles.container, { height: imageHeight }]}>
      <Tooltip
        isVisible={showPhotoSwipeTooltip}
        content={
          <View style={{ backgroundColor: colors.card, padding: spacing[3], borderRadius: borderRadius.md }}>
            <Text style={{ color: colors.foreground, fontSize: fontSize.base }}>
              Tap or swipe left/right to view more photos
            </Text>
          </View>
        }
        placement="bottom"
        onClose={onPhotoSwipeTooltipClose}
        backgroundColor="rgba(0,0,0,0.5)"
      >
        <View style={styles.carouselAnchor}>
          <PhotoCarousel photos={photos} height={imageHeight} />
        </View>
      </Tooltip>
      
      {/* Approachable badge */}
      <Pressable style={styles.openToSayHiButton}>
        <Text variant="bodySmall" weight="semibold" style={styles.approachableText}>
          Approachable
        </Text>
      </Pressable>

      {/* Chat Bubble Icon */}
      <View style={styles.chatBubbleContainer}>
        <Tooltip
          isVisible={showImageCommentTooltip}
          content={
            <View style={{ backgroundColor: colors.card, padding: spacing[3], borderRadius: borderRadius.md }}>
              <Text style={{ color: colors.foreground, fontSize: fontSize.base }}>
                Tap to comment on this image
              </Text>
            </View>
          }
          placement="top"
          onClose={onImageCommentTooltipClose}
          backgroundColor="rgba(0,0,0,0.5)"
        >
          <Pressable onPress={() => !showImageCommentTooltip && onOpenImageChat()}>
            <View style={styles.chatBubble}>
              <MessageCircle size={14} color={colors.foreground} />
            </View>
          </Pressable>
        </Tooltip>
      </View>
    </View>
  );
});

PhotoSection.displayName = 'PhotoSection';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: SCREEN_WIDTH,
  },
  carouselAnchor: {
    width: '100%',
  },
  openToSayHiButton: {
    position: 'absolute',
    top: spacing[6],
    left: spacing[4],
    backgroundColor: `${colors.card}CC`, // 80% opacity
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  approachableText: {
    color: colors.primary,
  },
  chatBubbleContainer: {
    position: 'absolute',
    bottom: spacing[4],
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  chatBubble: {
    backgroundColor: `${colors.card}CC`, // 80% opacity
    borderRadius: borderRadius.full,
    padding: spacing[3],
  },
});
