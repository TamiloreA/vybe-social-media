export function getStatus(lastSeen: Date): string {
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / 60000);
    
    if (diffMinutes < 2) return 'Active now';
    if (diffMinutes < 60) return `Active ${diffMinutes} min ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `Active ${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    return `Seen ${new Date(lastSeen).toLocaleDateString()}`;
  }