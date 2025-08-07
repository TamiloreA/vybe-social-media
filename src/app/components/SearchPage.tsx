"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Search, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { userAPI } from "@/lib/api"
import ProfilePage from "@/app/profile/profile-page"

interface User {
  _id: string
  username: string
  fullName: string
  profilePic?: string
  followersCount: number
  isFollowing?: boolean
}

export default function SearchPage({ currentUser }: { currentUser: any }) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  useEffect(() => {
    if (!query.trim()) return setResults([])
    const t = setTimeout(async () => {
      const res = await userAPI.searchUsers(query)
      setResults(res)
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  // open profile modal
  if (selectedUserId)
    return (
      <ProfilePage
        userId={selectedUserId}
        currentUser={currentUser}
        onBack={() => setSelectedUserId(null)}
      />
    )

  return (
    <motion.div className="p-4 max-w-2xl mx-auto">
      {/* sticky search */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-md p-2 rounded-xl mb-4">
        <Input
          placeholder="Search users…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="rounded-full pl-8"
          type="search"
        />
        <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
        {query && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2"
            onClick={() => setQuery("")}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {results.map((user) => (
        <motion.div
          key={user._id}
          whileHover={{ scale: 1.02 }}
          onClick={() => setSelectedUserId(user._id)}
          className="flex items-center gap-4 p-3 mb-2 rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer"
        >
          <Avatar className="w-12 h-12">
            <AvatarImage src={user.profilePic} />
            <AvatarFallback>{user.fullName[0]}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <p className="font-bold">{user.fullName}</p>
            <p className="text-sm text-gray-500">@{user.username}</p>
            <p className="text-xs text-gray-400">{user.followersCount} followers</p>

            {user.isFollowing && (
              <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                Following
              </span>
            )}
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}