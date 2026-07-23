import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import WebView from 'react-native-webview';
import { View } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { youTubeEmbedUrl, youTubeThumbnailUrl } from '@/lib/youtube';

export function YouTubeEmbed({ videoId, width = 240 }: { videoId: string; width?: number }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const height = (width * 9) / 16;

  if (isPlaying) {
    return (
      <View width={width} height={height} borderRadius={12} overflow="hidden" backgroundColor="black">
        <WebView
          source={{ uri: youTubeEmbedUrl(videoId) }}
          style={{ flex: 1 }}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
        />
      </View>
    );
  }

  return (
    <Pressable onPress={() => setIsPlaying(true)}>
      <View width={width} height={height} borderRadius={12} overflow="hidden" backgroundColor="black">
        <Image
          source={youTubeThumbnailUrl(videoId)}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
        <View
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          alignItems="center"
          justifyContent="center"
          backgroundColor="rgba(0,0,0,0.25)"
        >
          <View
            width={44}
            height={44}
            borderRadius={22}
            backgroundColor="rgba(255,255,255,0.94)"
            alignItems="center"
            justifyContent="center"
          >
            <IconlyIcon name="Play" size={18} color="#292f36" weight="fill" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
