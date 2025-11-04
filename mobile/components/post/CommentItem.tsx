import { View, Text, Image, TouchableOpacity, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';


interface CommentItemProps {
  comment: any;
  onReply?: (comment: any) => void;
  onLike?: (comment: any) => void;
  onEdit?: (comment: any) => void;
  onDelete?: (comment: any) => void;
}

export const CommentItem: React.FC<CommentItemProps> = ({ comment, onReply, onLike, onEdit, onDelete }) => {
  const author = comment?.user || comment?.author;
  const media = comment?.media;
  const mediaUrl: string | undefined = media?.url || (typeof media === 'string' ? media : undefined);
  const mediaType: string = (media?.type || '').toString();
  const isImage = mediaUrl && (mediaType.includes('image') || mediaUrl.match(/\.(png|jpe?g|gif|webp)$/i));
  const isVideo = mediaUrl && (mediaType.includes('video') || mediaUrl.match(/\.(mp4|mov|webm)$/i));
  const initialLikes = Array.isArray(comment?.likes) ? comment.likes.length : (comment?.likesCount || 0);
  const [showReactions, setShowReactions] = useState(false);
  const [liked, setLiked] = useState(false);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [likesCount, setLikesCount] = useState(initialLikes);
  const REACTIONS = ['👍', '❤️', '😂', '😮', '😢'];

  const handleLikePress = () => {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount((prev: number) => Math.max(0, prev + (nextLiked ? 1 : -1)));
    onLike?.(comment);
  };
  return (
    <View className='flex-row px-4 py-3 border-b border-gray-100 bg-white'>
      {author?.profilePicture ? (
        <Image source={{ uri: author.profilePicture }} className='size-9 rounded-full mr-3' />
      ) : (
        <View className='size-9 rounded-full mr-3' style={{ backgroundColor: '#E5E7EB' }} />
      )}
      <View className='flex-1'>
        <View className='flex-row items-center mb-0.5'>
          <Text className='text-sm font-semibold' style={{ color: '#111827' }}>
            {author?.firstName} {author?.lastName}
          </Text>
          {author?.username && (
            <Text className='text-xs ml-1' style={{ color: '#9CA3AF' }}>@{author.username}</Text>
          )}
        </View>
        <Text className='text-sm' style={{ color: '#374151' }}>{comment?.content}</Text>
        {mediaUrl && (
          <View className='mt-2'>
            {isImage ? (
              <Image source={{ uri: mediaUrl }} className='w-40 h-40 rounded-lg' style={{ resizeMode: 'cover' }} />
            ) : (
              <TouchableOpacity onPress={() => { if (mediaUrl) Linking.openURL(mediaUrl); }}>
                <Text className='text-xs underline' style={{ color: '#1DA1F2' }} numberOfLines={1}>
                  {media?.fileName || 'View attachment'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        <View className='flex-row mt-2 items-center'>
          {onLike && (
            <TouchableOpacity onPress={handleLikePress} onLongPress={() => setShowReactions(true)} className='mr-4 flex-row items-center'>
              {selectedReaction ? (
                <Text style={{ fontSize: 14 }}>{selectedReaction}</Text>
              ) : (
                <Feather name={'thumbs-up'} size={14} color={liked ? '#1DA1F2' : '#6B7280'} />
              )}
              <Text className='text-xs font-medium ml-1' style={{ color: liked ? '#1DA1F2' : '#6B7280' }}>{likesCount}</Text>
            </TouchableOpacity>
          )}
          {onReply && (
            <TouchableOpacity onPress={() => onReply(comment)}>
              <Text className='text-xs font-medium' style={{ color: '#1DA1F2' }}>Reply</Text>
            </TouchableOpacity>
          )}
          {onEdit && (
            <TouchableOpacity onPress={() => onEdit(comment)} className='ml-4'>
              <Text className='text-xs font-medium' style={{ color: '#6B7280' }}>Edit</Text>
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity onPress={() => onDelete(comment)} className='ml-4'>
              <Text className='text-xs font-medium' style={{ color: '#EF4444' }}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
        {showReactions && (
          <View className='flex-row mt-2'>
            {REACTIONS.map((r, idx) => (
              <TouchableOpacity key={idx} onPress={() => {
                setShowReactions(false);
                if (!liked) { setLikesCount((prev: number) => prev + 1); setLiked(true); }
                setSelectedReaction(r);
                onLike?.(comment);
              }} className='mr-2 px-2 py-1 rounded-full' style={{ backgroundColor: '#F3F4F6' }}>
                <Text style={{ fontSize: 16 }}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};


