import { View, ScrollView, RefreshControl, TouchableOpacity, Text, KeyboardAvoidingView, Platform } from 'react-native'
import React, { useRef } from 'react'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { usePostDetail } from '@/hooks/usePostDetail'
import { useComments } from '@/hooks/useComments'
import { LoadingSpinner, ErrorMessage } from '@/components/common'
import { PostCard } from '@/components/post'
import { CommentItem } from '@/components/post/CommentItem'
import { CommentInput, CommentInputRef } from '@/components/post/CommentInput'

const PostDetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { post, loading: postLoading, error: postError, refetch: refetchPost } = usePostDetail(id);
  const { comments, loading: commentsLoading, error: commentsError, refetch: refetchComments, submitting, addComment, replyTo, setReplyTo, sortBy, order, setSortBy, setOrder, loadReplies, repliesMap, likeComment, editComment, deleteComment } = useComments(id);
  const [editing, setEditing] = React.useState<{ id: string; text: string } | null>(null);
  const commentInputRef = useRef<CommentInputRef>(null);

  const onRefresh = async () => {
    await Promise.all([refetchPost(), refetchComments()]);
  };

  return (
    <SafeAreaView className='flex-1' style={{ backgroundColor: '#F9FAFB' }}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        keyboardVerticalOffset={Platform.select({ ios: 0, android: 0 })}
        style={{ flex: 1 }}
      >
        {/* Header with Back */}
        <View className='px-4 py-3 bg-white border-b border-gray-100 flex-row items-center'>
          <TouchableOpacity onPress={() => router.back()} className='mr-2 p-2 -ml-2'>
            <Text style={{ fontSize: 18 }}>‹</Text>
          </TouchableOpacity>
          <Text className='text-lg font-bold' style={{ color: '#111827' }}>Post</Text>
        </View>
        {(postLoading && !post) ? (
          <LoadingSpinner message="Loading post..." />
        ) : postError ? (
          <ErrorMessage message={postError} onRetry={refetchPost} />
        ) : (
          <>
            <ScrollView
              className='flex-1'
              refreshControl={<RefreshControl refreshing={commentsLoading} onRefresh={onRefresh} />}
              keyboardShouldPersistTaps='handled'
              contentContainerStyle={{ paddingBottom: 16 + insets.bottom + 64 }}
              showsVerticalScrollIndicator={false}
            >
              {post && (
                <PostCard
                  post={{
                    ...(post as any),
                    commentsCount: Array.isArray(comments) ? comments.length : (post as any)?.commentsCount,
                  } as any}
                  currentUserId={undefined}
                  onLike={() => { }}
                  onComment={() => { commentInputRef.current?.focus(); }}
                  onShare={() => { }}
                />
              )}

              <View className='mt-2 bg-white rounded-t-2xl border-t border-gray-100'>
                {Array.isArray(comments) && comments.length > 0 && (
                  <View className='flex-row justify-end px-4 pt-3'>
                    <TouchableOpacity onPress={() => { setSortBy('likesCount'); setOrder('desc'); }} className='px-3 py-1 rounded-full mr-2' style={{ backgroundColor: sortBy === 'likesCount' ? '#EFF6FF' : '#F3F4F6' }}>
                      <Text className='text-xs' style={{ color: '#1DA1F2' }}>Top</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setSortBy('createdAt'); setOrder('desc'); }} className='px-3 py-1 rounded-full' style={{ backgroundColor: sortBy === 'createdAt' ? '#EFF6FF' : '#F3F4F6' }}>
                      <Text className='text-xs' style={{ color: '#1DA1F2' }}>Newest</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {Array.isArray(comments) && comments.length > 0 ? (
                  comments.map((c: any, idx: number) => {
                    const cid = c?._id || idx;
                    const hasLoaded = Array.isArray(repliesMap[cid]) && repliesMap[cid].length > 0;
                    const replyCount = Array.isArray(c?.replies) ? c.replies.length : (hasLoaded ? repliesMap[cid].length : 0);
                    return (
                      <View key={cid}>
                        <CommentItem
                          comment={c}
                          onReply={(cm) => { setReplyTo(cm); setEditing(null); commentInputRef.current?.focus(); }}
                          onLike={(cm) => likeComment(cm._id)}
                          onEdit={(cm) => { setEditing({ id: cm._id, text: cm.content || '' }); setReplyTo(null); commentInputRef.current?.focus(); }}
                          onDelete={(cm) => deleteComment(cm._id)}
                        />
                        {hasLoaded ? (
                          repliesMap[cid].map((rc: any, rdx: number) => (
                            <View key={rc?._id || rdx} style={{ marginLeft: 48 }}>
                              <CommentItem comment={rc} onReply={(cm) => { setReplyTo(cm); setEditing(null); commentInputRef.current?.focus(); }} onLike={(cm) => likeComment(cm._id)} onEdit={(cm) => { setEditing({ id: cm._id, text: cm.content || '' }); setReplyTo(null); commentInputRef.current?.focus(); }} onDelete={(cm) => deleteComment(cm._id)} />
                            </View>
                          ))
                        ) : (
                          replyCount > 0 ? (
                            <TouchableOpacity onPress={() => loadReplies(c._id)} style={{ marginLeft: 48 }}>
                              <Text className='text-xs px-4 py-2' style={{ color: '#6B7280' }}>View replies ({replyCount})</Text>
                            </TouchableOpacity>
                          ) : null
                        )}
                      </View>
                    );
                  })
                ) : (
                  <View className='px-4 py-8 items-center'>
                    <Text className='text-gray-400 text-sm'>No comments yet</Text>
                    <TouchableOpacity
                      onPress={() => commentInputRef.current?.focus()}
                      className='mt-3 px-4 py-2 rounded-full'
                      style={{ backgroundColor: '#1DA1F2' }}
                      activeOpacity={0.7}
                    >
                      <Text className='text-white text-sm font-semibold'>Write a comment</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>

            <CommentInput
              ref={commentInputRef}
              replyingTo={replyTo ? { _id: replyTo._id, name: (replyTo.user?.firstName || '') + ' ' + (replyTo.user?.lastName || '') } : null}
              onCancelReply={() => setReplyTo(null)}
              editing={editing}
              onCancelEdit={() => setEditing(null)}
              onSubmit={async (text, mediaUri, mediaType, mediaName) => {
                if (editing?.id) {
                  await editComment(editing.id, text);
                  setEditing(null);
                } else {
                  await addComment(text, mediaUri, mediaType, mediaName);
                }
                await Promise.all([refetchComments(), refetchPost()]);
              }}
              submitting={submitting}
            />
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default PostDetailScreen


