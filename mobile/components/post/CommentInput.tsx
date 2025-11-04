import { View, TextInput, TouchableOpacity, Text, Image, Alert as RNAlert } from 'react-native';
import React, { useState, useRef, useImperativeHandle, useEffect } from 'react';
import { apiService } from '@/services/api';

export interface CommentInputRef {
  focus: () => void;
}

interface CommentInputProps {
  onSubmit: (text: string, mediaUri?: string, mediaType?: string, mediaName?: string) => Promise<void> | void;
  submitting?: boolean;
  replyingTo?: { _id: string; name?: string } | null;
  onCancelReply?: () => void;
  editing?: { id: string; text: string } | null;
  onCancelEdit?: () => void;
}

export const CommentInput = React.forwardRef<CommentInputRef, CommentInputProps>(({ onSubmit, submitting, replyingTo, onCancelReply, editing, onCancelEdit }, ref) => {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const [mediaUri, setMediaUri] = useState<string | undefined>();
  const [mediaType, setMediaType] = useState<string | undefined>();
  const [mediaName, setMediaName] = useState<string | undefined>();
  const [mentionQuery, setMentionQuery] = useState<string>('');
  const [mentionResults, setMentionResults] = useState<any[]>([]);
  const [showEmojis, setShowEmojis] = useState<boolean>(false);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  const handleSend = async () => {
    const trimmed = text.trim();
    if (trimmed.length < 1 || trimmed.length > 500) return;
    await onSubmit(trimmed, mediaUri, mediaType, mediaName);
    setText('');
    setMediaUri(undefined);
    setMediaType(undefined);
    setMediaName(undefined);
  };

  const pickImage = async () => {
    try {
      // @ts-ignore - Optional dependency in Expo projects
      const ImagePicker: any = ((): any => { try { return require('expo-image-picker'); } catch { return null; } })();
      if (!ImagePicker) { RNAlert.alert('Attachment', 'Image picker is not available.'); return; }
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') { RNAlert.alert('Permission required', 'Allow Photos permission to attach media.'); return; }
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.8 });
      if (!res.canceled && res.assets && res.assets[0]) {
        const asset = res.assets[0] as any;
        setMediaUri(asset.uri);
        setMediaType(asset.type === 'video' ? 'video/mp4' : (asset.mimeType || 'image/jpeg'));
        const inferredName = (asset.fileName || asset.uri?.split('/')?.pop() || 'upload');
        setMediaName(inferredName);
      }
    } catch { }
  };

  const pickFile = async () => {
    try {
      // @ts-ignore optional dependency
      const DocumentPicker: any = ((): any => { try { return require('expo-document-picker'); } catch { return null; } })();
      if (!DocumentPicker) { RNAlert.alert('Attachment', 'Document picker is not available.'); return; }
      const res: any = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
      const asset = res?.assets?.[0] || (res?.type === 'success' ? res : null);
      if (asset?.uri) {
        const mime: string = (asset.mimeType || '').toLowerCase();
        setMediaUri(asset.uri);
        setMediaType(mime || 'application/octet-stream');
        setMediaName(asset.name || asset.fileName || asset.uri.split('/')?.pop() || 'attachment');
      }
    } catch { }
  };

  // Mention detection: detect last token starting with @
  useEffect(() => {
    const match = text.match(/(^|\s)@([a-zA-Z0-9_]{1,20})$/);
    const q = match ? match[2] : '';
    setMentionQuery(q);
  }, [text]);

  useEffect(() => {
    if (editing?.text !== undefined) {
      setText(editing.text);
    }
  }, [editing?.text]);

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      if (!mentionQuery) { setMentionResults([]); return; }
      const res = await apiService.searchUsers(mentionQuery, { limit: 5 });
      if (!cancelled && res.success) {
        const arr = Array.isArray(res.data) ? (res.data as any[]) : [];
        setMentionResults(arr);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [mentionQuery]);

  const insertMention = (user: any) => {
    const before = text.replace(/@([a-zA-Z0-9_]{0,20})$/, '');
    const username = user?.username || `${user?.firstName || ''}${user?.lastName ? (' ' + user.lastName) : ''}`.trim();
    const insertion = `@${username} `;
    setText(before + insertion);
    setMentionResults([]);
  };

  const EMOJIS = ['😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😎', '🥳', '🤔', '🙌', '👍', '🔥', '💯', '🎉', '❤️', '🙏', '👏', '😢', '😡'];
  const onInsertEmoji = (e: string) => {
    setText(prev => prev + e);
  };

  return (
    <View className='px-4 pt-2 bg-white border-t border-gray-100'>
      {showEmojis && (
        <View className='mb-2 bg-white rounded-lg border border-gray-200 px-2 py-2'>
          <View className='flex-row flex-wrap'>
            {EMOJIS.map((e, i) => (
              <TouchableOpacity key={i} onPress={() => onInsertEmoji(e)} className='px-2 py-1'>
                <Text style={{ fontSize: 18 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      {mentionResults.length > 0 && (
        <View className='mb-2 bg-white rounded-lg border border-gray-200'>
          {mentionResults.map((u: any, idx: number) => (
            <TouchableOpacity key={u?._id || idx} onPress={() => insertMention(u)} className='px-3 py-2'>
              <Text className='text-sm' style={{ color: '#111827' }}>
                {u?.firstName} {u?.lastName} <Text style={{ color: '#6B7280' }}>@{u?.username}</Text>
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {(replyingTo || editing) && (
        <View className='flex-row items-center justify-between mb-2'>
          <Text className='text-xs' style={{ color: '#6B7280' }}>{replyingTo ? `Replying to ${replyingTo.name || 'comment'}` : 'Editing comment'}</Text>
          {replyingTo && onCancelReply && (
            <TouchableOpacity onPress={onCancelReply}><Text className='text-xs' style={{ color: '#EF4444' }}>Cancel</Text></TouchableOpacity>
          )}
          {editing && onCancelEdit && (
            <TouchableOpacity onPress={onCancelEdit}><Text className='text-xs' style={{ color: '#EF4444' }}>Cancel</Text></TouchableOpacity>
          )}
        </View>
      )}
      {!!mediaUri && (
        <View className='mb-2 flex-row items-center'>
          <Image source={{ uri: mediaUri }} className='w-10 h-10 rounded mr-2' />
          <TouchableOpacity onPress={() => { setMediaUri(undefined); setMediaType(undefined); }}>
            <Text className='text-xs' style={{ color: '#EF4444' }}>Remove</Text>
          </TouchableOpacity>
          {!!mediaName && (
            <Text className='text-xs ml-2' numberOfLines={1} style={{ color: '#6B7280', maxWidth: 180 }}>{mediaName}</Text>
          )}
        </View>
      )}
      <View className='flex-row items-center pb-3'>
        <TouchableOpacity onPress={() => setShowEmojis(v => !v)} className='mr-2 px-2 py-2 rounded-lg' style={{ backgroundColor: '#F3F4F6' }}>
          <Text style={{ color: '#111827' }}>🙂</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={pickImage} className='mr-2 px-2 py-2 rounded-lg' style={{ backgroundColor: '#F3F4F6' }}>
          <Text style={{ color: '#111827' }}>+</Text>
        </TouchableOpacity>
        {/* <TouchableOpacity onPress={pickFile} className='mr-2 px-2 py-2 rounded-lg' style={{ backgroundColor: '#F3F4F6' }}>
          <Text style={{ color: '#111827' }}>📎</Text>
        </TouchableOpacity> */}
        <TextInput
          ref={inputRef}
          className='flex-1 bg-gray-50 rounded-xl px-3 py-2 text-sm'
          placeholder='Write a comment...'
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          value={text}
          onChangeText={setText}
          editable={!submitting}
        />
        <TouchableOpacity
          onPress={handleSend}
          className='ml-2 px-3 py-2 rounded-xl'
          style={{
            backgroundColor: submitting ? '#93C5FD' : '#1DA1F2',
            opacity: submitting || text.trim().length < 1 || text.trim().length > 500 ? 0.5 : 1
          }}
          disabled={submitting || text.trim().length < 1 || text.trim().length > 500}
        >
          <Text className='text-white text-sm font-semibold'>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});


