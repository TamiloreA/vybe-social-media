"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Share,
  Bookmark,
  Plus,
  Home,
  Search,
  Bell,
  User,
  Moon,
  Sun,
  Send,
  Phone,
  Video,
  MoreHorizontal,
  ArrowLeft,
  Check,
  CheckCheck,
  LogOut,
  UserPlus,
  X,
  VideoOff,
  Mic,
  MicOff,
} from "lucide-react";
import CallInterface from "@/app/components/CallInterface";
import RealProfilePage from "../profile/profile-page";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authAPI } from "@/lib/api";
import { userAPI } from "@/lib/api";
import { chatAPI } from "@/lib/api";
import { postAPI, notificationAPI } from "@/lib/api";
import Image from "next/image";
import io, { Socket } from "socket.io-client";
import { Post as APIPost } from "@/lib/types";
import CreatePage from "../create-post/page";
import MessagingPage from "@/app/components/MessagingPage";
import CommentsSection from "@/app/components/CommentsSection";
import NotificationsPage, {
  Notification,
} from "@/app/components/NotificationsPage";
import SearchPage from "@/app/components/SearchPage";
import { useRouter, useSearchParams } from "next/navigation";

function formatLastSeen(lastSeen: string): string {
  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diffMs = now.getTime() - lastSeenDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 2) return "Active now";
  if (diffMins < 60) return `Active ${diffMins} min ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24)
    return `Active ${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;

  return `Last seen ${lastSeenDate.toLocaleDateString()}`;
}

// Interface definitions
interface User {
  _id: string;
  username: string;
  fullName: string;
  profilePic?: string;
  following: string[];
}

interface Post {
  _id: string;
  user: {
    _id: string;
    username: string;
    fullName: string;
    profilePic?: string;
  };
  content: string;
  image?: string;
  likes: string[];
  comments: {
    _id: string;
    user: {
      _id: string;
      username: string;
      profilePic?: string;
    };
    content: string;
  }[];
  createdAt: string;
  bookmarked?: boolean;
  isFollowing?: boolean;
}

interface Conversation {
  _id: string;
  participants: {
    _id: string;
    fullName: string;
    username: string;
    profilePic?: string;
    isOnline?: boolean;
    lastSeen: string;
  }[];
  lastMessage?: {
    content: string;
    createdAt: string;
  };
  unreadCount: number;
  updatedAt: string;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

interface MessageResponse {
  status: "success" | "error";
  error?: string;
}

interface MainAppProps {
  onSignOut: () => void;
}

export default function MainApp({ onSignOut }: MainAppProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [isLoading, setIsLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
  const outgoingCallRef = useRef<any>(null);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [SimplePeer, setSimplePeer] = useState<any>(null);
  const [peer, setPeer] = useState<any>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [page, setPage] = useState(1);
  const router = useRouter();
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{
    roomId: string;
    caller: { fullName: string; profilePic?: string };
    type: "audio" | "video";
  } | null>(null);
  const [ongoingCall, setOngoingCall] = useState<{
    roomId: string;
    type: "audio" | "video";
    isInitiator: boolean;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
  } | null>(null);
  const [outgoingCall, setOutgoingCall] = useState<{
    roomId: string;
    type: 'audio' | 'video';
  } | null>(null);
  const peerRef = useRef<any>(null);

  useEffect(() => {
    const handleUnauthorized = () => {
      console.log("Unauthorized event received");
      localStorage.removeItem("authToken");
      onSignOut();
    };

    window.addEventListener("unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener("unauthorized", handleUnauthorized);
    };
  }, [onSignOut]);

  // Fetch current user
  const fetchUser = async () => {
    try {
      console.log("Fetching current user...");
      const response = await authAPI.getCurrentUser();

      if (response.success && response.user) {
        console.log("User fetched successfully:", response.user);
        setCurrentUser(response.user);

        // Store token in localStorage as fallback
        const token = localStorage.getItem("authToken");
        if (!token) {
          console.log("Setting auth token from response");
          localStorage.setItem("authToken", response.token);
        }
      } else {
        throw new Error(response.message || "Failed to fetch user");
      }
    } catch (error: any) {
      console.error("Failed to fetch user:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });

      // Clear invalid tokens
      localStorage.removeItem("authToken");
      document.cookie = "token=; Max-Age=0; path=/;";

      // Sign out
      onSignOut();
    } finally {
      setIsLoading(false);
    }
  };

  // Add useEffect to fetch user on mount
  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    (async () => {
      try {
        console.log("Fetching notifications for user:", currentUser._id);
        const initial = await notificationAPI.getNotifications();
        console.log("[Notifications] raw data:", initial);

        // Transform data to match our interface
        const transformed = initial.map((n: any) => ({
          _id: n._id,
          receiver: n.receiver,
          type: n.type,
          sender: {
            _id: n.sender?._id,
            username: n.sender?.username,
            profilePic: n.sender?.profilePic,
          },
          content: n.content,
          createdAt: n.createdAt,
          read: n.read,
          post: n.post
            ? {
                _id: n.post?._id,
                image: n.post?.image,
              }
            : undefined,
        }));

        console.log("[Notifications] transformed:", transformed);
        setNotifications(transformed);
      } catch (err) {
        console.error("Failed to load notifications:", err);
      }
    })();
  }, [currentUser]);

  // Load conversations when currentUser changes
  useEffect(() => {
    if (!currentUser) return;

    const loadConversations = async () => {
      try {
        const convos = await chatAPI.getConversations();
        const cleanedConvos = (convos as Conversation[]).map((c) => ({
          ...c,
          participants: c.participants.map((p) => ({
            ...p,
            lastSeen: p.lastSeen ?? new Date().toISOString(),
          })),
        }));
  
        setConversations(cleanedConvos);
      } catch (err) {
        console.error("Failed to load conversations:", err);
      }
    };

    loadConversations();
  }, [currentUser]);

  useEffect(() => {
    const initializeSimplePeer = async () => {
      try {
        const module = await import("simple-peer");
        setSimplePeer(() => module.default);
      } catch (err) {
        console.error("Failed to load SimplePeer:", err);
      }
    };

    initializeSimplePeer();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      const loadMessages = async () => {
        if (!selectedConversation) return;
        setLoadingMessages(true);
        try {
          const data = await chatAPI.getConversation(selectedConversation);
          console.log("GET /chat/", selectedConversation, "→", data);
          setMessages(
            Array.isArray(data)
              ? data.map((m) => ({
                  id: m._id,
                  senderId: m?.sender?._id || "unknown",
                  content: m.content || "",
                  timestamp: new Date(m.createdAt || "").toLocaleTimeString(
                    [],
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  ),
                  read: !!m.read,
                }))
              : []
          );
        } catch (err) {
          console.error("Failed to load messages:", {
            error: err,
            conversationId: selectedConversation,
          });
          console.error("loadMessages 404 / crash", err);
          setMessages([]);
        } finally {
          setLoadingMessages(false);
        }
      };

      loadMessages();
    } else {
      setMessages([]);
    }
  }, [selectedConversation]);

  useEffect(() => {
    if (!currentUser) return;

    if (socketRef.current && socketRef.current.connected) {
      return;
    }

    const newSocket = io("https://vybe-social-backend.onrender.com", {
      path: "/socket.io",
      auth: {
        token: localStorage.getItem("authToken"),
      },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    newSocket.on("receive_message", (message: any) => {
      if (!message?._id || !message?.sender?._id || !message?.content) {
        console.error("Invalid message format:", message);
        return;
      }

      if (
        selectedConversation === message.conversation?._id ||
        selectedConversation === message.conversation
      ) {
        setMessages((prev) => [
          ...prev,
          {
            id: message._id,
            senderId: message.sender._id,
            content: message.content,
            timestamp: new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            read: false,
          },
        ]);
      }
    });

    newSocket.on("incoming-call", (data) => {
      setIncomingCall({
        roomId: data.roomId,
        caller: data.caller,
        type: data.type
      });
    });

    newSocket.on("call-initiated", (data) => {
      setOutgoingCall({
        roomId: data.roomId,
        type: data.type
      });
      newSocket.emit("join-call-room", data.roomId);
    });

    newSocket.on("call-accepted", (roomId) => {
      if (outgoingCallRef.current) {
        startCall(roomId, outgoingCallRef.current.type, true);
        setOutgoingCall(null);
        outgoingCallRef.current = null;
      }
    });

    newSocket.on("call-rejected", ({ roomId }) => {
      if (outgoingCall?.roomId === roomId) {
        setOutgoingCall(null);
        alert("Call declined");
      }
    });

    newSocket.on("call-ended", ({ roomId, reason }) => {
      if (ongoingCall?.roomId === roomId) {
        stopCall();
        alert(`Call ended: ${reason}`);
      }
    });

    newSocket.on("webrtc-signal", (data) => {
      if (peerRef.current && ongoingCall?.roomId === data.roomId) {
        peerRef.current.signal(data.signal);
      }
    });

    newSocket.on("new_notification", (notification: any) => {
      if (notification.receiver === currentUser._id) {
        console.log("New notification received:", notification);

        setNotifications((prev) => [
          {
            ...notification,
            sender: {
              _id: notification.sender?._id,
              username: notification.sender?.username,
              profilePic: notification.sender?.profilePic,
            },
            post: notification.post
              ? {
                  _id: notification.post?._id,
                  image: notification.post?.image,
                }
              : undefined,
          },
          ...prev,
        ]);
      }
    });

    newSocket.on("new_post", (incoming: Post) => {
      setPosts((prev) => {
        if (prev.some((p) => p._id === incoming._id)) return prev;
        return [
          {
            ...incoming,
            isFollowing: currentUser.following.includes(incoming.user._id),
          },
          ...prev,
        ];
      });
    });

    // Handle like updates
    newSocket.on("like_update", ({ postId, likes }) => {
      setPosts((prev) =>
        prev.map((p) => (p._id === postId ? { ...p, likes } : p))
      );
    });

    newSocket.on("connect", () => {
      console.log("Socket connected!");
      newSocket.emit("join", currentUser._id);
    });

    newSocket.on("connect_error", (err) => {
      console.error("Connection error:", err.message);
    });

    setSocket(newSocket);
    socketRef.current = newSocket;

    return () => {
      if (socketRef.current?.connected) {
        socketRef.current.disconnect();
      }
    };

    const handleOpenConversation = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setSelectedConversation(customEvent.detail);
      setActiveTab("messages");
    };

    window.addEventListener("openConversation", handleOpenConversation);

    return () => {
      window.removeEventListener("openConversation", handleOpenConversation);
    };
  }, [
    currentUser,
    selectedConversation,
    outgoingCall,
    ongoingCall,
    incomingCall,
  ]);

  useEffect(() => {
    if (!socket) return;

    const handleUserTyping = (data: {
      conversationId: string;
      userId: string;
    }) => {
      if (selectedConversation === data.conversationId) {
        setTypingUsers((prev) => new Set(prev).add(data.userId));
      }
    };

    const handleUserStopTyping = (data: {
      conversationId: string;
      userId: string;
    }) => {
      if (selectedConversation === data.conversationId) {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      }
    };

    const handleReceiveMessage = (message: any) => {
      if (
        selectedConversation === message.conversation?._id ||
        selectedConversation === message.conversation
      ) {
        setMessages((prev) => [
          ...prev,
          {
            id: message._id,
            senderId: message.sender._id,
            content: message.content,
            timestamp: new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            read: false,
          },
        ]);
      }
    };

    const handleConversationUpdated = (updatedConv: Conversation) => {
      setConversations((prev) =>
        prev.map((c) => (c._id === updatedConv._id ? updatedConv : c))
      );
    };

    socket.on("user_typing", handleUserTyping);
    socket.on("user_stop_typing", handleUserStopTyping);
    socket.on("receive_message", handleReceiveMessage);
    socket.on("conversation_updated", handleConversationUpdated);

    return () => {
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stop_typing", handleUserStopTyping);
      socket.off("receive_message", handleReceiveMessage);
      socket.off("conversation_updated", handleConversationUpdated);
    };
  }, [socket, selectedConversation]);

  // Fetch initial feed
  useEffect(() => {
    if (!currentUser || !hasMorePosts || loadingPosts) return;

    const loadPosts = async () => {
      try {
        setLoadingPosts(true);
        const feedPosts: APIPost[] = await postAPI.getFeed(page);

        if (feedPosts.length === 0) {
          setHasMorePosts(false);
          return;
        }

        setPosts((prev) => [
          ...prev,
          ...feedPosts.map((post) => ({
            ...post,
            isFollowing: currentUser.following.includes(post.user._id),
          })),
        ]);
      } catch (err) {
        console.error("Failed to load feed:", err);
      } finally {
        setLoadingPosts(false);
      }
    };

    loadPosts();
  }, [currentUser, page, hasMorePosts]);

  // Handle scroll for pagination
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop !==
          document.documentElement.offsetHeight ||
        !hasMorePosts ||
        loadingPosts
      )
        return;
      setPage((prev) => prev + 1);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMorePosts, loadingPosts]);

  useEffect(() => {
    if (!socket) return;

    // Set up heartbeat
    const heartbeatInterval = setInterval(() => {
      socket.emit("heartbeat");
    }, 30000); // 30 seconds

    return () => {
      clearInterval(heartbeatInterval);
      if (socket.connected) {
        socket.emit("manual-disconnect");
      }
    };
  }, [socket]);

  // Toggle dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const handleLike = async (postId: string) => {
    if (!currentUser || !socket) {
      console.error("Missing currentUser or socket:", { currentUser, socket });
      return;
    }

    try {
      // Validate postId format
      if (!/^[0-9a-fA-F]{24}$/.test(postId)) {
        throw new Error(`Invalid post ID format: ${postId}`);
      }

      // Verify post exists locally
      const postToLike = posts.find((p) => p._id === postId);
      if (!postToLike) {
        throw new Error(`Post not found in local state: ${postId}`);
      }

      // Optimistic update
      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? {
                ...post,
                likes: post.likes.includes(currentUser._id)
                  ? post.likes.filter((id) => id !== currentUser._id)
                  : [...post.likes, currentUser._id],
              }
            : post
        )
      );

      console.log("Sending like request for post:", postId);
      const response = await postAPI.toggleLike(postId);

      if (!response.success) {
        // Add server response to the error
        throw new Error(
          `${response.message} | Code: ${response.code} | Post ID: ${postId}`
        );
      }

      // Send notification if needed
      if (postToLike.user._id !== currentUser._id) {
        socket.emit("send_notification", {
          type: "like",
          receiverId: postToLike.user._id,
          postId: postToLike._id,
        });
      }
    } catch (error: unknown) {
      // Enhanced error handling
      let errorMessage = "Failed to like post";

      if (error instanceof Error) {
        errorMessage = error.message;
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
          postId,
          currentUserId: currentUser._id,
        });
      } else {
        console.error("Unknown error type:", error);
      }

      // Rollback optimistic update
      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? {
                ...post,
                likes: post.likes.includes(currentUser._id)
                  ? post.likes.filter((id) => id !== currentUser._id)
                  : [...post.likes, currentUser._id],
              }
            : post
        )
      );

      alert(errorMessage);
    }
  };

  // Handle bookmark action
  const handleBookmark = async (postId: string) => {
    try {
      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId ? { ...post, bookmarked: !post.bookmarked } : post
        )
      );
      // Actual API would be implemented here
    } catch (error) {
      console.error("Bookmark action failed:", error);
    }
  };

  const handleComment = async (postId: string, content: string) => {
    if (!currentUser) return;

    try {
      // 1) send comment to server
      await postAPI.addComment(postId, content);

      // 2) optimistic UI: append to comments array
      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId
            ? {
                ...p,
                comments: [
                  ...p.comments,
                  { _id: Date.now().toString(), user: currentUser, content },
                ],
              }
            : p
        )
      );

      // 3) figure out who to notify
      const commentedPost = posts.find((p) => p._id === postId);
      if (commentedPost && commentedPost.user._id !== currentUser._id) {
        // 4) fire socket event
        socket?.emit("send_notification", {
          type: "comment",
          receiverId: commentedPost.user._id,
          postId,
          commentText: content,
        });
      }
    } catch (err) {
      console.error("Comment failed:", err);
    }
  };

  // Handle follow action
  const handleFollow = async (userId: string) => {
    if (!currentUser) return;

    try {
      // Optimistic UI update
      setPosts((prev) =>
        prev.map((post) =>
          post.user._id === userId
            ? { ...post, isFollowing: !post.isFollowing }
            : post
        )
      );

      // Actual API call
      const result = await userAPI.followUser(userId);

      // Sync with actual result
      setPosts((prev) =>
        prev.map((post) =>
          post.user._id === userId
            ? { ...post, isFollowing: result.isFollowing }
            : post
        )
      );
    } catch (error) {
      console.error("Follow failed:", error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      // PATCH /notifications/:id/read
      await notificationAPI.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !socket || !currentUser)
      return;

    // Optimistic update
    const tempId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        senderId: currentUser._id,
        content: newMessage,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        read: false,
      },
    ]);
    setNewMessage("");

    try {
      socket.emit(
        "send_message",
        {
          content: newMessage,
          conversation: selectedConversation,
        },
        (response: MessageResponse) => {
          if (response?.status !== "success") {
            setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
            console.error("Message failed:", response?.error);
          }
        }
      );
    } catch (err) {
      console.error("Failed to send message:", err);
      // Rollback optimistic update
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      setNewMessage(newMessage);
    }
  };

  const searchParams = useSearchParams();

  useEffect(() => {
    const convId = searchParams.get("conversation");
    if (convId) {
      setSelectedConversation(convId);
      setActiveTab("messages");
    }
  }, [searchParams]);

  const startCall = async (roomId: string, type: 'audio' | 'video', isInitiator: boolean) => {
    try {
      if (!SimplePeer) {
        console.error("SimplePeer not loaded yet");
        return;
      }

      const constraints = {
        video: type === 'video',
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      const peerInstance = new SimplePeer({
        initiator: isInitiator,
        trickle: true,
        stream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        }
      });

      peerInstance.on("signal", (data: any) => {
        console.log("Sending WebRTC signal", data);
        if (socketRef.current && currentUser) {
          socketRef.current.emit("webrtc-signal", { 
            roomId, 
            signal: data,
            senderId: currentUser._id
          });
        }
      });

      peerInstance.on("stream", (remoteStream: MediaStream) => {
        console.log("Received remote stream");
        setOngoingCall(prev => {
          if (prev && prev.roomId === roomId) {
            return { ...prev, remoteStream };
          }
          return prev;
        });
      });

      peerInstance.on("connect", () => {
        console.log("WebRTC connection established");
      });

      peerInstance.on("close", () => {
        console.log("WebRTC connection closed");
        stopCall();
      });

      peerInstance.on("error", (err: unknown) => {
        console.error("WebRTC error:", err);
        stopCall();
      });

      peerRef.current = peerInstance;

      setOngoingCall({
        roomId,
        type,
        isInitiator,
        localStream: stream,
        remoteStream: null
      });
    } catch (err) {
      console.error("Error starting call:", err);
      alert("Failed to access media devices");
    }
  };

  useEffect(() => {
    if (!socketRef.current) return;

    const handleSignal = (data: any) => {
      console.log("Received WebRTC signal", data);
      if (peerRef.current && ongoingCall && ongoingCall.roomId === data.roomId) {
        try {
          peerRef.current.signal(data.signal);
        } catch (err) {
          console.error("Error processing signal:", err);
        }
      }
    };

    socketRef.current.on("webrtc-signal", handleSignal);

    return () => {
      socketRef.current?.off("webrtc-signal", handleSignal);
    };
  }, [ongoingCall]);

  const stopCall = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    
    if (ongoingCall) {
      if (ongoingCall.localStream) {
        ongoingCall.localStream.getTracks().forEach(track => track.stop());
      }
      if (ongoingCall.remoteStream) {
        ongoingCall.remoteStream.getTracks().forEach(track => track.stop());
      }
      
      if (socketRef.current) {
        socketRef.current.emit("end-call", { roomId: ongoingCall.roomId });
      }
    }
    
    setOngoingCall(null);
  };

  const initiateCall = (type: 'audio' | 'video') => {
    if (!selectedConversation || !currentUser || !socketRef.current) return;
    
    const callee = getOtherUser(selectedConversation);
    if (!callee) {
      alert("User not found");
      return;
    }
    
    outgoingCallRef.current = {
      calleeId: callee._id,
      type
    };
    
    socketRef.current.emit("initiate-call", { 
      calleeId: callee._id, 
      type 
    });
  };

  const toggleVideo = () => {
    if (ongoingCall?.localStream) {
      const videoTrack = ongoingCall.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setOngoingCall(prev => ({ ...prev! }));
      }
    }
  };

  const toggleAudio = () => {
    if (ongoingCall?.localStream) {
      const audioTrack = ongoingCall.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setOngoingCall(prev => ({ ...prev! }));
      }
    }
  };

  const getOtherUser = (conversationId: string) => {
    const conversation = conversations.find(c => c._id === conversationId);
    return conversation?.participants.find(p => p._id !== currentUser?._id);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors duration-300">
      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {selectedConversation && activeTab === "messages" && (
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSelectedConversation(null)}
                className="p-1 flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
            )}

            {/* Title section with better spacing */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {activeTab === "messages" && selectedConversation && (
                <>
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-8 h-8">
                      <AvatarImage
                        src={
                          getOtherUser(selectedConversation)?.profilePic ||
                          "/placeholder.svg"
                        }
                      />
                      <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">
                        {getOtherUser(selectedConversation)?.fullName?.[0] ||
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                    {getOtherUser(selectedConversation)?.isOnline && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-white dark:border-black" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">
                      {getOtherUser(selectedConversation)?.fullName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {getOtherUser(selectedConversation)?.isOnline
                        ? "Active now"
                        : formatLastSeen(
                            getOtherUser(selectedConversation)?.lastSeen ||
                              new Date().toISOString()
                          )}
                    </p>
                  </div>
                </>
              )}

              {/* Other tab titles */}
              {!(activeTab === "messages" && selectedConversation) && (
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-bold bg-gradient-to-r from-black to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent"
                >
                  {activeTab === "home" && "Vybe"}
                  {activeTab === "notifications" && "Notifications"}
                  {activeTab === "messages" &&
                    !selectedConversation &&
                    "Messages"}
                  {activeTab === "search" && "Search"}
                  {activeTab === "profile" && "Profile"}
                  {activeTab === "create" && "Create Post"}
                </motion.h1>
              )}
            </div>
          </div>

          {/* Action buttons with better spacing */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Message-specific actions */}
            {activeTab === "messages" &&
              selectedConversation &&
              !ongoingCall && (
                <>
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full w-8 h-8"
                      onClick={() => initiateCall("audio")}
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full w-8 h-8"
                      onClick={() => initiateCall("video")}
                    >
                      <Video className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </>
              )}

            {/* Dark mode toggle */}
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDarkMode(!darkMode)}
                className="rounded-full w-8 h-8"
              >
                <AnimatePresence mode="wait">
                  {darkMode ? (
                    <motion.div
                      key="sun"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Sun className="h-4 w-4" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="moon"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Moon className="h-4 w-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>

            {/* Notifications */}
            {activeTab !== "notifications" && (
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full relative w-8 h-8"
                  onClick={() => setActiveTab("notifications")}
                >
                  <Bell className="h-4 w-4" />
                  {notifications.some((n) => !n.read) && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: "spring" }}
                      className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full"
                    />
                  )}
                </Button>
              </motion.div>
            )}

            {/* Sign Out Button */}
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={onSignOut}
                className="rounded-full w-8 h-8"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="pb-20">
        <AnimatePresence mode="wait">
          {activeTab === "home" && (
            <HomePage
              posts={posts}
              onLike={handleLike}
              onBookmark={handleBookmark}
              onFollow={handleFollow}
              loading={loadingPosts}
              onComment={handleComment}
              currentUser={currentUser}
            />
          )}
          {activeTab === "notifications" && (
            <NotificationsPage
              notifications={notifications}
              onMarkAsRead={markNotificationAsRead}
            />
          )}

          {activeTab === "messages" && (
            <MessagingPage
              conversations={conversations}
              messages={messages}
              selectedConversation={selectedConversation}
              onSelectConversation={setSelectedConversation}
              newMessage={newMessage}
              onNewMessageChange={setNewMessage}
              onSendMessage={sendMessage}
              currentUser={currentUser}
              loadingMessages={loadingMessages}
              socket={socket}
              typingUsers={typingUsers}
            />
          )}
          {activeTab === "search" && <SearchPage currentUser={currentUser} />}
          {activeTab === "profile" && (
            <RealProfilePage
              userId={currentUser!._id}
              currentUser={currentUser}
              onBack={() => setActiveTab("home")}
            />
          )}
          {activeTab === "create" && <CreatePage />}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <motion.nav
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.5 }}
        className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-black/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-800"
      >
        <div className="flex items-center justify-around py-2">
          {[
            { icon: Home, label: "Home", id: "home" },
            { icon: Search, label: "Search", id: "search" },
            { icon: Plus, label: "Create", id: "create" },
            { icon: MessageCircle, label: "Messages", id: "messages" },
            { icon: Bell, label: "Notifications", id: "notifications" },
            { icon: User, label: "Profile", id: "profile" },
          ].map((item, index) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setActiveTab(item.id);
                if (item.id !== "messages") {
                  setSelectedConversation(null);
                }
              }}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors relative ${
                activeTab === item.id
                  ? "text-black dark:text-white"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-xs">{item.label}</span>
              {activeTab === item.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-black dark:bg-white rounded-full"
                />
              )}
              {item.id === "messages" &&
                conversations.some((c) => c.unreadCount > 0) && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"
                  >
                    <span className="text-xs text-white font-bold">
                      {conversations.reduce((sum, c) => sum + c.unreadCount, 0)}
                    </span>
                  </motion.div>
                )}
              {item.id === "notifications" &&
                notifications.some((n) => !n.read) && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
                  />
                )}
            </motion.button>
          ))}
        </div>
      </motion.nav>

      {/* Outgoing Call Modal */}
      {outgoingCall && !ongoingCall && (
        <OutgoingCallModal 
          call={outgoingCall}
          onCancel={() => {
            socket?.emit("end-call", { roomId: outgoingCall.roomId });
            setOutgoingCall(null);
          }}
        />
      )}


      {/* Incoming Call Modal */}
      {incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          onAccept={() => {
            socket?.emit("accept-call", { roomId: incomingCall.roomId });
            startCall(incomingCall.roomId, incomingCall.type, false);
          }}
          onDecline={() => {
            socket?.emit("decline-call", { roomId: incomingCall.roomId });
            setIncomingCall(null);
          }}
        />
      )}

      {/* Ongoing Call Interface */}
      {ongoingCall && (
        <CallInterface
          call={ongoingCall}
          onEnd={stopCall}
          onToggleVideo={toggleVideo}
          onToggleAudio={toggleAudio}
        />
      )}
    </div>
  );
}

function HomePage({
  posts,
  onLike,
  onBookmark,
  onFollow,
  onComment,
  loading,
  currentUser,
}: {
  posts: Post[];
  onLike: (id: string) => void;
  onBookmark: (id: string) => void;
  onFollow: (id: string) => void;
  onComment: (postId: string, content: string) => void;
  loading: boolean;
  currentUser: User | null;
}) {
  // Mock stories data
  const stories = [
    {
      name: "Your Story",
      avatar: "",
    },
    {
      name: "User 1",
      avatar:
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face",
    },
    {
      name: "User 2",
      avatar:
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face",
    },
    {
      name: "User 3",
      avatar:
        "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=150&h=150&fit=crop&crop=face",
    },
    {
      name: "User 4",
      avatar:
        "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=150&h=150&fit=crop&crop=face",
    },
    {
      name: "User 5",
      avatar:
        "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=150&h=150&fit=crop&crop=face",
    },
  ];

  return (
    <motion.div
      key="home"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Stories Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-4 py-4 border-b border-gray-200 dark:border-gray-800"
      >
        <div className="flex gap-4 overflow-x-auto pb-2">
          {stories.map((user, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex-shrink-0 flex flex-col items-center gap-2 cursor-pointer"
            >
              <div className="relative">
                {user.name === "Your Story" ? (
                  <Avatar className="w-16 h-16 border-2 border-dashed border-gray-400 dark:border-gray-600">
                    <AvatarFallback className="bg-gray-100 dark:bg-gray-900">
                      <Plus className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-0.5">
                    <Avatar className="w-full h-full">
                      <AvatarImage src={user.avatar || "/placeholder.svg"} />
                      <AvatarFallback>U{i + 1}</AvatarFallback>
                    </Avatar>
                  </div>
                )}
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[64px]">
                {user.name}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Posts Feed */}
      <div className="space-y-0">
        {posts.length === 0 && !loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              No posts found. Follow more users to see content!
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {posts.map((post, index) => (
              <PostCard
                key={post._id}
                post={post}
                index={index}
                onLike={onLike}
                onBookmark={onBookmark}
                onFollow={onFollow}
                onComment={(postId, content) =>
                  Promise.resolve(onComment(postId, content))
                }
                currentUser={currentUser}
              />
            ))}
          </AnimatePresence>
        )}

        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-black dark:border-t-white rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function PostCard({
  post,
  index,
  onLike,
  onBookmark,
  onFollow,
  onComment,
  currentUser,
}: {
  post: Post;
  index: number;
  onLike: (id: string) => void;
  onBookmark: (id: string) => void;
  onFollow: (id: string) => void;
  onComment: (postId: string, content: string) => void;
  currentUser: User | null;
}) {
  const isLiked = currentUser ? post.likes.includes(currentUser._id) : false;
  const [showComments, setShowComments] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.1, type: "spring", stiffness: 100 }}
      className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black"
    >
      <Card className="border-0 rounded-none shadow-none bg-transparent">
        {/* Post Header */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage
                src={post.user.profilePic || "/placeholder.svg"}
                alt={post.user.fullName}
              />
              <AvatarFallback>
                {post.user.fullName
                  ? post.user.fullName.charAt(0).toUpperCase()
                  : post.user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">{post.user.fullName}</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs">
                @{post.user.username} •{" "}
                {new Date(post.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!post.isFollowing && (
              <Button
                onClick={() => onFollow(post.user._id)}
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs px-3 py-1 h-7"
              >
                <UserPlus className="w-3 h-3 mr-1" />
                Follow
              </Button>
            )}

            <button
              className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
              aria-label="More options"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Post Content */}
        <div className="px-4 pb-3">
          <p className="text-sm leading-relaxed">{post.content}</p>
        </div>

        {/* Post Image */}
        {post.image && (
          <div className="px-4 pb-3">
            <div className="relative overflow-hidden rounded-lg aspect-square">
              <Image
                src={post.image}
                alt={`Post by ${post.user.fullName}`}
                fill
                className="object-cover"
              />
            </div>
          </div>
        )}

        {/* Post Actions */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <button
              onClick={() => onLike(post._id)}
              className="flex items-center gap-2 group"
              aria-label={isLiked ? "Unlike post" : "Like post"}
            >
              <Heart
                className={`w-5 h-5 transition-colors ${
                  isLiked
                    ? "fill-red-500 text-red-500"
                    : "text-gray-500 dark:text-gray-400 group-hover:text-red-500"
                }`}
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {post.likes.length}
              </span>
            </button>

            <button
              onClick={() => setShowComments((s) => !s)}
              className="flex items-center gap-2 group"
              aria-label="Comment on post"
            >
              <MessageCircle className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-blue-500 transition-colors" />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {post.comments.length}
              </span>
            </button>

            <button
              className="flex items-center gap-2 group"
              aria-label="Share post"
            >
              <Share className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-green-500 transition-colors" />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                0
              </span>
            </button>
          </div>

          <button
            onClick={() => onBookmark(post._id)}
            aria-label={post.bookmarked ? "Remove bookmark" : "Bookmark post"}
          >
            <Bookmark
              className={`w-5 h-5 transition-colors ${
                post.bookmarked
                  ? "fill-yellow-500 text-yellow-500"
                  : "text-gray-500 dark:text-gray-400 hover:text-yellow-500"
              }`}
            />
          </button>
        </div>
        {showComments && (
          <CommentsSection
            postId={post._id}
            initialComments={post.comments}
            onComment={(postId, content) => Promise.resolve(onComment(postId, content))}
            onClose={() => setShowComments(false)}
          />
        )}
      </Card>
    </motion.div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-8"
      >
        {/* Vybe Logo Animation */}
        <div className="flex items-center justify-center">
          {["V", "y", "b", "e"].map((letter, index) => (
            <motion.span
              key={letter}
              initial={{ opacity: 0, y: 50, rotateX: -90 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{
                delay: index * 0.2,
                duration: 0.8,
                type: "spring",
                stiffness: 100,
                damping: 10,
              }}
              className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent"
              style={{
                fontFamily:
                  "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                fontWeight: 900,
                letterSpacing: "-0.02em",
              }}
            >
              {letter}
            </motion.span>
          ))}
        </div>

        {/* Animated underline */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ delay: 1, duration: 0.8, ease: "easeInOut" }}
          className="h-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-full"
          style={{ maxWidth: "200px" }}
        />

        {/* Pulsing dots */}
        <div className="flex gap-2 mt-4">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1, 0] }}
              transition={{
                delay: 1.5 + index * 0.2,
                duration: 1.5,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
              className="w-3 h-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full"
            />
          ))}
        </div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 0.6 }}
          className="text-gray-600 dark:text-gray-400 text-sm font-medium tracking-wide"
        >
          Feel the Vybe
        </motion.p>
      </motion.div>
    </div>
  );
}

// Incoming Call Modal Component
function IncomingCallModal({
  call,
  onAccept,
  onDecline,
}: {
  call: {
    roomId: string;
    caller: { fullName: string; profilePic?: string };
    type: "audio" | "video";
  };
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-2xl p-8 w-full max-w-md text-center"
      >
        <div className="mb-6">
          <Avatar className="w-24 h-24 mx-auto mb-4">
            <AvatarImage
              src={call.caller.profilePic || "/placeholder.svg"}
              alt={call.caller.fullName}
            />
            <AvatarFallback className="text-2xl">
              {call.caller.fullName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-2xl font-bold">{call.caller.fullName}</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {call.type === "video" ? "Video Call" : "Voice Call"}
          </p>
        </div>

        <div className="flex justify-center gap-6 mt-8">
          <Button
            onClick={onDecline}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
          >
            <X className="w-8 h-8" />
          </Button>

          <Button
            onClick={onAccept}
            className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600"
          >
            {call.type === "video" ? (
              <Video className="w-8 h-8" />
            ) : (
              <Phone className="w-8 h-8" />
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function OutgoingCallModal({ 
  call, 
  onCancel 
}: {
  call: {
    roomId: string;
    type: 'audio' | 'video';
  };
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-2xl p-8 w-full max-w-md text-center"
      >
        <div className="mb-6">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
              {call.type === 'video' ? (
                <Video className="w-12 h-12 text-gray-500" />
              ) : (
                <Phone className="w-12 h-12 text-gray-500" />
              )}
            </div>
          </div>
          <h2 className="text-2xl font-bold">Calling...</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Waiting for receiver to answer
          </p>
        </div>

        <div className="flex justify-center gap-6 mt-8">
          <Button
            onClick={onCancel}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
          >
            <X className="w-8 h-8" />
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
