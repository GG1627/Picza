import React, { useState, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  Animated,
  Dimensions,
  Keyboard,
  Platform,
  StyleSheet,
  Image,
  Easing,
  PanResponder,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useRouter } from 'expo-router';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.65;
const SWIPE_THRESHOLD = 50;

type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  } | null;
};

type Post = {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  likes_count: number;
  dish_name: string | null;
  ingredients: string | null;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
    schools: {
      name: string;
    } | null;
  } | null;
};

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  post: Post | null;
  onAddComment: (comment: string) => void;
  colorScheme: 'dark' | 'light';
}

const CommentsModal = memo(
  ({ visible, onClose, post, onAddComment, colorScheme }: CommentsModalProps) => {
    const [newComment, setNewComment] = useState('');
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useAuth();
    const [modalVisible, setModalVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);
    const router = useRouter();
    const [isReturningFromProfile, setIsReturningFromProfile] = useState(false);

    const modalAnimation = useRef(new Animated.Value(0)).current;
    const backdropAnimation = useRef(new Animated.Value(0)).current;
    const keyboardAnimation = useRef(new Animated.Value(0)).current;
    const pan = useRef(new Animated.ValueXY()).current;
    const scrollViewRef = useRef<ScrollView>(null);
    const isAnimating = useRef(false);
    const isClosing = useRef(false);

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => !isAnimating.current && !isClosing.current,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          if (isAnimating.current || isClosing.current) return false;
          return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && gestureState.dy > 0;
        },
        onPanResponderGrant: () => {
          pan.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: (_, gestureState) => {
          if (isAnimating.current || isClosing.current) return;
          if (gestureState.dy > 0) {
            pan.y.setValue(gestureState.dy);
            const progress = Math.min(gestureState.dy / SCREEN_HEIGHT, 1);
            backdropAnimation.setValue(1 - progress);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (isAnimating.current || isClosing.current) return;

          const shouldClose = gestureState.dy > SWIPE_THRESHOLD;

          if (shouldClose) {
            isClosing.current = true;
            isAnimating.current = true;

            Animated.parallel([
              Animated.timing(pan, {
                toValue: { x: 0, y: SCREEN_HEIGHT },
                duration: 250,
                useNativeDriver: true,
                easing: Easing.out(Easing.cubic),
              }),
              Animated.timing(backdropAnimation, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
                easing: Easing.out(Easing.cubic),
              }),
            ]).start(() => {
              setModalVisible(false);
              onClose();
              // Reset flags immediately after modal closes
              isAnimating.current = false;
              isClosing.current = false;
            });
          } else {
            isAnimating.current = true;

            Animated.parallel([
              Animated.spring(pan, {
                toValue: { x: 0, y: 0 },
                useNativeDriver: true,
                tension: 100,
                friction: 8,
              }),
              Animated.timing(backdropAnimation, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }),
            ]).start(() => {
              isAnimating.current = false;
            });
          }
        },
        onPanResponderTerminate: () => {
          isAnimating.current = false;
          isClosing.current = false;
        },
      })
    ).current;

    useEffect(() => {
      const keyboardWillShow = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
        (e) => {
          setKeyboardHeight(e.endCoordinates.height);
          setIsKeyboardVisible(true);
          Animated.timing(keyboardAnimation, {
            toValue: 1,
            duration: Platform.OS === 'ios' ? 400 : 250,
            useNativeDriver: true,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }).start();
        }
      );

      const keyboardWillHide = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
        () => {
          setKeyboardHeight(0);
          setIsKeyboardVisible(false);
          Animated.timing(keyboardAnimation, {
            toValue: 0,
            duration: Platform.OS === 'ios' ? 400 : 250,
            useNativeDriver: true,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }).start();
        }
      );

      return () => {
        keyboardWillShow.remove();
        keyboardWillHide.remove();
      };
    }, []);

    useEffect(() => {
      if (visible) {
        setShouldRender(true);
        setModalVisible(true);
        pan.setValue({ x: 0, y: 0 });
        Animated.parallel([
          Animated.timing(modalAnimation, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(backdropAnimation, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
        fetchComments();
      } else {
        Animated.parallel([
          Animated.timing(modalAnimation, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(backdropAnimation, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setModalVisible(false);
          setShouldRender(false);
        });
      }
    }, [visible]);

    useEffect(() => {
      pan.setValue({ x: 0, y: 0 });
    }, [visible]);

    // Cleanup effect to reset flags when modal becomes invisible
    useEffect(() => {
      if (!visible) {
        // Reset flags when modal is not visible
        setTimeout(() => {
          isAnimating.current = false;
          isClosing.current = false;
        }, 100);
      }
    }, [visible]);

    const fetchComments = async () => {
      if (!post) return;
      setIsLoading(true);
      try {
        // First, get all comments for the post
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select('*')
          .eq('post_id', post.id)
          .order('created_at', { ascending: true });

        if (commentsError) throw commentsError;

        // Then, get all the user profiles for these comments
        const userIds = commentsData?.map((comment) => comment.user_id) || [];
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        // Combine the data
        const commentsWithProfiles =
          commentsData?.map((comment) => ({
            ...comment,
            profiles: profilesData?.find((profile) => profile.id === comment.user_id) || null,
          })) || [];

        setComments(commentsWithProfiles);
      } catch (error) {
        console.error('Error fetching comments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const handleAddComment = async () => {
      if (!newComment.trim() || !post || !user) return;

      try {
        // Call the feed's handleAddComment function to update the comment count
        onAddComment(newComment.trim());

        // Clear the input and dismiss keyboard
        setNewComment('');
        Keyboard.dismiss();

        // Refresh comments to show the new comment
        await fetchComments();

        // Scroll to the bottom to show the new comment
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } catch (error) {
        console.error('Error adding comment:', error);
      }
    };

    const handleClose = () => {
      if (isAnimating.current || isClosing.current) return;

      isClosing.current = true;
      isAnimating.current = true;

      Animated.parallel([
        Animated.timing(modalAnimation, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(backdropAnimation, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]).start(() => {
        setModalVisible(false);
        onClose();
        // Reset flags immediately after modal closes
        isAnimating.current = false;
        isClosing.current = false;
      });
    };

    const handleProfilePress = (userId: string) => {
      setIsReturningFromProfile(true);
      setModalVisible(false);
      router.push(`/user-profile?userId=${userId}`);
    };

    if (!shouldRender || !post) return null;

    const modalTranslateY = Animated.add(
      modalAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [SCREEN_HEIGHT, 0],
      }),
      pan.y
    );

    const keyboardOffset = keyboardAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -keyboardHeight],
    });

    const backdropOpacity = backdropAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.7],
    });

    const getTimeElapsed = (createdAt: string) => {
      const now = new Date();
      const commentDate = new Date(createdAt);
      const diffInSeconds = Math.floor((now.getTime() - commentDate.getTime()) / 1000);

      if (diffInSeconds < 60) return 'Just now';
      const diffInMinutes = Math.floor(diffInSeconds / 60);
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h ago`;
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays}d ago`;
      const diffInWeeks = Math.floor(diffInDays / 7);
      if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
      const diffInMonths = Math.floor(diffInDays / 30);
      if (diffInMonths < 12) return `${diffInMonths}mo ago`;
      return `${Math.floor(diffInDays / 365)}y ago`;
    };

    return (
      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        onRequestClose={handleClose}
        statusBarTranslucent
        hardwareAccelerated>
        <View style={styles.container}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: 'rgba(0,0,0,0.7)',
                opacity: backdropOpacity,
              },
            ]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
          </Animated.View>
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [{ translateY: Animated.add(modalTranslateY, keyboardOffset) }],
                height: MODAL_HEIGHT,
                opacity: modalAnimation,
              },
            ]}>
            <LinearGradient
              colors={colorScheme === 'dark' ? ['#1a1a1a', '#282828'] : ['#ffffff', '#f8f8f8']}
              style={styles.gradientBackground}>
              {/* Drag Handle and Header */}
              <View {...panResponder.panHandlers} style={styles.headerContainer}>
                <View style={styles.dragHandleContainer}>
                  <View
                    style={[
                      styles.dragHandle,
                      { backgroundColor: colorScheme === 'dark' ? '#333' : '#ddd' },
                    ]}
                  />
                </View>

                {/* Header */}
                <MotiView
                  from={{ opacity: 0, translateY: -20 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'timing', duration: 500 }}
                  style={styles.header}>
                  <View style={styles.headerContent}>
                    <View style={styles.titleContainer}>
                      <Text
                        style={[
                          styles.headerText,
                          { color: colorScheme === 'dark' ? '#E0E0E0' : '#07020D' },
                        ]}>
                        Comments
                      </Text>
                      <View style={styles.postPreview}>
                        <Image source={{ uri: post.image_url }} style={styles.previewImage} />
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.5)']}
                          style={styles.previewGradient}
                        />
                      </View>
                    </View>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                      <Ionicons
                        name="close"
                        size={24}
                        color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
                      />
                    </TouchableOpacity>
                  </View>
                </MotiView>
              </View>

              {/* Comments List */}
              <ScrollView
                ref={scrollViewRef}
                style={styles.commentsList}
                contentContainerStyle={styles.commentsListContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bounces={true}
                overScrollMode="always"
                scrollEventThrottle={16}>
                {comments.length > 0 ? (
                  comments.map((comment, index) => (
                    <MotiView
                      key={comment.id}
                      from={{ opacity: 0, translateX: -20 }}
                      animate={{ opacity: 1, translateX: 0 }}
                      transition={{ type: 'timing', duration: 500, delay: index * 100 }}
                      style={styles.commentContainer}>
                      <View style={styles.commentRow}>
                        <Image
                          source={
                            comment.profiles?.avatar_url
                              ? { uri: comment.profiles.avatar_url }
                              : require('../assets/default-avatar.png')
                          }
                          style={styles.avatar}
                        />
                        <View style={styles.commentContent}>
                          <View style={styles.commentHeader}>
                            <Pressable onPress={() => handleProfilePress(comment.user_id)}>
                              <Text
                                style={[
                                  styles.username,
                                  { color: colorScheme === 'dark' ? '#E0E0E0' : '#07020D' },
                                ]}>
                                {comment.profiles?.username}
                              </Text>
                            </Pressable>
                            <Text
                              style={[
                                styles.timestamp,
                                { color: colorScheme === 'dark' ? '#666' : '#999' },
                              ]}>
                              {getTimeElapsed(comment.created_at)}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.commentText,
                              { color: colorScheme === 'dark' ? '#E0E0E0' : '#07020D' },
                            ]}>
                            {comment.content}
                          </Text>
                        </View>
                      </View>
                    </MotiView>
                  ))
                ) : (
                  <MotiView
                    from={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'timing', duration: 500 }}
                    style={styles.emptyContainer}>
                    <View style={styles.emptyIconContainer}>
                      <Ionicons
                        name="chatbubble-outline"
                        size={48}
                        color={colorScheme === 'dark' ? '#f77f5e' : '#f77f5e'}
                      />
                    </View>
                    <Text
                      style={[
                        styles.emptyText,
                        { color: colorScheme === 'dark' ? '#666' : '#999' },
                      ]}>
                      No comments yet. Be the first to comment!
                    </Text>
                  </MotiView>
                )}
              </ScrollView>

              {/* Add Comment Input */}
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#ffffff',
                  },
                ]}>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor:
                        colorScheme === 'dark' ? 'rgba(247,127,94,0.1)' : 'rgba(247,127,94,0.05)',
                    },
                  ]}>
                  <TextInput
                    value={newComment}
                    onChangeText={setNewComment}
                    placeholder="Add a comment..."
                    placeholderTextColor={colorScheme === 'dark' ? '#666' : '#999'}
                    style={[
                      styles.input,
                      { color: colorScheme === 'dark' ? '#E0E0E0' : '#07020D' },
                    ]}
                    multiline={false}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    keyboardType="default"
                    returnKeyType="send"
                    onSubmitEditing={handleAddComment}
                    blurOnSubmit={false}
                  />
                  <TouchableOpacity
                    onPress={handleAddComment}
                    disabled={!newComment.trim()}
                    style={[
                      styles.sendButton,
                      {
                        backgroundColor: !newComment.trim()
                          ? colorScheme === 'dark'
                            ? '#333'
                            : '#ddd'
                          : '#f77f5e',
                      },
                    ]}>
                    <Ionicons name="send" size={20} color={!newComment.trim() ? '#666' : 'white'} />
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  gradientBackground: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  headerContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  dragHandleContainer: {
    width: '100%',
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    padding: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  postPreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    marginLeft: 8,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  closeButton: {
    padding: 4,
  },
  commentsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  commentsListContent: {
    paddingVertical: 16,
    paddingBottom: 32,
  },
  commentContainer: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
  timestamp: {
    fontSize: 13,
  },
  commentText: {
    fontSize: 15,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(247,127,94,0.1)',
    marginBottom: 16,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  inputContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 25,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});

export default CommentsModal;
