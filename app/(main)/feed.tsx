import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
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
import { updateSinglePostTrendingScore } from '../../lib/trendingAlgorithm';

// Declare global types for callbacks
declare global {
  var filterChangeCallback: ((filter: 'all' | 'mySchool' | 'friends') => void) | undefined;
  var sortChangeCallback: ((sort: 'trending' | 'recent') => void) | undefined;
  var viewSwitchCallback: ((gridView: boolean) => void) | undefined;
}

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
    custom_tag: string | null;
    custom_tag_color: string | null;
    schools: {
      name: string;
    } | null;
  } | null;
};

// Create a context for the feed state
const FeedContext = React.createContext<{
  activeFilter: 'all' | 'mySchool' | 'friends';
  sortBy: 'trending' | 'recent';
  isGridView: boolean;
  setActiveFilter: (filter: 'all' | 'mySchool' | 'friends') => void;
  setSortBy: (sort: 'trending' | 'recent') => void;
  setIsGridView: (gridView: boolean) => void;
} | null>(null);

// Static Layout Component - Never re-renders, like a tab bar
const StaticLayout = memo(({ children }: { children: React.ReactNode }) => {
  const { colorScheme } = useColorScheme();

  return (
    <View className={`flex-1 ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#E8E9EB]'}`}>
      <SafeAreaView edges={['top']} className="flex-1">
        <View className="flex-1">
          {/* Static Header - Never re-renders */}
          <View className="mb-[-0.5rem] mt-[-0.5rem] px-4">
            {colorScheme === 'dark' ? (
              <GradientText
                colors={['#ff9f6b', '#ff9f6b']}
                className="ml-0.5 font-pattaya text-[2.5rem]">
                Picza
              </GradientText>
            ) : (
              <GradientText
                colors={['#000000', '#000000']}
                className="ml-0.5 font-pattaya text-[2.5rem]">
                Picza
              </GradientText>
            )}
          </View>

          {/* Static Filter Buttons - Never re-renders */}
          <View
            style={{
              position: 'absolute',
              top: 45,
              left: 0,
              right: 0,
              zIndex: 10,
              backgroundColor: 'transparent',
            }}>
            <StaticFilterButtons />
          </View>

          {/* Dynamic Content Area - Only this re-renders */}
          <View style={{ flex: 1 }}>{children}</View>
        </View>
      </SafeAreaView>
    </View>
  );
});

// Static Filter Buttons - Never re-renders
const StaticFilterButtons = memo(() => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'mySchool' | 'friends'>('all');
  const [sortBy, setSortBy] = useState<'trending' | 'recent'>('trending');
  const [isGridView, setIsGridView] = useState(false);
  const { user } = useAuth();
  const { data: schoolData } = useSchool(user?.id || '');

  // Initialize global callbacks immediately when component mounts
  useEffect(() => {
    global.filterChangeCallback = (filter: 'all' | 'mySchool' | 'friends') => {
      // This will be overridden by DynamicPostsList
    };

    global.sortChangeCallback = (sort: 'trending' | 'recent') => {
      // This will be overridden by DynamicPostsList
    };

    global.viewSwitchCallback = (gridView: boolean) => {
      // This will be overridden by DynamicPostsList
    };
  }, []);

  // Use a simple event emitter
  const handleFilterChange = useCallback((filter: 'all' | 'mySchool' | 'friends') => {
    setActiveFilter(filter);
    // Emit to parent
    if (global.filterChangeCallback) {
      global.filterChangeCallback(filter);
    }
  }, []);

  const handleSortChange = useCallback((sort: 'trending' | 'recent') => {
    setSortBy(sort);
    if (global.sortChangeCallback) {
      global.sortChangeCallback(sort);
    }
  }, []);

  const handleViewSwitch = useCallback(() => {
    setIsGridView(!isGridView);
    if (global.viewSwitchCallback) {
      global.viewSwitchCallback(!isGridView);
    }
  }, [isGridView]);

  return (
    <FilterButtons
      activeFilter={activeFilter}
      sortBy={sortBy}
      isGridView={isGridView}
      schoolData={schoolData}
      onFilterChange={handleFilterChange}
      onSortChange={handleSortChange}
      onViewSwitch={handleViewSwitch}
    />
  );
});

// Dynamic Posts List Component - Only this re-renders
const DynamicPostsList = memo(() => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'mySchool' | 'friends'>('all');
  const [sortBy, setSortBy] = useState<'trending' | 'recent'>('trending');
  const [isGridView, setIsGridView] = useState(false);
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<string>('');
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<Post | null>(null);
  const [isReturningFromProfile, setIsReturningFromProfile] = useState(false);
  const [hasInitialData, setHasInitialData] = useState(false);
  const [commentCounts, setCommentCounts] = useState<{ [key: string]: number }>({});
  const { colorScheme } = useColorScheme();
  const pageSize = 10;

  const { data: schoolData } = useSchool(user?.id || '');
  const {
    data: posts,
    isLoading,
    refetch,
  } = usePosts(schoolData?.id || undefined, activeFilter, page, pageSize, sortBy);

  const {
    likedPosts,
    postLikes,
    heartAnimations: postHeartAnimations,
    handleLike,
    initializeLikes,
  } = usePostLikes(user?.id);

  const { deletingPostId, handleDeletePost } = usePostDeletion();

  // Initialize comment counts from posts
  const initializeCommentCounts = useCallback((posts: Post[]) => {
    const initialCounts = posts.reduce(
      (acc, post) => {
        acc[post.id] = post.comments_count || 0;
        return acc;
      },
      {} as { [key: string]: number }
    );
    setCommentCounts(initialCounts);
  }, []);

  // Optimize React Query cache for better performance
  const queryClient = useQueryClient();

  // Set up global callbacks - this will override the ones set by StaticFilterButtons
  useEffect(() => {
    global.filterChangeCallback = (filter: 'all' | 'mySchool' | 'friends') => {
      setActiveFilter(filter);
      setPage(1);
      setAllPosts([]);
      setHasMore(true);
      if (isGridView) {
        setIsGridView(false);
      }
    };

    global.sortChangeCallback = (sort: 'trending' | 'recent') => {
      setSortBy(sort);
      setPage(1);
      setAllPosts([]);
      setHasMore(true);
      refetch();
    };

    global.viewSwitchCallback = (gridView: boolean) => {
      setIsGridView(gridView);
    };

    return () => {
      delete global.filterChangeCallback;
      delete global.sortChangeCallback;
      delete global.viewSwitchCallback;
    };
  }, [isGridView, refetch]);

  // Ensure initial data is loaded when schoolData is available
  useEffect(() => {
    if (schoolData && !hasInitialData && !isLoading) {
      setPage(1);
      setAllPosts([]);
      setHasMore(true);
      refetch();
    }
  }, [schoolData, hasInitialData, isLoading, refetch]);

  // Update posts when data changes
  useEffect(() => {
    if (posts) {
      if (page === 1) {
        setAllPosts(posts as Post[]);
        setHasInitialData(true);
        initializeLikes(posts as Post[]);
        initializeCommentCounts(posts as Post[]);
      } else {
        const newPosts = (posts as Post[]).filter(
          (newPost) => !allPosts.some((existingPost) => existingPost.id === newPost.id)
        );
        const combinedPosts = [...allPosts, ...newPosts];
        // Don't re-sort here - the trending algorithm already sorted the posts
        setAllPosts(combinedPosts);
        initializeLikes(combinedPosts);
        initializeCommentCounts(combinedPosts);
      }
      setHasMore((posts as Post[]).length === pageSize);
      setIsLoadingMore(false);
    }
  }, [posts, page, initializeLikes, initializeCommentCounts]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || isLoadingMore) return;
    setIsLoadingMore(true);
    setPage((prev) => prev + 1);
  }, [hasMore, isLoading, isLoadingMore]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleShowIngredients = useCallback((ingredients: string) => {
    setSelectedIngredients(ingredients);
    setShowIngredients(true);
  }, []);

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
        const { error } = await supabase.from('comments').insert([
          {
            post_id: selectedPostForComments.id,
            user_id: user?.id,
            content: comment,
          },
        ]);

        if (error) throw error;

        // Update local comment counts
        setCommentCounts((prev) => ({
          ...prev,
          [selectedPostForComments.id]: (prev[selectedPostForComments.id] || 0) + 1,
        }));

        // Also update posts state for consistency
        setAllPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === selectedPostForComments.id
              ? { ...post, comments_count: (post.comments_count || 0) + 1 }
              : post
          )
        );

        // Update trending score for this post (don't await to avoid blocking UI)
        updateSinglePostTrendingScore(selectedPostForComments.id).catch((error: unknown) => {
          console.warn('Failed to update trending score after comment:', error);
        });
      } catch (error) {
        console.error('Error adding comment:', error);
        Alert.alert('Error', 'Failed to add comment. Please try again.');
      }
    },
    [selectedPostForComments, user?.id]
  );

  const handleShowOptions = useCallback((post: Post) => {
    setSelectedPost(post);
    setShowOptionsModal(true);
  }, []);

  const handleReturningFromProfile = useCallback(() => {
    setIsReturningFromProfile(true);
  }, []);

  // OPTIMIZED: Removed expensive comment sync - comment counts are already included in posts query
  useFocusEffect(
    useCallback(() => {
      if (!hasInitialData && schoolData) {
        setPage(1);
        setAllPosts([]);
        setHasMore(true);
        refetch();
      }
      // Comment counts are already accurate from the posts query and updated optimistically
      // No need for expensive sync that fetches all comments for all posts
    }, [refetch, hasInitialData, schoolData])
  );

  const { width: screenWidth } = Dimensions.get('window');
  const horizontalPadding = 16;
  const columnGap = 8;
  const gridItemWidth = (screenWidth - horizontalPadding * 2 - columnGap) / 2;
  const flatListRef = useRef<FlatList>(null);

  const renderItem = useCallback(
    ({ item: post, index }: { item: Post; index: number }) => {
      const isOwnPost = post.user_id === user?.id;
      const isDeleting = deletingPostId === post.id;
      const currentCommentCount = commentCounts[post.id] || post.comments_count || 0;

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
              post={{ ...post, comments_count: currentCommentCount }}
              isGridView={true}
              isDeleting={isDeleting}
              likedPosts={likedPosts}
              postLikes={postLikes}
              heartAnimation={postHeartAnimations.current[post.id] || new Animated.Value(1)}
              onLike={handleLike}
              onShowComments={handleShowComments}
              onShowIngredients={handleShowIngredients}
              onShowOptions={handleShowOptions}
              isOwnPost={isOwnPost}
              currentUserId={user?.id}
              onReturningFromProfile={handleReturningFromProfile}
            />
          </View>
        );
      }

      return (
        <Post
          post={{ ...post, comments_count: currentCommentCount }}
          isGridView={false}
          isDeleting={isDeleting}
          likedPosts={likedPosts}
          postLikes={postLikes}
          heartAnimation={postHeartAnimations.current[post.id] || new Animated.Value(1)}
          onLike={handleLike}
          onShowComments={handleShowComments}
          onShowIngredients={handleShowIngredients}
          onShowOptions={handleShowOptions}
          isOwnPost={isOwnPost}
          currentUserId={user?.id}
          onReturningFromProfile={handleReturningFromProfile}
        />
      );
    },
    [
      isGridView,
      gridItemWidth,
      horizontalPadding,
      columnGap,
      deletingPostId,
      likedPosts,
      postLikes,
      postHeartAnimations,
      commentCounts,
      user?.id,
      handleLike,
      handleShowComments,
      handleShowIngredients,
      handleShowOptions,
      handleReturningFromProfile,
    ]
  );

  const getItemLayout = useCallback(
    (data: ArrayLike<Post> | null | undefined, index: number) => {
      const itemHeight = isGridView ? gridItemWidth : 400;
      return {
        length: itemHeight,
        offset: itemHeight * index,
        index,
      };
    },
    [isGridView, gridItemWidth]
  );

  const keyExtractor = useCallback((item: Post, index: number) => `${item.id}-${index}`, []);

  const listEmptyComponent = useMemo(
    () => (
      <ListEmptyComponent
        isLoading={isLoading}
        activeFilter={activeFilter}
        isLoadingMore={isLoadingMore}
        schoolData={schoolData}
      />
    ),
    [isLoading, activeFilter, isLoadingMore, schoolData]
  );

  const listFooterComponent = useMemo(
    () => (
      <ListFooterComponent
        isLoading={isLoading}
        activeFilter={activeFilter}
        isLoadingMore={isLoadingMore}
        schoolData={schoolData}
      />
    ),
    [isLoading, activeFilter, isLoadingMore, schoolData]
  );

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={handleRefresh}
        progressViewOffset={60}
        progressBackgroundColor="transparent"
        colors={['#f77f5e']}
      />
    ),
    [refreshing, handleRefresh]
  );

  const contentContainerStyle = useMemo(
    () => ({
      paddingHorizontal: isGridView ? 0 : 16,
      paddingBottom: 80,
      paddingTop: 60,
    }),
    [isGridView]
  );

  const columnWrapperStyle = useMemo(
    () =>
      isGridView
        ? {
            paddingHorizontal: 0,
            justifyContent: 'flex-start' as const,
          }
        : undefined,
    [isGridView]
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ paddingTop: 120 }}>
        <ActivityIndicator size="large" color="#f77f5e" />
      </View>
    );
  }

  return (
    <>
      <View className="flex-1">
        <FlatList
          key={isGridView ? 'grid' : 'list'}
          ref={flatListRef}
          data={allPosts}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={refreshControl}
          ListEmptyComponent={listEmptyComponent}
          ListFooterComponent={listFooterComponent}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
          contentContainerStyle={contentContainerStyle}
          columnWrapperStyle={columnWrapperStyle}
          numColumns={isGridView ? 2 : 1}
          showsVerticalScrollIndicator={false}
          getItemLayout={getItemLayout}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          initialNumToRender={10}
        />
      </View>

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
    </>
  );
});

export default function FeedScreen() {
  return (
    <StaticLayout>
      <DynamicPostsList />
    </StaticLayout>
  );
}
