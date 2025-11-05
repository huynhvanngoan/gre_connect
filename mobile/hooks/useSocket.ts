import React from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { initSocket, getSocket, setSocketAuthToken } from '@/services/socket';

// Global flag để đảm bảo chỉ init socket 1 lần
let socketInitialized = false;

export function useSocket() {
  const { getToken, isSignedIn } = useAuth();
  const [connected, setConnected] = React.useState(false);
  const initializedRef = React.useRef(false);

  React.useEffect(() => {
    // Chỉ init socket 1 lần và khi user đã signed in
    if (initializedRef.current || !isSignedIn) {
      return;
    }

    let mounted = true;
    let socketInstance: any = null;

    (async () => {
      try {
        const token = await getToken?.({ skipCache: true });
        if (!token || !mounted) return;

        // Nếu đã có socket global, chỉ update token
        const existingSocket = getSocket();
        if (existingSocket && existingSocket.connected) {
          setSocketAuthToken(token);
          socketInstance = existingSocket;
        } else {
          // Init socket mới chỉ 1 lần
          if (!socketInitialized) {
            socketInitialized = true;
            initializedRef.current = true;
            setSocketAuthToken(token);
            socketInstance = await initSocket(token);
          } else {
            socketInstance = getSocket();
          }
        }

        if (!mounted || !socketInstance) return;

        const onConnect = () => {
          if (mounted) setConnected(true);
        };
        const onDisconnect = () => {
          if (mounted) setConnected(false);
        };

        socketInstance.on('connect', onConnect);
        socketInstance.on('disconnect', onDisconnect);

        // Set initial state
        if (socketInstance.connected) {
          setConnected(true);
        }
      } catch (error) {
        console.warn('Socket initialization error:', error);
      }
    })();

    return () => {
      mounted = false;
      // Không cleanup socket để tái sử dụng
    };
  }, [isSignedIn]); // Chỉ chạy khi isSignedIn thay đổi, không phụ thuộc vào getToken

  return { socket: getSocket(), connected };
}


