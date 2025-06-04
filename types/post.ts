export interface Post {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  likes_count: number;
  dish_name: string | null;
  ingredients: string | null;
  comments: string[] | null;
  comments_count?: number;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
    schools: {
      name: string;
    } | null;
  } | null;
}
