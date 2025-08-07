// src/components/CommentsSection.tsx
"use client"

import { useState } from "react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Heart,  X} from "lucide-react"

interface Comment {
  _id: string
  user: { username: string; profilePic?: string }
  content: string
}

interface CommentsSectionProps {
  postId: string
  initialComments: Comment[]
  onComment: (postId: string, content: string) => Promise<void>
  onClose: () => void 
}

export default function CommentsSection({
  postId,
  initialComments,
  onComment,
  onClose,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [text, setText] = useState("")

  const handleSubmit = async () => {
    if (!text.trim()) return
    await onComment(postId, text)
    setComments((c) => [
      ...c,
      { _id: Date.now().toString(), user: { username: "You" }, content: text },
    ])
    setText("")
  }

  return (
    // full-screen backdrop – clicking it closes
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
      onClick={onClose}
    >
      {/* the sheet itself – stop propagation so clicks inside don't close */}
      <div
        className="w-full h-[60vh] bg-white dark:bg-black rounded-t-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* drag handle + X button */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto" />
          <button
            onClick={onClose}
            className="p-1 text-gray-600 hover:text-gray-900 dark:hover:text-white"
            aria-label="Close comments"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* header */}
        <div className="px-4 pb-2 text-center font-semibold border-b border-gray-200 dark:border-gray-800">
          Comments
        </div>

        {/* comments list */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {comments.map((c) => (
            <div key={c._id} className="flex items-start gap-3 mb-4">
              <Avatar className="w-8 h-8">
                {c.user.profilePic ? (
                  <AvatarImage src={c.user.profilePic} alt={c.user.username} />
                ) : (
                  <AvatarFallback>
                    {c.user.username 
                        ? c.user.username.charAt(0).toUpperCase() 
                        : "?"
                    }
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-semibold mr-1">
                    {c.user.username}
                  </span>
                  {c.content}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* input bar */}
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-800 flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarFallback>You</AvatarFallback>
          </Avatar>
          <Input
            placeholder="Add a comment…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="flex-1"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSubmit}
            disabled={!text.trim()}
            className="text-blue-500 disabled:text-gray-400"
          >
            Post
          </Button>
        </div>
      </div>
    </div>
  )
}
