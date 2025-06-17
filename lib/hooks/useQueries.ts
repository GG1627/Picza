import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import * as base64 from 'base64-js';
import { uploadToCloudinary } from '../cloudinary';
import { getTrendingPosts } from '../trendingAlgorithm';

// Types
type Post = {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  likes_count: number;
  dish_name: string | null;
  ingredients: string | null;
  profiles: {
    username: string;
    avatar_url: string | null;
    schools: {
      name: string;
    } | null;
  } | null;
};

type School = {
  id: string;
  name: string;
  short_name: string;
  primary_color: string;
  secondary_color: string;
};

type DatabasePost = {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  likes_count: number;
  dish_name: string | null;
  ingredients: string | null;
  profiles: {
    username: string;
    avatar_url: string | null;
    schools: {
      name: string;
    } | null;
  } | null;
};

// Query Keys
export const queryKeys = {
  posts: 'posts',
  school: 'school',
  profile: 'profile',
} as const;

// Custom Hooks
export function usePosts(
  schoolId: string | undefined,
  filter: string,
  page = 1,
  pageSize = 10,
  sortBy: 'trending' | 'recent' = 'trending'
) {
  return useQuery({
    queryKey: ['posts', schoolId, filter, page, pageSize, sortBy],
    queryFn: async () => {
      let query = supabase.from('posts').select(`
          *,
          profiles (
            id,
            username,
            avatar_url,
            competitions_won,
            custom_tag,
            custom_tag_color,
            custom_tag_bg_color,
            custom_tag_border_color,
            schools (
              name
            )
          ),
          comments:comments(count)
        `);

      // Apply filters
      if (filter === 'mySchool' && schoolId) {
        query = query.eq('profiles.schools.id', schoolId);
      } else if (filter === 'otherSchools' && schoolId) {
        // Show posts from all schools except mine
        query = query.neq('profiles.schools.id', schoolId);
      } else if (filter === 'friends') {
        // For now, return empty array as friends feature is not implemented
        return [];
      }
      // 'all' filter doesn't need any additional conditions

      // Apply sorting
      if (sortBy === 'recent') {
        // For recent, sort by created_at in descending order (newest first)
        query = query.order('created_at', { ascending: false });
      } else {
        // For trending, we'll fetch all posts and sort them using our algorithm
        // We'll still order by created_at initially to ensure consistent pagination
        query = query.order('created_at', { ascending: false });
      }

      // Apply pagination
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;
      query = query.range(start, end);

      const { data, error } = await query;

      if (error) throw error;

      // Transform the data to include the comment count
      const transformedData = data.map((post) => ({
        ...post,
        comments_count: post.comments?.[0]?.count || 0,
      }));

      // If sorting by trending, apply our trending algorithm
      if (sortBy === 'trending') {
        return getTrendingPosts(transformedData);
      }

      return transformedData;
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep data in cache for 30 minutes
  });
}

export function useSchool(userId: string) {
  return useQuery({
    queryKey: [queryKeys.school, userId],
    queryFn: async () => {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('school_id')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      if (!profileData?.school_id) return null;

      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('id, name, short_name, primary_color, secondary_color')
        .eq('id', profileData.school_id)
        .single();

      if (schoolError) throw schoolError;
      return schoolData as School;
    },
    enabled: !!userId,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      image,
      dish_name,
      caption,
      ingredients,
    }: {
      image: string;
      dish_name: string;
      caption: string;
      ingredients: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Upload image to Cloudinary
      const response = await fetch(image);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64Image = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      const imageUrl = await uploadToCloudinary(base64Image.split(',')[1], 'post');

      // Create post with Cloudinary image URL
      const { error } = await supabase.from('posts').insert([
        {
          user_id: user.id,
          dish_name: dish_name,
          caption: caption,
          ingredients: ingredients,
          image_url: imageUrl,
          likes_count: 0,
        },
      ]);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate and refetch posts
      queryClient.invalidateQueries({ queryKey: [queryKeys.posts] });
    },
  });
}

export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, currentLikes }: { postId: string; currentLikes: number }) => {
      const { error } = await supabase
        .from('posts')
        .update({ likes_count: currentLikes })
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate and refetch posts
      queryClient.invalidateQueries({ queryKey: [queryKeys.posts] });
    },
  });
}
