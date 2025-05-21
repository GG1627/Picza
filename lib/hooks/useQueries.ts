import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import * as base64 from 'base64-js';

// Types
type Post = {
  id: string;
  user_id: string;
  caption: string | null;
  image_url: string;
  created_at: string;
  likes_count: number;
  profiles: {
    username: string;
    avatar_url: string | null;
    school_id: string;
  } | null;
};

type School = {
  id: string;
  name: string;
  short_name: string;
  primary_color: string;
  secondary_color: string;
};

// Query Keys
export const queryKeys = {
  posts: 'posts',
  school: 'school',
  profile: 'profile',
} as const;

// Custom Hooks
export function usePosts(schoolId?: string, filter: 'mySchool' | 'otherSchools' = 'mySchool') {
  return useQuery({
    queryKey: [queryKeys.posts, schoolId, filter],
    queryFn: async () => {
      let query = supabase
        .from('posts')
        .select(
          `
          *,
          profiles:profiles!user_id ( 
            username,
            avatar_url,
            school_id
          )
        `
        )
        .order('created_at', { ascending: false });

      if (schoolId) {
        if (filter === 'mySchool') {
          query = query.eq('profiles.school_id', schoolId);
        } else {
          query = query.not('profiles.school_id', 'is', null).neq('profiles.school_id', schoolId);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as Post[]).filter((post) => post.profiles !== null);
    },
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
    mutationFn: async ({ image, caption }: { image: string; caption: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Upload image
      const response = await fetch(image);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64Image = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      const filePath = `${user.id}/${new Date().getTime()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(filePath, base64.toByteArray(base64Image.split(',')[1]), {
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('post-images').getPublicUrl(filePath);

      // Create post
      const { error } = await supabase.from('posts').insert([
        {
          user_id: user.id,
          caption: caption,
          image_url: publicUrl,
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
