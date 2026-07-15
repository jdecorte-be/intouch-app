import { Pressable, ScrollView } from 'react-native';
import { Text, XStack } from 'tamagui';

import { categories } from '@/lib/event-data';
import { getMobileCategoryControlLabel } from '@/lib/event-utils';
import { palette } from '@/lib/palette';
import type { EventCategory } from '@/lib/types';

export function CategoryChips({
  activeCategory,
  onCategoryChange,
  onMap = false,
}: {
  activeCategory: EventCategory;
  onCategoryChange: (category: EventCategory) => void;
  onMap?: boolean;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingHorizontal: onMap ? 12 : 0, paddingVertical: 4 }}
    >
      {categories.map((category) => {
        const isActive = activeCategory === category.id;

        return (
          <Pressable key={category.id} onPress={() => onCategoryChange(category.id)}>
            <XStack
              height={34}
              alignItems="center"
              gap={6}
              paddingHorizontal={13}
              borderRadius={999}
              backgroundColor={isActive ? palette.ink : 'rgba(255,255,255,0.96)'}
              borderWidth={1}
              borderColor={isActive ? palette.ink : 'rgba(41,47,54,0.1)'}
              shadowColor="#0f172a"
              shadowOpacity={onMap ? 0.12 : 0}
              shadowRadius={6}
              shadowOffset={{ width: 0, height: 3 }}
              elevation={onMap ? 3 : 0}
            >
              <Text fontSize={13}>{category.emoji}</Text>
              <Text
                fontSize={12}
                fontWeight={isActive ? '800' : '600'}
                color={isActive ? 'white' : palette.inkSoft}
              >
                {getMobileCategoryControlLabel(category.id)}
              </Text>
            </XStack>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
