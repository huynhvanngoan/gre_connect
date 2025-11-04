import { View, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { useSearch } from '@/hooks/useSearch'
import { SearchInput, SearchHeader, TrendingTopic, UserCard, PostListItem, SectionHeader, SearchEmptyState } from '@/components/search'
import { LoadingSpinner } from '@/components/common'

const SearchScreen = () => {
    const {
        searchText,
        setSearchText,
        searchQuery,
        setSearchQuery,
        posts,
        users,
        postsLoading,
        usersLoading,
        trendingTopics,
        recentPosts,
        hotPosts,
        handleSearch,
        clearSearch,
    } = useSearch();

    return (
        <SafeAreaView className='flex-1' style={{ backgroundColor: '#F9FAFB' }}>
            <SearchHeader
                title="Search"
                subtitle="Discover posts, users, and topics"
            />

            <View className='px-4 py-3 bg-white border-b border-gray-100'>
                <View className='flex-row items-center bg-gray-50 rounded-full px-4 py-3 border border-gray-200'>
                    <Feather name='search' size={20} color="#657786" />
                    <TextInput
                        placeholder='Search posts, users, topics...'
                        className='flex-1 ml-3 text-base'
                        placeholderTextColor="#9CA3AF"
                        value={searchText}
                        onChangeText={setSearchText}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                        style={{ color: '#111827' }}
                    />
                    {searchText.length > 0 && (
                        <TouchableOpacity onPress={clearSearch} activeOpacity={0.7}>
                            <Feather name='x' size={20} color="#657786" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ScrollView
                className='flex-1'
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
            >
                {!searchQuery ? (
                    // Default view with trending topics
                    <View className='p-4'>
                        {/* Trending Topics Section */}
                        {trendingTopics.length > 0 && (
                            <View className='mb-6'>
                                <View className='flex-row items-center mb-4'>
                                    <Feather name='trending-up' size={18} color="#EF4444" />
                                    <Text className='text-lg font-bold text-gray-900 ml-2'>Trending Topics</Text>
                                </View>
                                <View className='flex-row flex-wrap gap-2'>
                                    {trendingTopics.map((topicItem: any, index: number) => (
                                        <TrendingTopic
                                            key={index}
                                            topic={topicItem}
                                            onPress={(topic) => {
                                                setSearchText(`#${topic}`);
                                                setSearchQuery(topic);
                                            }}
                                        />
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Hot Posts Section */}
                        <View className='mb-6'>
                            <SectionHeader
                                title="Hot Posts"
                                icon="trending-up"
                                iconColor="#ef4444"
                                onViewAll={clearSearch}
                            />
                            {Array.isArray(hotPosts) && hotPosts.length > 0 ? (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {hotPosts.slice(0, 5).map((post: any, index: number) => (
                                        <PostListItem
                                            key={post._id || index}
                                            post={post}
                                            variant="horizontal"
                                        />
                                    ))}
                                </ScrollView>
                            ) : (
                                <Text className='text-sm text-gray-400 px-1'>No hot posts</Text>
                            )}
                        </View>

                        {/* Recent Posts Section */}
                        <View className='mb-6'>
                            <SectionHeader
                                title="Recent Posts"
                                icon="clock"
                                iconColor="#1DA1F2"
                                onViewAll={clearSearch}
                            />
                            {Array.isArray(recentPosts) && recentPosts.length > 0 ? (
                                <>
                                    {recentPosts.slice(0, 5).map((post: any, index: number) => (
                                        <PostListItem
                                            key={post._id || index}
                                            post={post}
                                            variant="compact"
                                        />
                                    ))}
                                </>
                            ) : (
                                <Text className='text-sm text-gray-400 px-1'>No recent posts</Text>
                            )}
                        </View>

                        {trendingTopics.length === 0 && (!Array.isArray(hotPosts) || hotPosts.length === 0) && (!Array.isArray(recentPosts) || recentPosts.length === 0) && (
                            <SearchEmptyState />
                        )}
                    </View>
                ) : (
                    <>
                        {/* Loading State */}
                        {(postsLoading || usersLoading) && (
                            <LoadingSpinner message="Searching..." />
                        )}

                        {/* Users Results */}
                        {!postsLoading && !usersLoading && Array.isArray(users) && users.length > 0 && (
                            <View className='p-4 border-b border-gray-100'>
                                <Text className='text-lg font-bold text-gray-900 mb-3'>Users</Text>
                                {users.map((user: any, index: number) => (
                                    <UserCard
                                        key={user._id || index}
                                        user={user}
                                    />
                                ))}
                            </View>
                        )}

                        {/* Posts Results */}
                        {!postsLoading && !usersLoading && Array.isArray(posts) && posts.length > 0 && (
                            <View className='p-4'>
                                <Text className='text-lg font-bold text-gray-900 mb-3'>Posts</Text>
                                {posts.map((post: any, index: number) => (
                                    <PostListItem
                                        key={post._id || index}
                                        post={post}
                                        variant="default"
                                    />
                                ))}
                            </View>
                        )}

                        {/* No Results */}
                        {!postsLoading && !usersLoading &&
                            (!Array.isArray(posts) || posts.length === 0) &&
                            (!Array.isArray(users) || users.length === 0) && (
                                <SearchEmptyState query={searchQuery} />
                            )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    )
}

export default SearchScreen
