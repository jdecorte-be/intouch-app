import { useRouter } from 'expo-router';

import { WelcomeCarousel } from '@/components/onboarding/welcome-carousel';
import { useSessionStore } from '@/stores/session-store';

export default function WelcomeRoute() {
  const router = useRouter();
  const markWelcomeSeen = useSessionStore((state) => state.markWelcomeSeen);

  const handleFinish = () => {
    markWelcomeSeen();
    router.replace('/auth');
  };

  return <WelcomeCarousel onFinish={handleFinish} />;
}
