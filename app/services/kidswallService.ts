/**
 * Kids Wall Service (App)
 *
 * API client for Kids Wall: feed, child posts, create/update/delete post,
 * toggle like/star. All routes require auth (parent/child context).
 *
 * Backend: GET /kids-wall/all, GET /kids-wall/child/:childId,
 * GET /kids-wall/:postId/child/:childId, POST/PATCH/DELETE, like/star.
 */

import { api } from '@/services/api';

// ---------------------------------------------------------------------------
// Types (match backend KidsWallPost populated responses)
// ---------------------------------------------------------------------------

export interface KidsWallApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  count?: number;
}

export interface KidsWallChildRef {
  _id: string;
  displayName?: string;
  avatar?: string | null;
  age?: number | null;
}

export interface KidsWallImage {
  _id: string;
  url?: string;
  filePath?: string;
  mimeType?: string;
  size?: number;
}

export interface KidsWallLike {
  child: KidsWallChildRef | string;
  likedAt?: string;
}

export interface KidsWallStar {
  child: KidsWallChildRef | string;
  starredAt?: string;
}

export interface KidsWallPost {
  _id: string;
  child: KidsWallChildRef | string;
  type?: string;
  title: string;
  content: string;
  images?: KidsWallImage[];
  likes?: KidsWallLike[];
  stars?: KidsWallStar[];
  isApproved?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePostInput {
  title: string;
  content: string;
}

export interface UpdatePostInput {
  title?: string;
  content?: string;
}

/** Normalize API error to string (api interceptor already rejects with Error) */
function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return typeof err === 'string' ? err : 'Request failed';
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const kidswallService = {
  /**
   * Get all posts (feed) – approved posts from all children.
   * GET /kids-wall/all
   */
  getAllPosts: async (): Promise<KidsWallApiResponse<KidsWallPost[]>> => {
    const res = await api.get<KidsWallApiResponse<KidsWallPost[]>>('/kids-wall/all');
    return res as KidsWallApiResponse<KidsWallPost[]>;
  },

  /**
   * Get all posts for a specific child.
   * GET /kids-wall/child/:childId
   */
  getChildPosts: async (childId: string): Promise<KidsWallApiResponse<KidsWallPost[]>> => {
    const res = await api.get<KidsWallApiResponse<KidsWallPost[]>>(
      `/kids-wall/child/${encodeURIComponent(childId)}`
    );
    return res as KidsWallApiResponse<KidsWallPost[]>;
  },

  /**
   * Get single post by ID.
   * GET /kids-wall/:postId/child/:childId
   */
  getPostById: async (
    postId: string,
    childId: string
  ): Promise<KidsWallApiResponse<KidsWallPost>> => {
    const res = await api.get<KidsWallApiResponse<KidsWallPost>>(
      `/kids-wall/${encodeURIComponent(postId)}/child/${encodeURIComponent(childId)}`
    );
    return res as KidsWallApiResponse<KidsWallPost>;
  },

  /**
   * Create a new post with image.
   * POST /kids-wall/child/:childId (multipart: title, content, image)
   */
  createPost: async (
    childId: string,
    postData: CreatePostInput,
    imageFile: { uri: string; name?: string; type?: string }
  ): Promise<KidsWallApiResponse<KidsWallPost>> => {
    const formData = new FormData();
    formData.append('title', postData.title.trim());
    formData.append('content', postData.content.trim());
    formData.append('image', {
      uri: imageFile.uri,
      name: imageFile.name ?? 'image.jpg',
      type: imageFile.type ?? 'image/jpeg',
    } as unknown as Blob);

    const res = await api.post<KidsWallApiResponse<KidsWallPost>>(
      `/kids-wall/child/${encodeURIComponent(childId)}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return res as KidsWallApiResponse<KidsWallPost>;
  },

  /**
   * Update post (title, content, optional new image).
   * PATCH /kids-wall/:postId/child/:childId
   */
  updatePost: async (
    postId: string,
    childId: string,
    postData: UpdatePostInput,
    imageFile?: { uri: string; name?: string; type?: string }
  ): Promise<KidsWallApiResponse<KidsWallPost>> => {
    const formData = new FormData();
    if (postData.title !== undefined) formData.append('title', postData.title.trim());
    if (postData.content !== undefined) formData.append('content', postData.content.trim());
    if (imageFile) {
      formData.append('image', {
        uri: imageFile.uri,
        name: imageFile.name ?? 'image.jpg',
        type: imageFile.type ?? 'image/jpeg',
      } as unknown as Blob);
    }

    const res = await api.patch<KidsWallApiResponse<KidsWallPost>>(
      `/kids-wall/${encodeURIComponent(postId)}/child/${encodeURIComponent(childId)}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return res as KidsWallApiResponse<KidsWallPost>;
  },

  /**
   * Delete post (soft delete).
   * DELETE /kids-wall/:postId/child/:childId
   */
  deletePost: async (
    postId: string,
    childId: string
  ): Promise<KidsWallApiResponse<Record<string, never>>> => {
    const res = await api.delete<KidsWallApiResponse<Record<string, never>>>(
      `/kids-wall/${encodeURIComponent(postId)}/child/${encodeURIComponent(childId)}`
    );
    return res as KidsWallApiResponse<Record<string, never>>;
  },

  /**
   * Toggle like on a post.
   * POST /kids-wall/:postId/like/child/:childId
   */
  toggleLike: async (
    postId: string,
    childId: string
  ): Promise<KidsWallApiResponse<KidsWallPost>> => {
    const res = await api.post<KidsWallApiResponse<KidsWallPost>>(
      `/kids-wall/${encodeURIComponent(postId)}/like/child/${encodeURIComponent(childId)}`
    );
    return res as KidsWallApiResponse<KidsWallPost>;
  },

  /**
   * Toggle star on a post.
   * POST /kids-wall/:postId/star/child/:childId
   */
  toggleStar: async (
    postId: string,
    childId: string
  ): Promise<KidsWallApiResponse<KidsWallPost>> => {
    const res = await api.post<KidsWallApiResponse<KidsWallPost>>(
      `/kids-wall/${encodeURIComponent(postId)}/star/child/${encodeURIComponent(childId)}`
    );
    return res as KidsWallApiResponse<KidsWallPost>;
  },
};

export { kidswallService, toErrorMessage };
