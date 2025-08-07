export interface User {
    _id: string;
    username: string;
    fullName: string;
    profilePic?: string;
  }
  
  export interface Post {
    _id: string;
    user: User;
    content: string;
    image?: string;
    likes: string[];
    comments: {
      _id: string;
      user: User;
      content: string;
    }[];
    createdAt: string;
  }