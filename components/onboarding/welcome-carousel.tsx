import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, XStack, YStack } from 'tamagui';

const unsplashPhoto = (photoId: string) =>
  `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=1000&q=75`;

type IntroSlide = {
  key: string;
  image: string;
  title: string;
  description: string;
  allowSkip: boolean;
  cta: string;
};

const slides: IntroSlide[] = [
  {
    key: 'discover',
    image: unsplashPhoto('photo-1592753054398-9fa298d40e85'),
    title: "See what's happening\naround you",
    description: 'From concerts to tech meetups, art shows to sports events - find what excites you',
    allowSkip: true,
    cta: 'Next',
  },
  {
    key: 'friends',
    image: unsplashPhoto('photo-1531482615713-2afd69097998'),
    title: 'Friends are already\ngoing places',
    description: "See who's in before you RSVP, so you never show up to a room of strangers",
    allowSkip: true,
    cta: 'Next',
  },
  {
    key: 'join',
    image: unsplashPhoto('photo-1492684223066-81342ee5ff30'),
    title: 'Join in one tap,\nno hassle',
    description: 'Save your spot instantly and keep every plan in one place',
    allowSkip: false,
    cta: 'Get Started',
  },
];

export function WelcomeCarousel({ onFinish }: { onFinish: () => void }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const slide = slides[index];
  const isLast = index === slides.length - 1;

  const goToIndex = (nextIndex: number) => {
    scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    setIndex(nextIndex);
  };

  const handleNext = () => {
    if (isLast) {
      onFinish();
      return;
    }

    goToIndex(index + 1);
  };

  const handleSkip = () => {
    onFinish();
  };

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setIndex(nextIndex);
  };

  return (
    <View flex={1} backgroundColor="#0B0B0D">
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
      >
        {slides.map((item) => (
          <View key={item.key} width={width} height="100%">
            <Image source={item.image} style={StyleSheet.absoluteFillObject} contentFit="cover" />
            <LinearGradient
              colors={['rgba(11,11,13,0.05)', 'rgba(11,11,13,0.55)', 'rgba(11,11,13,0.97)']}
              locations={[0, 0.55, 1]}
              style={StyleSheet.absoluteFillObject}
            />

            <YStack position="absolute" left={20} right={20} bottom={insets.bottom + 108} gap={12}>
              <Text fontSize={30} lineHeight={36} fontWeight="800" color="#FFFFFF">
                {item.title}
              </Text>
              <Text fontSize={14} lineHeight={21} color="rgba(255,255,255,0.72)">
                {item.description}
              </Text>
            </YStack>
          </View>
        ))}
      </ScrollView>

      <XStack
        position="absolute"
        top={insets.top + 12}
        left={20}
        right={20}
        alignItems="center"
        gap={12}
      >
        <XStack flex={1} gap={6}>
          {slides.map((item, dotIndex) => (
            <View
              key={item.key}
              flex={1}
              height={3}
              borderRadius={999}
              backgroundColor="rgba(255,255,255,0.28)"
              overflow="hidden"
            >
              <View
                height="100%"
                width={dotIndex <= index ? '100%' : '0%'}
                backgroundColor="#FFFFFF"
                borderRadius={999}
              />
            </View>
          ))}
        </XStack>

        <Pressable
          onPress={handleSkip}
          hitSlop={10}
          disabled={!slide.allowSkip}
          style={{ opacity: slide.allowSkip ? 1 : 0 }}
        >
          <Text fontSize={14} fontWeight="700" color="#FFFFFF">
            Skip
          </Text>
        </Pressable>
      </XStack>

      <YStack position="absolute" left={20} right={20} bottom={insets.bottom + 24}>
        <Pressable onPress={handleNext} style={styles.ctaButton}>
          <Text fontSize={15} fontWeight="800" color="#111114">
            {slide.cta}
          </Text>
        </Pressable>
      </YStack>
    </View>
  );
}

const styles = StyleSheet.create({
  ctaButton: {
    height: 52,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
