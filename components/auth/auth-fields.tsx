import { Eye, EyeSlash } from 'iconsax-react-native';
import { type ReactNode, useState } from 'react';
import { Pressable, TextInput } from 'react-native';
import { Text, View, YStack } from 'tamagui';

import { authStyles, dark } from './auth-styles';

export function AuthInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoComplete,
  keyboardType,
  rightAdornment,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoComplete?: 'email' | 'name' | 'password' | 'current-password' | 'new-password';
  keyboardType?: 'default' | 'email-address';
  rightAdornment?: ReactNode;
}) {
  return (
    <YStack gap={8}>
      <Text fontSize={13} fontWeight="600" color={dark.textSecondary}>
        {label}
      </Text>
      <View justifyContent="center">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={dark.textSecondary}
          secureTextEntry={secureTextEntry}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
          autoComplete={autoComplete}
          keyboardType={keyboardType}
          style={[authStyles.input, rightAdornment ? { paddingRight: 48 } : null]}
        />
        {rightAdornment ? (
          <View position="absolute" right={16} top={0} bottom={0} justifyContent="center">
            {rightAdornment}
          </View>
        ) : null}
      </View>
    </YStack>
  );
}

export function PasswordInput({
  label,
  value,
  onChangeText,
  autoComplete,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  autoComplete: 'password' | 'current-password' | 'new-password';
}) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <AuthInput
      label={label}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={!isVisible}
      autoComplete={autoComplete}
      rightAdornment={
        <Pressable onPress={() => setIsVisible((current) => !current)} hitSlop={10}>
          {isVisible ? (
            <Eye color={dark.textSecondary} size={20} />
          ) : (
            <EyeSlash color={dark.textSecondary} size={20} />
          )}
        </Pressable>
      }
    />
  );
}

export function AuthErrorMessage({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <View borderRadius={12} backgroundColor={dark.dangerSoft} padding={12}>
      <Text fontSize={13} fontWeight="600" color={dark.dangerText}>
        {message}
      </Text>
    </View>
  );
}
