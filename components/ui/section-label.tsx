import { Text } from 'tamagui';

import { palette } from '@/lib/palette';

export function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      fontSize={11}
      fontWeight="700"
      letterSpacing={1.4}
      textTransform="uppercase"
      color={palette.silver}
    >
      {children}
    </Text>
  );
}
