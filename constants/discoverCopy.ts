/**
 * Discover screen copy: tooltips, SwipeIndicator labels, and other UI strings.
 */

/** Tooltip: tap the preferences pill to adjust discovery preferences */
export const TOOLTIP_ADJUST_PREFERENCES = "Adjust discovery preferences"

/** Tooltip: tap or swipe to view more photos */
export const TOOLTIP_PHOTO_SWIPE = "Tap or swipe left/right to view more photos"

/** Tooltip: tap chat bubble to comment on photo */
export const TOOLTIP_IMAGE_COMMENT = "Tap to comment on this image"

/** Tooltip: swipe down to pass on profile */
export const TOOLTIP_SWIPE_DOWN = "Swipe down to pass on this profile"

/** Tooltip: swipe up to like profile */
export const TOOLTIP_SWIPE_UP = "Swipe up to like this profile"

/** SwipeIndicator label for pass action */
export const SWIPE_DOWN_LABEL = "Swipe down to pass"

/** Template for swipe-up match label; use getSwipeUpMatchLabel(name) to format */
export const SWIPE_UP_MATCH_LABEL_TEMPLATE = "Swipe up to match with {name}"

export function getSwipeUpMatchLabel(name: string): string {
  return SWIPE_UP_MATCH_LABEL_TEMPLATE.replace("{name}", name)
}
