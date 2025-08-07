"use client"

import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { postAPI } from "@/lib/api"
import { ImageIcon, X, Smile, MapPin } from "lucide-react"

export default function CreatePage() {
  const [content, setContent] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setLoading(true)
    let image: string | undefined

    if (imageFile) {
      const reader = new FileReader()
      reader.readAsDataURL(imageFile)
      await new Promise((res) => (reader.onload = res))
      image = reader.result as string
    }

    try {
      await postAPI.createPost({ content, image })
      router.refresh()
      setContent("")
      setImageFile(null)
      setImagePreview(null)
    } catch (err) {
      console.error(err)
      alert("Failed to create post. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      key="create"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="p-4 max-w-2xl mx-auto"
    >
      <Card className="bg-white/90 dark:bg-black/90 backdrop-blur-md border border-gray-200 dark:border-gray-800 shadow-xl">
        <CardContent className="p-0">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20"
          >
            <h2 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Create Post
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Share what's on your mind</p>
          </motion.div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* User Info & Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex gap-4"
            >
              <Avatar className="w-12 h-12 border-2 border-gray-200 dark:border-gray-700">
                <AvatarImage src={"/placeholder.svg"} alt="You" />
                <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold">
                  You
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-4">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's happening? Share your thoughts..."
                  rows={4}
                  className="w-full resize-none bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 text-lg leading-relaxed focus:outline-none"
                />

                {/* Character Counter */}
                <div className="flex justify-end">
                  <span
                    className={`text-xs ${
                      content.length > 280 ? "text-red-500" : content.length > 240 ? "text-yellow-500" : "text-gray-400"
                    }`}
                  >
                    {content.length}/280
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Image Preview */}
            {imagePreview && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700"
              >
                <img src={imagePreview || "/placeholder.svg"} alt="Preview" className="w-full max-h-96 object-cover" />
                <motion.button
                  type="button"
                  onClick={removeImage}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/70 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </motion.div>
            )}

            {/* Action Buttons & Post Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-200 dark:border-gray-800"
            >
              <div className="flex items-center gap-4">
                {/* Image Upload */}
                <motion.label
                  htmlFor="image-upload"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  <ImageIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Photo</span>
                </motion.label>
                <Input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />

                {/* Additional Options */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <Smile className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Emoji</span>
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Location</span>
                </motion.button>
              </div>

              {/* Post Button */}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="mt-4 sm:mt-0">
                <Button
                  type="submit"
                  disabled={loading || !content.trim() || content.length > 280}
                  className="w-full sm:w-auto px-8 py-2 h-10 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-full shadow-lg transition-all duration-200 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : (
                    "Post"
                  )}
                </Button>
              </motion.div>
            </motion.div>

            {/* Tips */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/10 dark:to-pink-950/10 rounded-lg p-4"
            >
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">💡 Tips for great posts:</h3>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Keep it authentic and engaging</li>
                <li>• Use hashtags to reach more people</li>
                <li>• Add images to make your post stand out</li>
                <li>• Ask questions to encourage interaction</li>
              </ul>
            </motion.div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  )
}
