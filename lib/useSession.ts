import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useRouter } from 'expo-router';

export function useSessionRedirect() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        router.replace('/home');
      } else {
        router.replace('/login');
      }

      setLoading(false);
    };

    checkSession();
  }, []);

  return { loading };
}
