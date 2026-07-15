import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

export const canUseNativeModules =
  Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
