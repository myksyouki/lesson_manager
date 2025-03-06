import { Redirect } from 'expo-router';
import { useAuthStore } from './store/auth';

export default function Index() {
  const { user } = useAuthStore();
  
  // Redirect to the appropriate screen based on authentication status
  return user ? <Redirect href="/(tabs)" /> : <Redirect href="/login" />;
}

