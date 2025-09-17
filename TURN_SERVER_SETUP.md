# WebRTC TURN Server Configuration Guide

This guide explains how to set up TURN servers for your WebRTC streaming implementation.

## Why TURN Servers are Needed

TURN (Traversal Using Relays around NAT) servers are essential for WebRTC applications because:

1. **NAT Traversal**: Many users are behind NATs or firewalls that prevent direct peer-to-peer connections
2. **Symmetric NATs**: Some NAT configurations require relaying traffic through a server
3. **Corporate Firewalls**: Enterprise networks often block direct P2P connections
4. **Mobile Networks**: Cellular networks frequently use NATs that require TURN servers

## TURN Server Options

### Option 1: Self-Hosted Coturn Server

**Installation on Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install coturn
```

**Configuration (/etc/turnserver.conf):**
```
# Listening port for TURN server
listening-port=3478
tls-listening-port=5349

# Listening IP (use 0.0.0.0 for all interfaces)
listening-ip=0.0.0.0

# External IP (your server's public IP)
external-ip=YOUR_PUBLIC_IP

# Realm for authentication
realm=your-domain.com
server-name=your-turn-server.com

# Use long-term credentials
lt-cred-mech

# Add user credentials
user=username:password

# SSL/TLS certificates (for TURNS)
cert=/etc/ssl/certs/turn_server_cert.pem
pkey=/etc/ssl/private/turn_server_pkey.pem

# Security settings
fingerprint
use-auth-secret
static-auth-secret=your-secret-key

# Logging
no-stdout-log
log-file=/var/log/turnserver.log
simple-log

# Performance settings
max-bps=1000000
no-multicast-peers
no-loopback-peers
```

**Start the service:**
```bash
sudo systemctl enable coturn
sudo systemctl start coturn
```

### Option 2: Docker Deployment

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  coturn:
    image: coturn/coturn:latest
    restart: unless-stopped
    ports:
      - "3478:3478"
      - "3478:3478/udp"
      - "5349:5349"
      - "5349:5349/udp"
      - "49152-65535:49152-65535/udp"
    environment:
      - TURNSERVER_CONF=/etc/turnserver.conf
    volumes:
      - ./turnserver.conf:/etc/turnserver.conf
      - ./ssl:/etc/ssl
    command: ["-c", "/etc/turnserver.conf"]
```

### Option 3: Cloud TURN Services

**Metered TURN Service:**
```javascript
const turnConfig = {
  urls: [
    'turn:global.relay.metered.ca:80',
    'turn:global.relay.metered.ca:443'
  ],
  username: 'your-api-key',
  credential: 'your-secret-key'
};
```

**Twilio TURN Service:**
```javascript
// Use Twilio's Network Traversal Service
const turnConfig = {
  urls: 'turn:global.turn.twilio.com:3478?transport=udp',
  username: 'your-twilio-username',
  credential: 'your-twilio-credential'
};
```

## Frontend Configuration

### Using the WebRTC Service

```typescript
import { WebRTCStreamingService } from './lib/webrtcStreamingService';

// Initialize service
const webrtcService = new WebRTCStreamingService(actor);

// Configure TURN servers
const turnServers = [
  {
    urls: 'turn:your-turn-server.com:3478',
    username: 'your-username',
    credential: 'your-password',
    credentialType: 'password' as const
  },
  {
    urls: 'turns:your-turn-server.com:5349',
    username: 'your-username', 
    credential: 'your-password',
    credentialType: 'password' as const
  }
];

webrtcService.configureTurnServers(turnServers);
```

### Environment Variables

Create a `.env.local` file in your frontend directory:

```env
# TURN Server Configuration
VITE_TURN_SERVER_URL=your-turn-server.com:3478
VITE_TURN_USERNAME=your-username
VITE_TURN_PASSWORD=your-password

# STUN Server Configuration (optional override)
VITE_STUN_SERVER_URL=stun:stun.l.google.com:19302
```

## Security Considerations

### Authentication Methods

1. **Long-term Credentials**: Username/password pairs stored on server
2. **Short-term Credentials**: Time-limited credentials generated dynamically
3. **Secret-based Authentication**: Shared secret for generating credentials

### Best Practices

1. **Use HTTPS/WSS**: Always use encrypted connections
2. **Rotate Credentials**: Change TURN server credentials regularly
3. **Limit Bandwidth**: Set reasonable bandwidth limits per user
4. **Monitor Usage**: Track TURN server usage and costs
5. **Firewall Rules**: Restrict TURN server access to your application

## Testing TURN Server Setup

### Command Line Testing

```bash
# Test TURN server connectivity
turnutils_uclient -T -t -u username -w password your-turn-server.com
```

### Frontend Testing

```javascript
// Test TURN server in browser
const testTurnServer = async () => {
  const pc = new RTCPeerConnection({
    iceServers: [
      {
        urls: 'turn:your-turn-server.com:3478',
        username: 'your-username',
        credential: 'your-password'
      }
    ]
  });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log('ICE Candidate:', event.candidate);
      // Check if candidate.type === 'relay' for TURN usage
      if (event.candidate.type === 'relay') {
        console.log('TURN server is working!');
      }
    }
  };

  // Create a data channel to trigger ICE gathering
  pc.createDataChannel('test');
  
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
};
```

## Troubleshooting

### Common Issues

1. **Firewall Blocking**: Ensure ports 3478 (TURN) and 5349 (TURNS) are open
2. **UDP Range**: Open UDP ports 49152-65535 for media relay
3. **SSL Certificates**: Valid certificates required for TURNS
4. **Credentials**: Verify username/password are correct
5. **Network Policies**: Corporate networks may block TURN traffic

### Debug Commands

```bash
# Check if TURN server is running
sudo netstat -tuln | grep 3478

# View TURN server logs
sudo tail -f /var/log/turnserver.log

# Test network connectivity
telnet your-turn-server.com 3478
```

### Browser Debug

```javascript
// Enable WebRTC debugging in Chrome
// chrome://webrtc-internals/

// Log ICE candidates to see TURN usage
pc.onicecandidate = (event) => {
  if (event.candidate) {
    console.log('Candidate type:', event.candidate.type);
    console.log('Candidate protocol:', event.candidate.protocol);
    console.log('Full candidate:', event.candidate);
  }
};
```

## Cost Considerations

### Self-Hosted Costs
- Server hosting: $10-50/month depending on size
- Bandwidth: $0.08-0.12 per GB transferred
- SSL certificates: Free with Let's Encrypt

### Cloud Service Costs
- Metered: $0.40 per GB
- Twilio: $0.40 per GB
- AWS/Google: $0.08-0.15 per GB

### Optimization Tips
1. Use STUN first, fallback to TURN
2. Implement connection retry logic
3. Monitor and limit concurrent connections
4. Use bandwidth-efficient video codecs
5. Implement adaptive bitrate streaming

## Integration with Internet Computer

### Canister Configuration

Your Motoko canister can store TURN server credentials securely:

```motoko
// In your canister
private stable var turnServerConfig = {
  url = "turn:your-turn-server.com:3478";
  username = "your-username"; 
  credential = "your-password";
};

public query func getTurnConfig() : async {url: Text; username: Text; credential: Text} {
  turnServerConfig
};
```

### Dynamic Credentials

For production, consider generating short-term credentials:

```motoko
import Time "mo:base/Time";
import Text "mo:base/Text";

// Generate time-limited TURN credentials
public func generateTurnCredentials(userId: Principal) : async {username: Text; credential: Text; ttl: Int} {
  let timestamp = Time.now() + 3600_000_000_000; // 1 hour from now
  let username = Int.toText(timestamp) # ":" # Principal.toText(userId);
  let credential = generateHMACCredential(username, sharedSecret);
  
  {
    username = username;
    credential = credential; 
    ttl = timestamp;
  }
};
```

This setup ensures your WebRTC streaming works reliably across different network conditions and provides a production-ready foundation for your streaming application.