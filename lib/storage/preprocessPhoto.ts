/**
 * Resize + recompress a picked photo before upload.
 *
 * iPhone camera shots are ~12 MP (e.g. 3024×4032). Profile photos render at
 * roughly 1080×1440 even at 3x retina, so anything beyond ~1440 long-edge is
 * wasted bytes both ways (upload + download). We resize once on the device,
 * then ship the smaller file to Supabase.
 */

import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const TARGET_LONG_EDGE = 1440;
const JPEG_QUALITY = 0.8;

export async function preprocessPhoto(
  uri: string,
  width: number,
  height: number,
): Promise<string> {
  const longEdge = Math.max(width, height);
  if (longEdge <= TARGET_LONG_EDGE) return uri;

  const ratio = TARGET_LONG_EDGE / longEdge;
  const newWidth = Math.round(width * ratio);
  const newHeight = Math.round(height * ratio);

  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize({ width: newWidth, height: newHeight });
  const ref = await ctx.renderAsync();
  const result = await ref.saveAsync({
    compress: JPEG_QUALITY,
    format: SaveFormat.JPEG,
  });
  return result.uri;
}
