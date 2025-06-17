import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Modal,
  Alert,
  Pressable,
  Dimensions,
  GestureResponderEvent,
  PanResponder,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import { usePosts, useSchool } from '../../lib/hooks/useQueries';
import { useColorScheme } from '../../lib/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import GradientText from '../../components/GradientText';
import { Easing } from 'react-native';
import { deleteFromCloudinary } from '../../lib/cloudinary';
import { useFocusEffect } from '@react-navigation/native';
import CommentsModal from '../../components/CommentsModal';
import { getCompetitionTag } from '../../lib/competitionTags';
import MeshGradient from '../../components/MeshGradient';
import IngredientsModal from '../../components/IngredientsModal';
import OptionsModal from '../../components/OptionsModal';
import CreatePostButton from '../../components/CreatePostButton';
import FilterButtons from '../../components/FilterButtons';
import Post from '../../components/Post';
import { ListEmptyComponent, ListFooterComponent } from '../../components/FeedListComponents';
import { usePostLikes } from '../../lib/hooks/usePostLikes';
import { usePostDeletion } from '../../lib/hooks/usePostDeletion';

// Animation constants
const ANIMATION_CONFIG = {
  MODAL: {
    DURATION: 300,
    SPRING: {
      DAMPING: 20,
      MASS: 0.5,
      STIFFNESS: 200,
    },
  },
  HEART: {
    DURATION: 150,
    SCALE: 1.3,
  },
  PULSE: {
    DURATION: 1000,
    SCALE: 1.1,
  },
};

// Move Post type to a separate types file
type Post = {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  likes_count: number;
  dish_name: string | null;
  ingredients: string | null;
  comments_count: number;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
    competitions_won: number | null;
    schools: {
      name: string;
    } | null;
  } | null;
};

export default function FeedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<'all' | 'mySchool' | 'friends'>('all');
  const [sortBy, setSortBy] = useState<'trending' | 'recent'>('trending');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<string>('');
  const { colorScheme } = useColorScheme();
  const modalAnimation = useRef(new Animated.Value(0)).current;
  const backdropAnimation = useRef(new Animated.Value(0)).current;
  const ingredientsModalAnimation = useRef(new Animated.Value(0)).current;
  const ingredientsBackdropAnimation = useRef(new Animated.Value(0)).current;
  const queryClient = useQueryClient();
  const [isGridView, setIsGridView] = useState(false);
  const [isViewTransitioning, setIsViewTransitioning] = useState(false);
  const { width: screenWidth } = Dimensions.get('window');
  const horizontalPadding = 16;
  const columnGap = 8;
  const gridItemWidth = (screenWidth - horizontalPadding * 2 - columnGap) / 2;
  const createButtonAnimation = useRef(new Animated.Value(0)).current;
  const filterAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const pageSize = 10;
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<Post | null>(null);
  const [isReturningFromProfile, setIsReturningFromProfile] = useState(false);
  const [hasInitialData, setHasInitialData] = useState(false);

  const { data: schoolData } = useSchool(user?.id || '');
  const {
    data: posts,
    isLoading,
    refetch,
  } = usePosts(schoolData?.id, activeFilter, page, pageSize, sortBy);

  const {
    likedPosts,
    postLikes,
    heartAnimations: postHeartAnimations,
    handleLike,
    initializeLikes,
  } = usePostLikes(user?.id);

  const { deletingPostId, handleDeletePost } = usePostDeletion();

  // Modify the useEffect that updates posts
  useEffect(() => {
    if (posts) {
      if (page === 1) {
        setAllPosts(posts as Post[]);
        setHasInitialData(true);
        initializeLikes(posts as Post[]);
      } else {
        // Filter out any duplicate posts by ID before appending
        const newPosts = (posts as Post[]).filter(
          (newPost) => !allPosts.some((existingPost) => existingPost.id === newPost.id)
        );
        // Sort the combined posts based on the current sort type
        const combinedPosts = [...allPosts, ...newPosts];
        if (sortBy === 'trending') {
          // For trending, sort by likes_count in descending order (most likes first)
          combinedPosts.sort((a, b) => b.likes_count - a.likes_count);
        } else {
          // For recent, sort by created_at in descending order (newest first)
          combinedPosts.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }
        setAllPosts(combinedPosts);
      }
      setHasMore((posts as Post[]).length === pageSize);
      setIsLoadingMore(false);
    }
  }, [posts, page, sortBy, initializeLikes]);

  const loadMore = async () => {
    if (!hasMore || isLoading || isLoadingMore) return;
    setIsLoadingMore(true);
    setPage((prev) => prev + 1);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await refetch();
    setRefreshing(false);
  };

  const animateModal = (show: boolean) => {
    Animated.parallel([
      Animated.timing(modalAnimation, {
        toValue: show ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnimation, {
        toValue: show ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateIngredientsModal = (show: boolean) => {
    Animated.parallel([
      Animated.timing(ingredientsModalAnimation, {
        toValue: show ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(ingredientsBackdropAnimation, {
        toValue: show ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    animateModal(false);
    animateIngredientsModal(showIngredients);
  }, [showIngredients]);

  const handleShowIngredients = (ingredients: string) => {
    setSelectedIngredients(ingredients);
    setShowIngredients(true);
  };

  const handleShowComments = useCallback((post: Post) => {
    setSelectedPostForComments(post);
    setShowCommentsModal(true);
  }, []);

  const handleCloseComments = useCallback(() => {
    setShowCommentsModal(false);
    setSelectedPostForComments(null);
  }, []);

  const handleAddComment = useCallback(
    async (comment: string) => {
      if (!selectedPostForComments) return;

      try {
        // Insert the comment into the comments table
        const { error } = await supabase.from('comments').insert([
          {
            post_id: selectedPostForComments.id,
            user_id: user?.id,
            content: comment,
          },
        ]);

        if (error) throw error;

        // Update the post's comment count in the UI
        setAllPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === selectedPostForComments.id
              ? { ...post, comments_count: (post.comments_count || 0) + 1 }
              : post
          )
        );
      } catch (error) {
        console.error('Error adding comment:', error);
        Alert.alert('Error', 'Failed to add comment. Please try again.');
      }
    },
    [selectedPostForComments, user?.id]
  );

  useEffect(() => {
    // Initial spring animation
    Animated.spring(createButtonAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();

    // Continuous pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: ANIMATION_CONFIG.PULSE.SCALE,
          duration: ANIMATION_CONFIG.PULSE.DURATION,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: ANIMATION_CONFIG.PULSE.DURATION,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    ).start();

    Animated.spring(filterAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, []);

  const handleViewSwitch = () => {
    setIsGridView(!isGridView);
  };

  const handleFilterChange = (filter: 'all' | 'mySchool' | 'friends') => {
    setActiveFilter(filter);
    setPage(1);
    setAllPosts([]);
    setHasMore(true);
    if (isGridView) {
      setIsGridView(false);
    }
  };

  const handleSortChange = (sort: 'trending' | 'recent') => {
    setSortBy(sort);
    setShowSortDropdown(false);
    setPage(1);
    setAllPosts([]);
    setHasMore(true);
    refetch();
  };

  const renderItem = ({ item: post, index }: { item: Post; index: number }) => {
    const isOwnPost = post.user_id === user?.id;
    const isDeleting = deletingPostId === post.id;

    if (isGridView) {
      return (
        <View
          key={`${post.id}-${index}`}
          style={{
            width: gridItemWidth,
            marginLeft: index % 2 === 0 ? horizontalPadding : columnGap / 2,
            marginRight: index % 2 === 0 ? columnGap / 2 : horizontalPadding,
          }}>
          <Post
            post={post}
            isGridView={true}
            isDeleting={isDeleting}
            likedPosts={likedPosts}
            postLikes={postLikes}
            heartAnimation={postHeartAnimations.current[post.id] || new Animated.Value(1)}
            onLike={handleLike}
            onShowComments={handleShowComments}
            onShowIngredients={handleShowIngredients}
            onShowOptions={(post) => {
              setSelectedPost(post);
              setShowOptionsModal(true);
            }}
            isOwnPost={isOwnPost}
            currentUserId={user?.id}
            onReturningFromProfile={() => setIsReturningFromProfile(true)}
          />
        </View>
      );
    }

    return (
      <Post
        post={post}
        isGridView={false}
        isDeleting={isDeleting}
        likedPosts={likedPosts}
        postLikes={postLikes}
        heartAnimation={postHeartAnimations.current[post.id] || new Animated.Value(1)}
        onLike={handleLike}
        onShowComments={handleShowComments}
        onShowIngredients={handleShowIngredients}
        onShowOptions={(post) => {
          setSelectedPost(post);
          setShowOptionsModal(true);
        }}
        isOwnPost={isOwnPost}
        currentUserId={user?.id}
        onReturningFromProfile={() => setIsReturningFromProfile(true)}
      />
    );
  };

  const getItemLayout = (data: ArrayLike<Post> | null | undefined, index: number) => {
    const itemHeight = isGridView ? gridItemWidth : 400; // Approximate height for list items
    return {
      length: itemHeight,
      offset: itemHeight * index,
      index,
    };
  };

  // Modify the useFocusEffect
  useFocusEffect(
    useCallback(() => {
      // Only refetch if we don't have initial data
      if (!hasInitialData) {
        setPage(1);
        setAllPosts([]);
        refetch();
      }
    }, [refetch, hasInitialData])
  );

  if (isLoading) {
    return (
      <SafeAreaView
        className={`flex-1 ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'}`}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f77f5e" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1">
      <MeshGradient
        intensity={50}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: colorScheme === 'dark' ? 0.3 : 0.2,
        }}
      />
      <View className="flex-1">
        {/* Header */}
        <View className="mt-[-0.5rem] px-4">
          <Text
            className={`font-pattaya text-[2.5rem] ${
              colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
            }`}>
            Picza
          </Text>
        </View>

        <FilterButtons
          activeFilter={activeFilter}
          sortBy={sortBy}
          isGridView={isGridView}
          schoolData={schoolData}
          onFilterChange={handleFilterChange}
          onSortChange={handleSortChange}
          onViewSwitch={handleViewSwitch}
        />

        {/* Main Content */}
        <View className="flex-1">
          <FlatList
            key={isGridView ? 'grid' : 'list'}
            ref={flatListRef}
            data={allPosts}
            renderItem={renderItem}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            ListEmptyComponent={
              <ListEmptyComponent
                isLoading={isLoading}
                activeFilter={activeFilter}
                isLoadingMore={isLoadingMore}
                schoolData={schoolData}
              />
            }
            ListFooterComponent={
              <ListFooterComponent
                isLoading={isLoading}
                activeFilter={activeFilter}
                isLoadingMore={isLoadingMore}
                schoolData={schoolData}
              />
            }
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 10,
            }}
            contentContainerStyle={{
              paddingHorizontal: isGridView ? 0 : 16,
              paddingBottom: 16,
            }}
            columnWrapperStyle={
              isGridView
                ? {
                    paddingHorizontal: 0,
                    justifyContent: 'flex-start',
                  }
                : undefined
            }
            numColumns={isGridView ? 2 : 1}
            showsVerticalScrollIndicator={false}
            getItemLayout={getItemLayout}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
            initialNumToRender={10}
          />
        </View>

        <CreatePostButton />

        {/* Modals */}
        <IngredientsModal
          visible={showIngredients}
          onClose={() => setShowIngredients(false)}
          ingredients={selectedIngredients}
        />
        <OptionsModal
          visible={showOptionsModal}
          onClose={() => setShowOptionsModal(false)}
          post={selectedPost}
          onDeletePost={handleDeletePost}
          isOwnPost={selectedPost?.user_id === user?.id}
        />
        <CommentsModal
          visible={showCommentsModal}
          onClose={handleCloseComments}
          post={selectedPostForComments}
          onAddComment={handleAddComment}
          colorScheme={colorScheme}
        />
      </View>
    </SafeAreaView>
  );
}
