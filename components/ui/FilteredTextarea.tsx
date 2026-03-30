import React, { forwardRef } from 'react';
import { TextInput } from 'react-native';
import { CensoredPreview } from '@/components/ui/CensoredPreview';
import { Textarea } from '@/components/ui/Textarea';
import { useFilteredInput } from '@/hooks/useFilteredInput';

export type FilteredTextareaProps = React.ComponentProps<typeof Textarea> & {
  value: string;
  onChangeText: (text: string) => void;
};

/**
 * Textarea for public-facing text. Shows censored preview when input contains bad words.
 * Use for profile bio, prompt answers, messages, etc.
 */
export const FilteredTextarea = forwardRef<TextInput, FilteredTextareaProps>(
  ({ value, onChangeText, ...props }, ref) => {
    const filtered = useFilteredInput({ value, onChangeText });
    return (
      <>
        <Textarea
          ref={ref}
          {...props}
          value={filtered.value}
          onChangeText={filtered.onChangeText}
        />
        <CensoredPreview filtered={filtered.filteredPreview} show={filtered.hasBadWords} />
      </>
    );
  }
);

FilteredTextarea.displayName = 'FilteredTextarea';
