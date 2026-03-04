import { borderRadius, colors, spacing } from '@/theme';
import { Image } from 'expo-image';
import React, { useRef, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PhotoCarouselProps {
  photos: string[];
  height?: number;
}

const styles = StyleSheet.create({
  container: {
    height: 400,
    width: SCREEN_WIDTH,
  },
  paginationContainer: {
    position: 'absolute',
    bottom: spacing[1],
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[2],
  },
  paginationDot: {
    borderRadius: borderRadius.full,
  },
});

export function PhotoCarousel({ photos, height = 400 }: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  if (photos.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { height }]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {photos.map((photo, index) => (
          <Image
            key={index}
            source={{ uri: photo }}
            style={{ width: SCREEN_WIDTH, height }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ))}
      </ScrollView>
      
      {/* Pagination Dots */}
      {photos.length > 1 && (
        <View style={styles.paginationContainer}>
          {photos.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                {
                  width: index === currentIndex ? 8 : 6,
                  height: index === currentIndex ? 8 : 6,
                  backgroundColor: index === currentIndex ? colors.primary : 'rgba(255, 255, 255, 0.5)',
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}
