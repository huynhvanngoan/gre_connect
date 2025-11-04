/**
 * Post Component Types and Interfaces
 */

export interface PostUser {
    profilePicture?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    role?: string;
    isVerified?: boolean;
}

export interface PostData {
    _id?: string;
    user?: PostUser;
    author?: PostUser;
    content: string;
    postType?: string;
    createdAt: string;
    isLiked?: boolean;
    likes?: any[];
    likesCount?: number;
    comments?: any[];
    commentsCount?: number;
    views?: any[];
    viewsCount?: number;
    shares?: any[];
    sharesCount?: number;
}

// PostHeader Props
export interface PostHeaderProps {
    user?: PostUser;
    author?: PostUser;
    createdAt: string;
}

// PostContent Props
export interface PostContentProps {
    content: string;
}

// PostTypeBadge Props
export interface PostTypeBadgeProps {
    postType: string;
}

// LikeButton Props
export interface LikeButtonProps {
    isLiked: boolean;
    likesCount: number;
    isLoading?: boolean;
    onPress: () => void;
}

// PostActions Props
export interface PostActionsProps {
    isLiked: boolean;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    isLiking?: boolean;
    onLike: () => void;
    onComment: () => void;
    onShare: () => void;
}

// PostCard Props
export interface PostCardProps {
    post: PostData;
    currentUserId?: string | null;
    isLiking?: boolean;
    onLike: (post: PostData) => Promise<void> | void;
    onComment: (post: PostData) => void;
    onShare: (post: PostData) => void;
}

// HomeHeader Props
export interface HomeHeaderProps {
    onLogoPress: () => void;
}

// CreatePostButton Props
export interface CreatePostButtonProps {
    onPress: () => void;
}

