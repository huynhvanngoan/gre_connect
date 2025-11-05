# Mobile App Network Configuration

## Development Setup

The mobile app needs to connect to your development server using your computer's IP address, not `localhost`.

### Why?
- `localhost` on mobile device refers to the device itself, not your development machine
- Mobile devices need the actual IP address of your computer on the local network

### Current Configuration

The app is configured to use:
- **Development**: `http://192.168.100.174:5001/api/v1` (from `.env` file)
- **Production**: `https://gre-connect-omega.vercel.app/api/v1`

### Finding Your IP Address

**Windows:**
```bash
ipconfig
# Look for "IPv4 Address" under your active network adapter
```

**macOS/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
# Or
ip addr show | grep "inet "
```

### Updating Configuration

1. **Option 1: Update `.env` file**
   ```
   EXPO_PUBLIC_API_URL=http://YOUR_IP_ADDRESS:5001/api/v1
   ```

2. **Option 2: Use environment variable**
   ```bash
   export EXPO_PUBLIC_API_URL=http://YOUR_IP_ADDRESS:5001/api/v1
   ```

### Important Notes

- ✅ Backend must listen on `0.0.0.0` (already configured in `server.js`)
- ✅ Backend must be running on port 5001
- ✅ Both devices (computer and mobile) must be on the same network
- ✅ Firewall may need to allow connections on port 5001
- ⚠️ IP address may change if you reconnect to WiFi

### Testing Connection

1. Make sure backend is running:
   ```bash
   cd gre_connect/backend
   npm run dev
   ```

2. Test from mobile browser or use:
   ```bash
   curl http://YOUR_IP_ADDRESS:5001/api/v1/health
   ```

3. Restart Expo dev server after changing `.env`:
   ```bash
   # Stop current server (Ctrl+C)
   # Then restart
   npm start
   ```

