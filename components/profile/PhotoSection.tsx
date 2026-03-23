import { PhotoCarousel } from '@/components/profile/PhotoCarousel';
import { Text } from '@/components/ui/Text';
import { TOOLTIP_IMAGE_COMMENT, TOOLTIP_PHOTO_SWIPE } from '@/constants';
import { borderRadius, colors, fontSize, palette, spacing } from '@/theme';
import { MessageCircle } from 'lucide-react-native';
import React from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import Tooltip from 'react-native-walkthrough-tooltip';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Horizontal inset for discover card photos (rounded edges) */
export const PHOTO_INSET = 12; // spacing[3]
export const DISCOVER_PHOTO_WIDTH = SCREEN_WIDTH - 2 * PHOTO_INSET;

interface PhotoSectionProps {
  photos: string[];
  imageHeight: number;
  /** Width of the photo area (default full screen). Use DISCOVER_PHOTO_WIDTH for inset + rounded corners. */
  photoWidth?: number;
  onOpenImageChat: () => void;
  showPhotoSwipeTooltip?: boolean;
  showImageCommentTooltip?: boolean;
  onPhotoSwipeTooltipClose?: () => void;
  onImageCommentTooltipClose?: () => void;
}

export const PhotoSection = React.memo<PhotoSectionProps>(({
  photos,
  imageHeight,
  photoWidth = SCREEN_WIDTH,
  onOpenImageChat,
  showPhotoSwipeTooltip = false,
  showImageCommentTooltip = false,
  onPhotoSwipeTooltipClose,
  onImageCommentTooltipClose,
}) => {
  const useInset = photoWidth < SCREEN_WIDTH;
  const containerStyle = useInset
    ? [styles.container, { height: imageHeight }, styles.insetContainer, { width: photoWidth }]
    : [styles.container, { height: imageHeight }];
  const carouselWrapperStyle = useInset ? [styles.carouselAnchor, styles.roundedOverflow] : styles.carouselAnchor;

  return (
    <View style={containerStyle}>
      <Tooltip
        isVisible={showPhotoSwipeTooltip}
        allowChildInteraction={false}
        contentStyle={{ backgroundColor: colors.primary, padding: 0, borderRadius: borderRadius.md }}
        content={
          <View style={{ backgroundColor: colors.primary, padding: spacing[3], borderRadius: borderRadius.md }}>
            <Text style={{ color: palette.black, fontSize: fontSize.base }}>
              {TOOLTIP_PHOTO_SWIPE}
            </Text>
          </View>
        }
        placement="bottom"
        onClose={onPhotoSwipeTooltipClose}
        backgroundColor="rgba(0,0,0,0.5)"
      >
        <View style={carouselWrapperStyle}>
          <PhotoCarousel photos={photos} height={imageHeight} width={photoWidth} />
        </View>
      </Tooltip>

      {/* Chat Bubble Icon */}
      <View style={styles.chatBubbleContainer}>
        <Tooltip
          isVisible={showImageCommentTooltip}
          allowChildInteraction={false}
          contentStyle={{ backgroundColor: colors.primary, padding: 0, borderRadius: borderRadius.md }}
          content={
            <View style={{ backgroundColor: colors.primary, padding: spacing[3], borderRadius: borderRadius.md }}>
              <Text style={{ color: palette.black, fontSize: fontSize.base }}>
                {TOOLTIP_IMAGE_COMMENT}
              </Text>
            </View>
          }
          placement="top"
          onClose={onImageCommentTooltipClose}
          backgroundColor="rgba(0,0,0,0.5)"
        >
          <Pressable
            onPress={() => !showImageCommentTooltip && onOpenImageChat()}
            style={{ opacity: showImageCommentTooltip ? 0.5 : 1 }}
          >
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
  insetContainer: {
    alignSelf: 'center',
    marginHorizontal: PHOTO_INSET,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  carouselAnchor: {
    width: '100%',
  },
  roundedOverflow: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
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
