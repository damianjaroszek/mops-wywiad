import { useRef, useState, useCallback } from "react";
import { ScrollView, NativeSyntheticEvent, NativeScrollEvent } from "react-native";

export function useScrollGuard() {
  const scrollRef = useRef<ScrollView>(null);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [warned, setWarned] = useState(false);

  const checkBottom = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const atBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 80;
    setIsAtBottom(atBottom);
  }, []);

  const tryNext = useCallback(
    (proceed: () => void) => {
      if (isAtBottom || warned) {
        proceed();
      } else {
        setWarned(true);
        scrollRef.current?.scrollToEnd({ animated: true });
      }
    },
    [isAtBottom, warned]
  );

  const scrollToEnd = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  return {
    scrollRef,
    isAtBottom,
    scrollProps: {
      onScroll: checkBottom,
      onMomentumScrollEnd: checkBottom,
      onScrollEndDrag: checkBottom,
      scrollEventThrottle: 16,
    } as const,
    tryNext,
    scrollToEnd,
  };
}
