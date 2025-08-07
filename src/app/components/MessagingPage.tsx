"use client"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Search, UserPlus, Check, CheckCheck } from "lucide-react"
import type { Socket } from "socket.io-client"
import { chatAPI } from "@/lib/api"

interface Conversation {
  _id: string
  participants: {
    _id: string
    fullName: string
    username: string
    profilePic?: string
    isOnline?: boolean
    lastSeen: string
  }[]
  lastMessage?: {
    content: string
    createdAt: string
  }
  updatedAt: string
  unreadCount: number
}

interface Message {
  id: string
  senderId: string
  content: string
  timestamp: string
  read: boolean
}

interface MessagingPageProps {
  conversations: Conversation[]
  messages: Message[]
  selectedConversation: string | null
  onSelectConversation: (id: string | null) => void
  newMessage: string
  onNewMessageChange: (val: string) => void
  onSendMessage: () => void
  currentUser: { _id: string } | null
  loadingMessages: boolean
  socket: Socket | null
  typingUsers: Set<string> | undefined
}

export default function MessagingPage(props: MessagingPageProps) {
  const {
    conversations,
    messages,
    selectedConversation,
    onSelectConversation,
    newMessage,
    onNewMessageChange,
    onSendMessage,
    currentUser,
    loadingMessages,
    socket,
    typingUsers = new Set<string>() 
  } = props

  const scrollRef = useRef<HTMLDivElement>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showNewChat, setShowNewChat] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const lastMessageRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages or typing status changes
  const scrollToBottom = () => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current!.scrollTop = scrollRef.current!.scrollHeight
      }, 100)
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, otherUserTyping])

  // Handle typing indicators from socket
  useEffect(() => {
    if (!socket) return
    
    const handleUserTyping = () => {
      setOtherUserTyping(true)
    }
    
    const handleUserStopTyping = () => {
      setOtherUserTyping(false)
    }
    
    socket.on("user_typing", handleUserTyping)
    socket.on("user_stop_typing", handleUserStopTyping)
    
    return () => {
      socket.off("user_typing", handleUserTyping)
      socket.off("user_stop_typing", handleUserStopTyping)
    }
  }, [socket])

  // Mark messages as read when they come into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && socket && selectedConversation) {
            const messageId = entry.target.getAttribute('data-message-id')
            if (messageId) {
              socket.emit('mark_message_read', {
                messageId,
                conversationId: selectedConversation
              })
            }
          }
        })
      },
      { threshold: 0.5 }
    )

    if (lastMessageRef.current) {
      observer.observe(lastMessageRef.current)
    }

    return () => {
      if (lastMessageRef.current) {
        observer.unobserve(lastMessageRef.current)
      }
    }
  }, [messages, socket, selectedConversation])

  const otherUser = (c: Conversation) => c.participants.find((p) => p._id !== currentUser?._id)!

  // Filter conversations based on search
  const filteredConversations = conversations.filter((convo) => {
    const user = otherUser(convo)
    return (
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  // Open conversation (used by Message button)
  const handleOpenConversation = (id: string) => onSelectConversation(id)

  // Typing handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    onNewMessageChange(value)
    
    if (socket && selectedConversation) {
      // Start typing
      if (!isTyping && value.trim() !== '') {
        socket.emit('typing', selectedConversation)
        setIsTyping(true)
      }
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Set new timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        if (isTyping) {
          socket.emit('stop_typing', selectedConversation)
          setIsTyping(false)
        }
      }, 2000)
    }
  }

  // Handle send message
  const handleSendMessage = () => {
    if (isTyping && socket && selectedConversation) {
      socket.emit('stop_typing', selectedConversation)
      setIsTyping(false)
    }
    onSendMessage()
  }

  // Cleanup typing on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (socket && selectedConversation && isTyping) {
        socket.emit('stop_typing', selectedConversation)
      }
    }
  }, [socket, selectedConversation, isTyping])

  // Mark conversation as read when opened
  useEffect(() => {
    if (selectedConversation && currentUser) {
      chatAPI.markConversationRead(selectedConversation)
    }
  }, [selectedConversation, currentUser])

  // ----------------------------------------------
  // Conversation List View
  // ----------------------------------------------
  if (!selectedConversation) {
    return (
      <div className="flex h-[calc(100vh-4.5rem)] bg-white dark:bg-[#0a0a0a]">
        {/* Left sidebar: conversations */}
        <aside className="w-full sm:w-96 border-r border-gray-100 dark:border-[#1f1f1f] flex flex-col">
          <div className="p-4 border-b border-gray-100 dark:border-[#1f1f1f]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-2xl">Messages</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNewChat(true)}
                className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
              >
                <UserPlus className="w-5 h-5" />
              </Button>
            </div>
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search messages"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-full bg-gray-50 dark:bg-[#1a1a1a] border-0 focus-visible:ring-0"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredConversations.length === 0 && (
              <div className="p-6 text-center text-sm text-gray-500">
                {searchQuery ? "No conversations found" : "No conversations yet"}
              </div>
            )}
            {filteredConversations.map((c) => {
              const user = otherUser(c)
              const lastSeenDate = new Date(user.lastSeen)
              const isActive = user.isOnline || 
                             (new Date().getTime() - lastSeenDate.getTime()) < 120000
              return (
                <motion.button
                  key={c._id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleOpenConversation(c._id)}
                  className="w-full p-3 flex gap-3 items-center border-b border-gray-50 dark:border-[#1a1a1a] hover:bg-gray-50 dark:hover:bg-[#121212] transition-colors"
                >
                  <div className="relative">
                    <Avatar className="w-14 h-14">
                      <AvatarImage src={user.profilePic || "/placeholder.svg"} />
                      <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                        {user.fullName[0]}
                      </AvatarFallback>
                    </Avatar>
                    {isActive && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-[#0a0a0a]" />
                    )}
                  </div>
                  <div className="flex-1 text-left overflow-hidden">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-sm truncate">{user.fullName}</p>
                      {c.lastMessage && (
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {new Date(c.lastMessage.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-500 truncate">
                        {c.lastMessage?.content || "Start a conversation"}
                      </p>
                      {c.unreadCount > 0 && (
                        <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </aside>

        {/* Right pane: empty state */}
        <div className="hidden md:flex flex-1 flex-col items-center justify-center text-center p-6 bg-gradient-to-br from-[#f9f9f9] to-[#f0f0f0] dark:from-[#0f0f0f] dark:to-[#080808]">
          <div className="w-40 h-40 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-[#2a1a3f] dark:to-[#3a1a3f] flex items-center justify-center mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-200 to-pink-200 dark:from-[#3a2a4f] dark:to-[#4a2a4f] flex items-center justify-center">
              <Send className="w-12 h-12 text-purple-500 dark:text-purple-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-2">Your messages</h3>
          <p className="text-gray-500 max-w-md">
            Send private messages to a friend or group. Start a conversation now!
          </p>
          <Button
            className="mt-6 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            onClick={() => setShowNewChat(true)}
          >
            New Message
          </Button>
        </div>
      </div>
    )
  }

  // ----------------------------------------------
  // Chat Window View
  // ----------------------------------------------
  const chat = conversations.find((c) => c._id === selectedConversation)
  if (!chat) return null

  const user = otherUser(chat)

  return (
    <div className="flex h-[calc(100vh-4.5rem)] bg-white dark:bg-[#0a0a0a]">
      <div className="flex-1 flex flex-col">
        {/* Messages Container */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-white dark:bg-[#0a0a0a]"
        >
          {loadingMessages && (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="h-16 w-3/4 bg-gray-200 dark:bg-[#1a1a1a] rounded-xl animate-pulse"
                />
              ))}
            </div>
          )}

          {!loadingMessages && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-[#2a1a3f] dark:to-[#3a1a3f] flex items-center justify-center mb-4">
                <Send className="w-12 h-12 text-purple-500 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">No messages yet</h3>
              <p className="text-gray-500 max-w-xs">Start the conversation by sending your first message</p>
            </div>
          )}

          {/* Messages - Instagram Style Layout */}
          <AnimatePresence>
            {messages.map((msg, index) => {
              // Check if this message is from the current user
              const isMyMessage = msg.senderId === currentUser?._id
              const isLastMessage = index === messages.length - 1

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`flex w-full mb-1 ${isMyMessage ? "justify-end" : "justify-start"}`}
                  ref={isLastMessage ? lastMessageRef : null}
                  data-message-id={msg.id}
                >
                  <div className={`flex items-end gap-2 max-w-[70%] ${isMyMessage ? "flex-row-reverse" : "flex-row"}`}>
                    {/* Avatar - only show for other person's messages */}
                    {!isMyMessage && (
                      <Avatar className="w-7 h-7 mb-1 flex-shrink-0">
                        <AvatarImage src={user.profilePic || "/placeholder.svg"} />
                        <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">
                          {user.fullName[0]}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    {/* Message bubble */}
                    <div className="flex flex-col gap-1">
                      <div
                        className={`px-3 py-2 rounded-2xl break-words max-w-xs ${
                          isMyMessage
                            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-sm ml-auto"
                            : "bg-gray-200 dark:bg-[#3a3a3a] text-gray-900 dark:text-white rounded-bl-sm"
                        }`}
                        style={{
                          borderRadius: isMyMessage ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        }}
                      >
                        <p className="text-[14px] leading-[1.4] font-normal">{msg.content}</p>
                      </div>

                      {/* Message info with better positioning */}
                      <div className={`flex items-center gap-1 px-1 ${isMyMessage ? "justify-end" : "justify-start"}`}>
                        <span className="text-[11px] text-gray-500 font-medium">{msg.timestamp}</span>
                        {isMyMessage && (
                          <span className="ml-0.5">
                            {msg.read ? (
                              <CheckCheck className="w-3 h-3 text-blue-500" />
                            ) : (
                              <Check className="w-3 h-3 text-gray-400" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}

            {/* Typing Indicator */}
            {otherUserTyping && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex w-full mb-1 justify-start"
              >
                <div className="flex items-end gap-2 max-w-[70%]">
                  <Avatar className="w-7 h-7 mb-1 flex-shrink-0">
                    <AvatarImage src={user.profilePic || "/placeholder.svg"} />
                    <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">
                      {user.fullName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-1">
                    <div
                      className="px-3 py-2 rounded-2xl break-words max-w-xs bg-gray-200 dark:bg-[#3a3a3a] text-gray-900 dark:text-white rounded-bl-sm"
                    >
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"></div>
                        <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100 dark:border-[#1f1f1f] flex gap-3 items-center bg-white dark:bg-[#0a0a0a]">
          <Input
            placeholder="Message..."
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1 rounded-full bg-gray-100 dark:bg-[#1a1a1a] border-0 focus-visible:ring-0 py-3 px-4 h-10"
          />
          <Button
            size="icon"
            className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white w-10 h-10 flex-shrink-0"
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}