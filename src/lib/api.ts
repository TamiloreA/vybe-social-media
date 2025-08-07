import { Post } from "./types";
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

interface ApiOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}
const getAuthToken = () => {
  if (typeof window !== "undefined") {
    // Try to get token from localStorage
    const token = localStorage.getItem("authToken");
    if (token) return token;

    // Fallback to parsing cookies
    const cookieMatch = document.cookie.match(/token=([^;]+)/);
    return cookieMatch ? cookieMatch[1] : null;
  }
  return null;
};

export const fetchAPI = async (endpoint: string, options: ApiOptions = {}) => {
  const { method = "GET", body, headers = {} } = options;

  // Get token from localStorage as fallback
  const localStorageToken =
    typeof window !== "undefined" ? localStorage.getItem("authToken") : null;

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(getAuthToken() && { Authorization: `Bearer ${getAuthToken()}` }),
      ...headers,
    },
    credentials: "include",
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);

    // Handle 401 Unauthorized
    if (response.status === 401) {
      // Clear tokens
      localStorage.removeItem("authToken");
      document.cookie = "token=; Max-Age=0; path=/;";

      // Trigger logout
      window.dispatchEvent(new Event("unauthorized"));
      throw new Error("Session expired. Please login again.");
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        throw new Error(
          `Request failed: ${response.status} ${response.statusText}`
        );
      }

      throw new Error(
        errorData.message ||
          errorData.errors?.server ||
          `Request failed: ${response.status}`
      );
    }

    return response.json();
  } catch (error) {
    console.error(`API request to ${endpoint} failed:`, error);
    throw error;
  }
};

// Auth API
export const authAPI = {
  signup: (data: {
    fullName: string;
    username: string;
    email: string;
    password: string;
  }) => fetchAPI("/auth/signup", { method: "POST", body: data }),

  login: (data: { email: string; password: string }) =>
    fetchAPI("/auth/login", { method: "POST", body: data }),

  logout: () => fetchAPI("/auth/logout", { method: "POST" }),

  getCurrentUser: () => fetchAPI("/auth/me"),
};

// User API
export const userAPI = {
  completeOnboarding: (followedUserIds: string[]) =>
    fetchAPI("/users/onboarding", {
      method: "POST",
      body: { followedUserIds },
    }),

    followUser: async (targetUserId: string) => {
      try {
        return await fetchAPI('/users/follow', { 
          method: 'POST', 
          body: { targetUserId } 
        });
      } catch (error: any) {
        // Enhanced error logging
        console.error('Follow API error:', {
          message: error.message,
          targetUserId,
          code: error.code || 'UNKNOWN',
          stack: error.stack
        });
        throw error;
      }
    },

  getSuggestedUsers: () => fetchAPI("/users/suggested"),

  // New method
  getUser: (userId: string) => fetchAPI(`/users/${userId}`),
  updateUser: (id: string, data: Record<string, any>) =>
    fetchAPI(`/users/${id}`, {
      method: "PUT",
      body: data,
    }),

  searchUsers: (query: string) =>
    fetchAPI(`/users/search?q=${encodeURIComponent(query)}`),
};

// Post API
export const postAPI = {
  createPost: (data: { content: string; image?: string }) =>
    fetchAPI("/posts", { method: "POST", body: data }),

  getPosts: () => fetchAPI("/posts"),

  toggleLike: async (postId: string) => {
    try {
      const response = await fetchAPI(`/posts/${postId}/like`, {
        method: "PUT",
      });

      return response;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Like failed",
        code: "NETWORK_ERROR",
      };
    }
  },

  addComment: (postId: string, content: string) =>
    fetchAPI(`/posts/${postId}/comment`, { method: "POST", body: { content } }),

  getFeed: (page: number = 1): Promise<Post[]> =>
    fetchAPI(`/posts/feed?page=${page}`),

  getPost: (postId: string) => fetchAPI(`/posts/${postId}`),
  getPostsByUser: (userId: string) => fetchAPI(`/posts/user/${userId}`),
};

// Chat API
export const chatAPI = {
  getConversations: () => fetchAPI("/chat/conversations"),

  getConversation: (conversationId: string) =>
    fetchAPI(`/chat/conversations/${conversationId}`),

  sendMessage: (conversationId: string, content: string) =>
    fetchAPI(`/chat/${conversationId}`, { method: "POST", body: { content } }),

  startConversation: (userId: string) =>
    fetchAPI(`/chat/start/${userId}`, { method: "POST" }),

  markConversationRead: (conversationId: string) =>
    fetchAPI(`/chat/${conversationId}/read`, { method: "PATCH" }),
  
};

export const notificationAPI = {
  getNotifications: () => fetchAPI("/notifications", { method: "GET" }),

  markAsRead: (id: string) =>
    fetchAPI(`/notifications/${id}/read`, { method: "PATCH" }),
};
