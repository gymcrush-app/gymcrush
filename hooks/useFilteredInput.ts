/**
 * Hook for public-facing text inputs: shows censored preview and lets user replace wording.
 * Use for any text that is stored in DB and shown to others (display_name, bio, messages, etc.).
 */

import { useCallback, useMemo, useState } from 'react';
import { filterBadWords } from '@/lib/utils/filterBadWords';

type UseFilteredInputUncontrolled = (initialValue?: string) => {
  value: string;
  setValue: (v: string) => void;
  onChangeText: (text: string) => void;
  filteredPreview: string;
  hasBadWords: boolean;
  getFilteredValue: () => string;
};

type UseFilteredInputControlled = (options: {
  value: string;
  onChangeText: (text: string) => void;
}) => {
  value: string;
  onChangeText: (text: string) => void;
  filteredPreview: string;
  hasBadWords: boolean;
  getFilteredValue: () => string;
};

export const useFilteredInput: UseFilteredInputUncontrolled & UseFilteredInputControlled = (
  initialOrOptions?: string | { value: string; onChangeText: (text: string) => void }
) => {
  const isControlled =
    typeof initialOrOptions === 'object' && initialOrOptions !== null && 'value' in initialOrOptions;

  const [uncontrolledValue, setUncontrolledValue] = useState(
    typeof initialOrOptions === 'string' ? initialOrOptions : ''
  );

  const value = isControlled ? (initialOrOptions as { value: string }).value : uncontrolledValue;
  const onChangeTextParent = isControlled ? (initialOrOptions as { onChangeText: (t: string) => void }).onChangeText : undefined;

  const onChangeText = useCallback(
    (text: string) => {
      if (isControlled && onChangeTextParent) {
        onChangeTextParent(text);
      } else {
        setUncontrolledValue(text);
      }
    },
    [isControlled, onChangeTextParent]
  );

  const setValue = useCallback(
    (v: string) => {
      if (isControlled && onChangeTextParent) {
        onChangeTextParent(v);
      } else {
        setUncontrolledValue(v);
      }
    },
    [isControlled, onChangeTextParent]
  );

  const filteredPreview = useMemo(() => filterBadWords(value), [value]);
  const hasBadWords = value !== '' && filteredPreview !== value;

  const getFilteredValue = useCallback((): string => {
    return filterBadWords(value);
  }, [value]);

  return {
    value,
    setValue,
    onChangeText,
    filteredPreview,
    hasBadWords,
    getFilteredValue,
  };
};
