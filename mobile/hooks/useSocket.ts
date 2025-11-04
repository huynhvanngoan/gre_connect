import React from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { initSocket, getSocket, setSocketAuthToken } from '@/services/socket';

export function useSocket() {
  const { getToken } = useAuth();
  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = await getToken?.({ skipCache: true });
        if (token) setSocketAuthToken(token);
        const s = await initSocket(token || undefined);
        if (!mounted) return;
        const onConnect = () => setConnected(true);
        const onDisconnect = () => setConnected(false);
        s.on('connect', onConnect);
        s.on('disconnect', onDisconnect);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, [getToken]);

  return { socket: getSocket(), connected };
}


