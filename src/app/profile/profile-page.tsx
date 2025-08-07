"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  MoreHorizontal,
  Grid3X3,
  Bookmark,
  Tag,
  Heart,
  MessageCircle,
  Share,
  UserPlus,
  UserCheck,
  Camera,
  Edit3,
  MapPin,
  LinkIcon,
  X,
  Calendar,
} from "lucide-react";
import { userAPI, postAPI, chatAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";

interface ProfileUser {
  _id: string;
  username: string;
  fullName: string;
  profilePic?: string;
  bio?: string;
  website?: string;
  location?: string;
  joinedDate: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing?: boolean;
  isOwnProfile?: boolean;
}

interface ProfilePost {
  _id: string;
  image?: string;
  content: string;
  likes: string[];
  comments: any[];
  createdAt: string;
}

interface ProfilePageProps {
  userId?: string;
  currentUser?: any;
  onBack?: () => void;
  onFollowChange?: (userId: string, newFollowState: boolean) => void;
}

export default function ProfilePage({
  userId,
  currentUser,
  onBack,
  onFollowChange,
}: ProfilePageProps) {
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [savedPosts, setSavedPosts] = useState<ProfilePost[]>([]);
  const [taggedPosts, setTaggedPosts] = useState<ProfilePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [selectedPost, setSelectedPost] = useState<ProfilePost | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [editForm, setEditForm] = useState({
    fullName: "",
    bio: "",
    website: "",
    location: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const id = userId || currentUser!._id;
        const profileData = await userAPI.getUser(id);
        setEditForm({
          fullName: profileData.fullName || "",
          bio: profileData.bio || "",
          website: profileData.website || "",
          location: profileData.location || "",
        });
        profileData.isOwnProfile = profileData._id === currentUser!._id;
        setUser(profileData);
        const postsData = await postAPI.getPostsByUser(id);
        setPosts(postsData);
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId, currentUser]);

  const handleFollow = async () => {
    if (!user) return;
    
    // Capture current state before async operation
    const wasFollowing = user.isFollowing ?? false;
    const previousFollowersCount = user.followersCount;
    
    try {
      // Optimistic update
      setUser({
        ...user,
        isFollowing: !wasFollowing,
        followersCount: wasFollowing
          ? user.followersCount - 1
          : user.followersCount + 1,
      });
      
      if (onFollowChange) {
        onFollowChange(user._id, !wasFollowing);
      }
      
      await userAPI.followUser(user._id);
    } catch (error) {
      console.error("Failed to follow user:", error);
      
      // Revert using captured values
      setUser({
        ...user,
        isFollowing: wasFollowing,
        followersCount: previousFollowersCount,
      });
      
      if (onFollowChange) {
        onFollowChange(user._id, wasFollowing);
      }
    }
  };

  const handlePostClick = (post: ProfilePost) => {
    setSelectedPost(post);
  };

  const closePostModal = () => {
    setSelectedPost(null);
  };

  const handleFileInputClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !user.isOwnProfile) return;
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      setIsUploading(true);
      
      // Optimistic update with preview
      const previewUrl = URL.createObjectURL(file);
      setUser(prev => prev ? { ...prev, profilePic: previewUrl } : null);
      
      const formData = new FormData();
      formData.append("file", file);
  
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image");
      }
      
      const { url: imageUrl } = await uploadResponse.json();
      
      // Update user with new profile picture
      await userAPI.updateUser(currentUser!._id, { profilePic: imageUrl });
      
      // Force refresh the user data
      const updatedUser = await userAPI.getUser(currentUser!._id);
      setUser({
        ...updatedUser,
        isOwnProfile: true
      });
      
    } catch (error) {
      console.error("Profile picture upload failed:", error);
      // Revert to previous state
      const currentUserData = await userAPI.getUser(currentUser!._id);
      setUser({
        ...currentUserData,
        isOwnProfile: true
      });
      alert("Failed to upload profile picture. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">User not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {/* Hidden file input for profile picture upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleProfilePicChange}
        accept="image/*"
        className="hidden"
      />
      
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-6 border-b border-gray-200 dark:border-gray-800"
      >
        <div className="max-w-4xl mx-auto">
          {/* Profile Info Section */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 mb-6">
            {/* Profile Picture */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex justify-center sm:justify-start"
            >
              <div className="relative">
                <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-gray-200 dark:border-gray-700">
                  <AvatarImage
                    src={user.profilePic || "/placeholder.svg"}
                    alt={user.fullName}
                  />
                  <AvatarFallback className="text-2xl sm:text-3xl">
                    {user.fullName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {user.isOwnProfile && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleFileInputClick}
                    disabled={isUploading}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg"
                  >
                    {isUploading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </motion.button>
                )}
              </div>
            </motion.div>

            {/* Profile Details */}
            <div className="flex-1 text-center sm:text-left">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4"
              >
                <h1 className="text-xl sm:text-2xl font-semibold">
                  {user.username}
                </h1>

                <div className="flex gap-2 justify-center sm:justify-start">
                  {user.isOwnProfile ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 sm:flex-none bg-transparent"
                        onClick={() => setIsEditOpen(true)}
                      >
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit Profile
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={handleFollow}
                        size="sm"
                        className={`flex-1 sm:flex-none ${
                          user.isFollowing
                            ? "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700"
                            : "bg-blue-500 hover:bg-blue-600 text-white"
                        }`}
                      >
                        {user.isFollowing ? (
                          <>
                            <UserCheck className="w-4 h-4 mr-2" />
                            Following
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Follow
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const { _id: convId } = await chatAPI.startConversation(user._id);
                          router.push(`/messages?conversation=${convId}`);
                        }}
                      >
                        Message
                      </Button>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </>
                  )}

                  <AnimatePresence>
                    {isEditOpen && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsEditOpen(false)}
                        className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
                      >
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0, y: 20 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          exit={{ scale: 0.8, opacity: 0, y: 20 }}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-white dark:bg-black rounded-xl overflow-hidden max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-800"
                        >
                          {/* Header */}
                          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
                            <motion.h2
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
                            >
                              Edit Profile
                            </motion.h2>
                            <motion.button
                              initial={{ opacity: 0, rotate: -90 }}
                              animate={{ opacity: 1, rotate: 0 }}
                              whileHover={{ scale: 1.1, rotate: 90 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setIsEditOpen(false)}
                              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all duration-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                              <X className="w-5 h-5" />
                            </motion.button>
                          </div>

                          {/* Form */}
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              await userAPI.updateUser(user!._id, editForm);
                              setUser({ ...user!, ...editForm });
                              setIsEditOpen(false);
                            }}
                            className="p-6 space-y-6"
                          >
                            {/* Full Name */}
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 }}
                              className="space-y-2"
                            >
                              <label
                                htmlFor="fullName"
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                              >
                                Full Name
                              </label>
                              <input
                                id="fullName"
                                name="fullName"
                                type="text"
                                value={editForm.fullName}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    fullName: e.target.value,
                                  }))
                                }
                                className="w-full h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent transition-all duration-200 placeholder:text-gray-400"
                                placeholder="Enter your full name"
                              />
                            </motion.div>

                            {/* Bio */}
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                              className="space-y-2"
                            >
                              <label
                                htmlFor="bio"
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                              >
                                Bio
                              </label>
                              <textarea
                                id="bio"
                                name="bio"
                                rows={3}
                                value={editForm.bio}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    bio: e.target.value,
                                  }))
                                }
                                className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent transition-all duration-200 resize-none placeholder:text-gray-400"
                                placeholder="Tell us about yourself..."
                              />
                              <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                                {editForm.bio?.length || 0}/150 characters
                              </p>
                            </motion.div>

                            {/* Website */}
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 }}
                              className="space-y-2"
                            >
                              <label
                                htmlFor="website"
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                              >
                                Website
                              </label>
                              <div className="relative">
                                <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                  id="website"
                                  name="website"
                                  type="url"
                                  value={editForm.website}
                                  onChange={(e) =>
                                    setEditForm((f) => ({
                                      ...f,
                                      website: e.target.value,
                                    }))
                                  }
                                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent transition-all duration-200 placeholder:text-gray-400"
                                  placeholder="https://yourwebsite.com"
                                />
                              </div>
                            </motion.div>

                            {/* Location */}
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.4 }}
                              className="space-y-2"
                            >
                              <label
                                htmlFor="location"
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                              >
                                Location
                              </label>
                              <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                  id="location"
                                  name="location"
                                  type="text"
                                  value={editForm.location}
                                  onChange={(e) =>
                                    setEditForm((f) => ({
                                      ...f,
                                      location: e.target.value,
                                    }))
                                  }
                                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 focus:border-transparent transition-all duration-200 placeholder:text-gray-400"
                                  placeholder="City, Country"
                                />
                              </div>
                            </motion.div>

                            {/* Buttons */}
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.5 }}
                              className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800"
                            >
                              <motion.button
                                type="button"
                                onClick={() => setIsEditOpen(false)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex-1 h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all duration-200 font-medium"
                              >
                                Cancel
                              </motion.button>
                              <motion.button
                                type="submit"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="flex-1 h-11 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium shadow-lg transition-all duration-200"
                              >
                                Save Changes
                              </motion.button>
                            </motion.div>
                          </form>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex justify-center sm:justify-start gap-6 sm:gap-8 mb-4"
              >
                <div className="text-center">
                  <div className="font-semibold text-lg">
                    {user.postsCount?.toLocaleString() ?? "0"}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm">
                    posts
                  </div>
                </div>
                <button className="text-center hover:opacity-75 transition-opacity">
                  <div className="font-semibold text-lg">
                    {user.followersCount?.toLocaleString() ?? "0"}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm">
                    followers
                  </div>
                </button>
                <button className="text-center hover:opacity-75 transition-opacity">
                  <div className="font-semibold text-lg">
                    {user.followingCount?.toLocaleString() ?? "0"}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 text-sm">
                    following
                  </div>
                </button>
              </motion.div>

              {/* Bio and Details */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <h2 className="font-semibold">{user.fullName}</h2>
                {user.bio && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                    {user.bio}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row gap-2 text-sm text-gray-600 dark:text-gray-400">
                  {user.location && (
                    <div className="flex items-center gap-1 justify-center sm:justify-start">
                      <MapPin className="w-4 h-4" />
                      <span>{user.location}</span>
                    </div>
                  )}
                  {user.website && (
                    <div className="flex items-center gap-1 justify-center sm:justify-start">
                      <LinkIcon className="w-4 h-4" />
                      <a
                        href={user.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                      >
                        {user.website.replace(/^https?:\/\//, "")}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-1 justify-center sm:justify-start">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Joined{" "}
                      {new Date(user.joinedDate).toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Content Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-transparent border-b border-gray-200 dark:border-gray-800 rounded-none h-auto p-0">
            <TabsTrigger
              value="posts"
              className="flex items-center gap-2 py-3 border-b-2 border-transparent data-[state=active]:border-black dark:data-[state=active]:border-white bg-transparent rounded-none"
            >
              <Grid3X3 className="w-4 h-4" />
              <span className="hidden sm:inline">Posts</span>
            </TabsTrigger>
            {user.isOwnProfile && (
              <TabsTrigger
                value="saved"
                className="flex items-center gap-2 py-3 border-b-2 border-transparent data-[state=active]:border-black dark:data-[state=active]:border-white bg-transparent rounded-none"
              >
                <Bookmark className="w-4 h-4" />
                <span className="hidden sm:inline">Saved</span>
              </TabsTrigger>
            )}
            <TabsTrigger
              value="tagged"
              className="flex items-center gap-2 py-3 border-b-2 border-transparent data-[state=active]:border-black dark:data-[state=active]:border-white bg-transparent rounded-none"
            >
              <Tag className="w-4 h-4" />
              <span className="hidden sm:inline">Tagged</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts">
            <div className="mt-0">
              <PostGrid posts={posts} onPostClick={handlePostClick} />
            </div>
          </TabsContent>

          {user.isOwnProfile && (
            <TabsContent value="saved">
              <div className="mt-0">
                <PostGrid posts={savedPosts} onPostClick={handlePostClick} />
              </div>
            </TabsContent>
          )}

          <TabsContent value="tagged">
            <div className="mt-0">
              <PostGrid posts={taggedPosts} onPostClick={handlePostClick} />
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Post Modal */}
      <AnimatePresence>
        {selectedPost && (
          <PostModal
            post={selectedPost}
            user={user}
            onClose={closePostModal}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PostGrid({
  posts,
  onPostClick,
}: {
  posts: ProfilePost[];
  onPostClick: (post: ProfilePost) => void;
}) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 border-2 border-gray-300 dark:border-gray-700 rounded-full flex items-center justify-center mb-4">
          <Camera className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
        <p className="text-gray-500 text-center">
          When you share photos, they'll appear on your profile.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1 sm:gap-2 p-4">
      {posts.map((post, index) => (
        <motion.div
          key={post._id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onPostClick(post)}
          className="aspect-square relative cursor-pointer group overflow-hidden rounded-sm"
        >
          {post.image ? (
            <Image
              src={post.image || "/placeholder.svg"}
              alt="Post"
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
              <span className="text-xs text-gray-500 p-2 text-center line-clamp-3">
                {post.content}
              </span>
            </div>
          )}

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="flex items-center gap-4 text-white">
              <div className="flex items-center gap-1">
                <Heart className="w-5 h-5 fill-white" />
                <span className="font-semibold">{post.likes.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-5 h-5 fill-white" />
                <span className="font-semibold">{post.comments.length}</span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function PostModal({
  post,
  user,
  onClose,
}: {
  post: ProfilePost;
  user: ProfileUser;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-black rounded-lg overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col sm:flex-row"
      >
        {/* Image Section */}
        {post.image && (
          <div className="flex-1 relative min-h-[300px] sm:min-h-[500px]">
            <Image
              src={post.image || "/placeholder.svg"}
              alt="Post"
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Content Section */}
        <div className="w-full sm:w-96 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage
                  src={user.profilePic || "/placeholder.svg"}
                  alt={user.fullName}
                />
                <AvatarFallback className="text-2xl sm:text-3xl">
                  {user.fullName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold">{user.username}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 p-4">
            <p className="text-sm">{post.content}</p>
          </div>

          {/* Actions */}
          <div className="border-t border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon">
                  <Heart className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <MessageCircle className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Share className="w-5 h-5" />
                </Button>
              </div>
              <Button variant="ghost" size="icon">
                <Bookmark className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-sm font-semibold">{post.likes.length} likes</p>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(post.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-white dark:bg-black animate-pulse">
      <div className="px-4 py-6 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 mb-6">
            <div className="flex justify-center sm:justify-start">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
            </div>
            <div className="flex-1 space-y-4">
              <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-32"></div>
              <div className="flex gap-6">
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-16"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-16"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-16"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-24"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1 p-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-gray-300 dark:bg-gray-700 rounded"
          ></div>
        ))}
      </div>
    </div>
  );
}