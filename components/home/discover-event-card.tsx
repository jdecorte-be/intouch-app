import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, useWindowDimensions } from 'react-native';
import { Text, View } from 'tamagui';

import { eventImageUrl } from '@/lib/event-data';
import { palette } from '@/lib/palette';
import type { EventItem } from '@/lib/types';

export function DiscoverEventCard({ event, onSelect }: { event: EventItem; onSelect: () => void }) {
  const { width } = useWindowDimensions();
  const cardWidth = width * 0.6;
  const isGroup = event.kind === 'group';

  return (
    <Pressable onPress={onSelect}>
      <View
        width={cardWidth}
        height={cardWidth * 0.72}
        borderRadius={20}
        overflow="hidden"
        backgroundColor={palette.mist}
      >
        {isGroup ? (
          <View flex={1} alignItems="center" justifyContent="center" backgroundColor={palette.fog}>
            <Text fontSize={40}>{event.icon}</Text>
          </View>
        ) : (
          <Image
            source={eventImageUrl(event)}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        )}

        <LinearGradient
          colors={['rgba(9,9,11,0)', 'rgba(9,9,11,0.7)']}
          locations={[0.4, 1]}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '65%' }}
        />

        <Text
          position="absolute"
          left={14}
          bottom={12}
          fontSize={17}
          fontWeight="700"
          color="white"
          numberOfLines={1}
        >
          {event.title}
        </Text>
      </View>
    </Pressable>
  );
}
