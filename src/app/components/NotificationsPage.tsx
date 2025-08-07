import { motion } from "framer-motion";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, User, Bell } from "lucide-react";

export interface Notification {
  _id: string;
  receiver: string;
  type: "like" | "comment" | "follow" | "message";
  sender: {
    _id: string;
    username: string;
    profilePic?: string;
  };
  content?: string;
  createdAt: string;
  read: boolean;
  post?: {
    _id: string;
    image?: string;
  };
}

interface NotificationsPageProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
}

export default function NotificationsPage({
  notifications,
  onMarkAsRead,
}: NotificationsPageProps) {
  console.log("Rendering notifications:", notifications);
  
  const getInitial = (u: Notification['sender']) => {
    const display = u.username || '';
    return display.charAt(0).toUpperCase() || '?';
  };

  // Handle empty notifications
  if (notifications.length === 0) {
    return (
      <motion.div
        key="notifications"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center h-full py-12"
      >
        <div className="text-center">
          <Bell className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No notifications yet</h2>
          <p className="text-gray-500">
            Your notifications will appear here
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key="notifications"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="px-4 py-4"
    >
      {/* Debug view - shows raw notification data */}
      {/* <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg">
        <h3 className="font-bold mb-2">Debug Info</h3>
        <pre className="text-xs whitespace-pre-wrap break-words">
          {JSON.stringify(notifications, null, 2)}
        </pre>
      </div> */}

      <div className="space-y-2">
        {notifications.map((notification, idx) => {
          const id = notification._id;
          const user = notification.sender;
          
          // Determine content based on type
          let content = notification.content;
          if (!content) {
            switch (notification.type) {
              case 'like': content = 'liked your post'; break;
              case 'comment': content = 'commented on your post'; break;
              case 'follow': content = 'started following you'; break;
              case 'message': content = 'sent you a message'; break;
              default: content = 'performed an action';
            }
          }
          
          const timestamp = new Date(notification.createdAt).toLocaleString();

          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onMarkAsRead(id)}
              className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-colors
                ${!notification.read
                  ? 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                }
              `}
            >
              <div className="relative">
                <Avatar className="w-10 h-10">
                  <AvatarImage 
                    src={user.profilePic || '/placeholder.svg'} 
                    alt={user.username}
                  />
                  <AvatarFallback>{getInitial(user)}</AvatarFallback>
                </Avatar>
                
                {/* Notification type badges */}
                {notification.type === 'like' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 + idx * 0.1 }}
                    className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                  >
                    <Heart className="w-3 h-3 text-white fill-white" />
                  </motion.div>
                )}
                
                {notification.type === 'comment' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 + idx * 0.1 }}
                    className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"
                  >
                    <MessageCircle className="w-3 h-3 text-white fill-white" />
                  </motion.div>
                )}
                
                {notification.type === 'follow' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 + idx * 0.1 }}
                    className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
                  >
                    <User className="w-3 h-3 text-white" />
                  </motion.div>
                )}
                
                {notification.type === 'message' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 + idx * 0.1 }}
                    className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center"
                  >
                    <MessageCircle className="w-3 h-3 text-white" />
                  </motion.div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-black dark:text-white">
                  <span className="font-semibold">
                    {user.username}
                  </span>{' '}{content}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {timestamp}
                </p>
                
                {/* Show comment text if available */}
                {notification.type === 'comment' && notification.content && (
                  <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                    "{notification.content}"
                  </div>
                )}
              </div>

              {/* Show post image thumbnail */}
              {notification.post?.image && (
                <motion.div 
                  className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"
                  whileHover={{ scale: 1.05 }}
                >
                  <Image 
                    src={notification.post.image} 
                    alt="Post thumbnail" 
                    fill
                    className="object-cover"
                  />
                </motion.div>
              )}

              {/* Unread indicator */}
              {!notification.read && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}