import { Pressable } from 'react-native';
import { Text, View, YStack } from 'tamagui';

import { IconlyIcon } from '@/components/icons/iconly-icon';
import { getCategoryLabel } from '@/lib/event-utils';
import { palette } from '@/lib/palette';
import type { ActivityScope, EventCategory } from '@/lib/types';

export function EmptyEventsState({
  activityScope,
  activeCategory,
  onClear,
}: {
  activityScope: ActivityScope;
  activeCategory: EventCategory;
  onClear: () => void;
}) {
  const categoryLabel = getCategoryLabel(activeCategory).toLowerCase();
  const isGroupsScope = activityScope === 'groups';
  const itemLabel = isGroupsScope
    ? 'groups'
    : activityScope === 'events'
      ? 'events'
      : 'events or groups';

  return (
    <YStack
      minHeight={280}
      alignItems="center"
      justifyContent="center"
      borderRadius={20}
      borderWidth={1}
      borderStyle="dashed"
      borderColor="rgba(41,47,54,0.15)"
      backgroundColor="rgba(255,255,255,0.7)"
      padding={24}
      gap={8}
    >
      <View width={48} height={48} borderRadius={12} backgroundColor={palette.fog} alignItems="center" justifyContent="center">
        <IconlyIcon name={isGroupsScope ? 'UserPlus' : 'Calendar'} size={20} color={palette.slate} />
      </View>
      <Text fontSize={16} fontWeight="700" color={palette.ink} marginTop={8}>
        No {itemLabel} found
      </Text>
      <Text fontSize={14} lineHeight={22} color={palette.gray} textAlign="center">
        There are no {categoryLabel} {itemLabel} right now.
      </Text>
      <Pressable onPress={onClear}>
        <View borderRadius={12} backgroundColor={palette.ink} paddingHorizontal={14} paddingVertical={10} marginTop={8}>
          <Text color="white" fontWeight="700" fontSize={13}>
            {activityScope === 'popular' ? 'Show featured' : 'Show all activities'}
          </Text>
        </View>
      </Pressable>
    </YStack>
  );
}
