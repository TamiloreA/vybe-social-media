"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { UserPlus, Check, ArrowRight, Users, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { userAPI } from "@/lib/api"

interface User {
  _id: string;
  username: string;
  fullName: string;
  profilePic?: string;
}

interface GetStartedPageProps {
  onComplete: () => void
}

export default function GetStartedPage({ onComplete }: GetStartedPageProps) {
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchSuggestedUsers = async () => {
      try {
        setLoading(true)
        const users = await userAPI.getSuggestedUsers()
        setSuggestedUsers(users)
      } catch (err) {
        setError("Failed to load suggested users")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchSuggestedUsers()
  }, [])

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    )
  }

  const handleSubmit = async () => {
    try {
      // send your batch of follows
      await userAPI.completeOnboarding(selectedUsers)
      onComplete()
    } catch (err) {
      setError("Failed to complete onboarding")
      console.error(err)
    }
  }

  const handleSkip = () => {
    onComplete()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-black dark:to-gray-900">
      {/* Header */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              {["V", "y", "b", "e"].map((letter, index) => (
                <motion.span
                  key={letter}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.1, duration: 0.5 }}
                  className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent"
                >
                  {letter}
                </motion.span>
              ))}
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Skip
          </Button>
        </div>
      </motion.header>

      <div className="px-4 py-6 sm:py-8 max-w-2xl mx-auto">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-center mb-8 sm:mb-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
            className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6"
          >
            <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </motion.div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
            Welcome to Vybe! 🎉
          </h1>

          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed max-w-md mx-auto">
            Discover amazing people and start building your personalized feed. Follow accounts that inspire you!
          </p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 p-3 rounded-lg mb-6 text-center"
          >
            {error}
          </motion.div>
        )}

        {/* Suggested Users Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <Users className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Suggested for you</h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : suggestedUsers.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500">No suggested users found</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4">
              {suggestedUsers.map((user, index) => (
                <motion.div
                  key={user._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1, duration: 0.5 }}
                >
                  <Card 
                    className={`border transition-colors bg-white/80 dark:bg-black/80 backdrop-blur-sm ${
                      selectedUsers.includes(user._id)
                        ? "border-purple-500 dark:border-purple-600"
                        : "border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600"
                    }`}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center gap-3 sm:gap-4">
                        {/* Avatar */}
                        <motion.div 
                          whileHover={{ scale: 1.05 }} 
                          whileTap={{ scale: 0.95 }} 
                          className="relative"
                        >
                          <Avatar className="w-12 h-12 sm:w-14 sm:h-14">
                            <AvatarImage src={user.profilePic || "/placeholder.svg"} alt={user.fullName} />
                            <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
                          </Avatar>
                        </motion.div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-1">
                            <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                              {user.fullName}
                            </h3>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1 truncate">
                            @{user.username}
                          </p>
                        </div>

                        {/* Follow Button */}
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            onClick={() => toggleUserSelection(user._id)}
                            variant={selectedUsers.includes(user._id) ? "secondary" : "default"}
                            size="sm"
                            className={`min-w-[80px] sm:min-w-[90px] text-xs sm:text-sm ${
                              selectedUsers.includes(user._id)
                                ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                                : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                            }`}
                          >
                            {selectedUsers.includes(user._id) ? (
                              <>
                                <Check className="w-3 h-3 mr-1" />
                                Following
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-3 h-3 mr-1" />
                                Follow
                              </>
                            )}
                          </Button>
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Stats */}
        {selectedUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center mb-6 sm:mb-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 rounded-full">
              <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                {selectedUsers.length} {selectedUsers.length === 1 ? "person" : "people"} selected
              </span>
            </div>
          </motion.div>
        )}

        {/* Continue Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="sticky bottom-4 sm:bottom-6"
        >
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-12 sm:h-14 text-sm sm:text-base bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium shadow-lg"
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              />
            ) : (
              <>
                {selectedUsers.length > 0 ? "Continue to Vybe" : "Start with random posts"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>

          {selectedUsers.length === 0 && (
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
              Don't worry, you can always follow people later!
            </p>
          )}
        </motion.div>
      </div>
    </div>
  )
}