import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, XStack, YStack } from 'tamagui';

import { SearchBar } from '@/components/events/search-bar';
import { IconlyIcon } from '@/components/icons/iconly-icon';
import {
  fetchTrendingMedia,
  isKlipyConfigured,
  reportMediaShare,
  searchMedia,
  type KlipyMediaItem,
  type KlipyMediaType,
} from '@/lib/klipy';
import { palette } from '@/lib/palette';

const SEARCH_DEBOUNCE_MS = 350;
const END_REACHED_THRESHOLD_PX = 400;
const TAB_HEIGHT = 34;

const TABS: { type: KlipyMediaType; label: string }[] = [
  { type: 'gifs', label: 'GIFs' },
  { type: 'stickers', label: 'Sticker' },
  { type: 'clips', label: 'Clips' },
];

// Greedy shortest-column-first bin-packing: gives a Pinterest-style masonry
// grid without pulling in a masonry list dependency for two columns.
function splitIntoColumns(items: KlipyMediaItem[], columnCount: number) {
  const columns: KlipyMediaItem[][] = Array.from({ length: columnCount }, () => []);
  const heights = new Array(columnCount).fill(0);

  for (const item of items) {
    let shortest = 0;

    for (let index = 1; index < columnCount; index += 1) {
      if (heights[index] < heights[shortest]) {
        shortest = index;
      }
    }

    columns[shortest].push(item);
    heights[shortest] += 1 / item.aspectRatio;
  }

  return columns;
}

export function GifPickerModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (gifUrl: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [mediaType, setMediaType] = useState<KlipyMediaType>('gifs');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KlipyMediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const tabLayouts = useRef<Partial<Record<KlipyMediaType, { x: number; width: number }>>>({});
  const hasPositionedIndicator = useRef(false);
  const [tabLayoutVersion, setTabLayoutVersion] = useState(0);
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  const handleTabLayout = (type: KlipyMediaType) => (event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    tabLayouts.current[type] = { x, width };
    setTabLayoutVersion((version) => version + 1);
  };

  useEffect(() => {
    const layout = tabLayouts.current[mediaType];

    if (!layout) {
      return;
    }

    if (!hasPositionedIndicator.current) {
      indicatorX.value = layout.x;
      indicatorWidth.value = layout.width;
      hasPositionedIndicator.current = true;
      return;
    }

    indicatorX.value = withTiming(layout.x, { duration: 220 });
    indicatorWidth.value = withTiming(layout.width, { duration: 220 });
  }, [mediaType, tabLayoutVersion, indicatorX, indicatorWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
  }));

  useEffect(() => {
    if (!visible) {
      return;
    }

    if (!isKlipyConfigured()) {
      setError('GIF search needs a Klipy API key (EXPO_PUBLIC_KLIPY_API_KEY).');
      return;
    }

    const trimmed = query.trim();
    const currentRequest = ++requestId.current;

    setIsLoading(true);
    setError(null);

    const timeout = setTimeout(() => {
      const request = trimmed ? searchMedia(mediaType, trimmed, 1) : fetchTrendingMedia(mediaType, 1);

      request
        .then(({ results: firstPage, hasNext: next }) => {
          if (requestId.current !== currentRequest) {
            return;
          }
          setResults(firstPage);
          setPage(1);
          setHasNext(next);
        })
        .catch(() => {
          if (requestId.current === currentRequest) {
            setError("Couldn't load results. Try again.");
          }
        })
        .finally(() => {
          if (requestId.current === currentRequest) {
            setIsLoading(false);
          }
        });
    }, trimmed ? SEARCH_DEBOUNCE_MS : 0);

    return () => clearTimeout(timeout);
  }, [query, visible, mediaType]);

  useEffect(() => {
    if (!visible) {
      setMediaType('gifs');
      setQuery('');
      setResults([]);
      setError(null);
      setPage(1);
      setHasNext(false);
    }
  }, [visible]);

  const loadMore = useCallback(() => {
    if (!hasNext || isLoading || isLoadingMore) {
      return;
    }

    const trimmed = query.trim();
    const nextPage = page + 1;
    const currentRequest = requestId.current;

    setIsLoadingMore(true);

    const request = trimmed
      ? searchMedia(mediaType, trimmed, nextPage)
      : fetchTrendingMedia(mediaType, nextPage);

    request
      .then(({ results: nextResults, hasNext: next }) => {
        if (requestId.current !== currentRequest) {
          return;
        }
        setResults((previous) => [...previous, ...nextResults]);
        setPage(nextPage);
        setHasNext(next);
      })
      .catch(() => {
        // Leave hasNext as-is so scrolling back to the end just retries.
      })
      .finally(() => {
        if (requestId.current === currentRequest) {
          setIsLoadingMore(false);
        }
      });
  }, [hasNext, isLoading, isLoadingMore, mediaType, page, query]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;

    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - END_REACHED_THRESHOLD_PX) {
      loadMore();
    }
  };

  const selectItem = (item: KlipyMediaItem) => {
    reportMediaShare(mediaType, item.id);
    onSelect(item.sendUrl);
  };

  const columns = useMemo(() => splitIntoColumns(results, 2), [results]);
  const activeTabLabel = TABS.find((tab) => tab.type === mediaType)?.label ?? 'GIFs';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View flex={1} backgroundColor={palette.white} paddingTop={12}>
        <XStack justifyContent="center" paddingBottom={12}>
          <XStack backgroundColor={palette.fog} borderRadius={999} padding={3}>
            <View position="relative" flexDirection="row">
              <Animated.View style={[styles.indicator, indicatorStyle]} />
              {TABS.map((tab) => {
                const isActive = mediaType === tab.type;

                return (
                  <Pressable
                    key={tab.type}
                    onPress={() => setMediaType(tab.type)}
                    onLayout={handleTabLayout(tab.type)}
                    hitSlop={4}
                  >
                    <View height={TAB_HEIGHT} paddingHorizontal={16} alignItems="center" justifyContent="center">
                      <Text fontSize={13} fontWeight="800" color={isActive ? palette.ink : palette.gray}>
                        {tab.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </XStack>
        </XStack>

        <XStack alignItems="center" gap={10} paddingHorizontal={16} paddingBottom={12}>
          <View flex={1}>
            <SearchBar query={query} placeholder={`Search ${activeTabLabel.toLowerCase()}`} autoFocus onQueryChange={setQuery} />
          </View>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text fontSize={14} fontWeight="700" color={palette.gray}>
              Cancel
            </Text>
          </Pressable>
        </XStack>

        {error ? (
          <View flex={1} alignItems="center" justifyContent="center" paddingHorizontal={32}>
            <Text fontSize={14} textAlign="center" color={palette.gray}>
              {error}
            </Text>
          </View>
        ) : isLoading && !results.length ? (
          <View flex={1} alignItems="center" justifyContent="center">
            <ActivityIndicator color={palette.gray} />
          </View>
        ) : results.length ? (
          <ScrollView
            contentContainerStyle={{ padding: 8, paddingBottom: insets.bottom + 16 }}
            onScroll={handleScroll}
            scrollEventThrottle={200}
          >
            <XStack gap={8} alignItems="flex-start">
              {columns.map((column, columnIndex) => (
                <YStack key={columnIndex} flex={1} gap={8}>
                  {column.map((item) => (
                    <Pressable key={item.id} onPress={() => selectItem(item)}>
                      <View
                        width="100%"
                        aspectRatio={item.aspectRatio}
                        borderRadius={10}
                        overflow="hidden"
                        backgroundColor="#f0f1f3"
                      >
                        <Image source={item.previewUrl} style={{ flex: 1 }} contentFit="cover" />
                      </View>
                    </Pressable>
                  ))}
                </YStack>
              ))}
            </XStack>
            {isLoadingMore ? (
              <View paddingVertical={16}>
                <ActivityIndicator color={palette.gray} />
              </View>
            ) : null}
          </ScrollView>
        ) : (
          <View flex={1} paddingTop={40} alignItems="center">
            <IconlyIcon name="Search" size={22} color={palette.gray} />
            <Text marginTop={8} fontSize={13} color={palette.gray}>
              No results found.
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  indicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: TAB_HEIGHT,
    borderRadius: 999,
    backgroundColor: palette.white,
    shadowColor: palette.ink,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
