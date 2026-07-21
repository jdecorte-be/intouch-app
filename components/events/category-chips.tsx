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
  categoryCounts,
}: {
  activeCategory: EventCategory;
  onCategoryChange: (category: EventCategory) => void;
  onMap?: boolean;
  /**
   * When provided, restricts the chip row to categories with at least one
   * marker in it (plus "featured" and the active category, so the active
   * chip never disappears out from under the user), and shows each chip's
   * marker count as a badge.
   */
  categoryCounts?: Partial<Record<EventCategory, number>>;
}) {
  const visibleCategories = categoryCounts
    ? categories.filter(
        (category) =>
          category.id === 'featured' ||
          category.id === activeCategory ||
          (categoryCounts[category.id] ?? 0) > 0,
      )
    : categories;

  const totalCount = categoryCounts
    ? Object.values(categoryCounts).reduce((sum: number, count) => sum + (count ?? 0), 0)
    : null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingHorizontal: onMap ? 12 : 0, paddingVertical: 4 }}
    >
      {visibleCategories.map((category) => {
        const isActive = activeCategory === category.id;
        const count = categoryCounts
          ? category.id === 'featured'
            ? totalCount
            : (categoryCounts[category.id] ?? 0)
          : null;

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
              {count !== null ? (
                <XStack
                  minWidth={18}
                  height={18}
                  paddingHorizontal={4}
                  borderRadius={999}
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor={isActive ? 'rgba(255,255,255,0.24)' : palette.fog}
                >
                  <Text
                    fontSize={10}
                    fontWeight="800"
                    color={isActive ? 'white' : palette.slate}
                  >
                    {count}
                  </Text>
                </XStack>
              ) : null}
            </XStack>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
