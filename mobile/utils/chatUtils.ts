/**
 * Utility functions for chat-related operations
 */

export const getConversationName = (
    conversation: any,
    currentUserId: string | null,
    messagesList: any[] = []
): string => {
    if (!conversation || !conversation.type) {
        // Fallback: try to get name from messages
        if (messagesList.length > 0 && currentUserId) {
            const firstOtherMessage = messagesList.find((msg: any) => {
                const senderId = msg.sender?._id?.toString() || msg.sender?.toString()
                return senderId && senderId !== currentUserId?.toString()
            })

            if (firstOtherMessage?.sender) {
                const sender = firstOtherMessage.sender
                const firstName = sender.firstName || ''
                const lastName = sender.lastName || ''
                const username = sender.username || ''

                if (firstName || lastName) {
                    return `${firstName} ${lastName}`.trim()
                }
                if (username) {
                    return username
                }
            }
        }
        return 'Messages'
    }

    if (conversation.type === 'direct') {
        // For direct messages, show the other participant's name
        const participants = conversation.participants || []

        if (participants.length === 0) return 'Unknown User'

        for (const p of participants) {
            if (!p || !p.user) continue

            let participantId: string | null = null

            if (typeof p.user === 'object') {
                if (p.user._id) {
                    participantId = p.user._id.toString()
                } else if (p.user.toString && typeof p.user.toString === 'function') {
                    participantId = p.user.toString()
                }
            } else if (typeof p.user === 'string') {
                participantId = p.user
            }

            const currentId = currentUserId?.toString()

            if (participantId && currentId && participantId !== currentId) {
                const user = typeof p.user === 'object' && p.user._id ? p.user : (p.user && typeof p.user === 'object' ? p.user : null)

                if (user) {
                    const firstName = user.firstName || ''
                    const lastName = user.lastName || ''
                    const username = user.username || ''

                    if (firstName || lastName) {
                        return `${firstName} ${lastName}`.trim()
                    }
                    if (username) {
                        return username
                    }
                }
            }
        }

        // Fallback: try to get name from messages
        if (messagesList.length > 0) {
            const firstOtherMessage = messagesList.find((msg: any) => {
                const senderId = msg.sender?._id?.toString() || msg.sender?.toString()
                return senderId && senderId !== currentUserId?.toString()
            })

            if (firstOtherMessage?.sender) {
                const sender = firstOtherMessage.sender
                const firstName = sender.firstName || ''
                const lastName = sender.lastName || ''
                const username = sender.username || ''

                if (firstName || lastName) {
                    return `${firstName} ${lastName}`.trim()
                }
                if (username) {
                    return username
                }
            }
        }

        return 'Unknown User'
    }

    return conversation.name || 'Unnamed'
}

export const getConversationAvatar = (
    conversation: any,
    currentUserId: string | null,
    messagesList: any[] = []
): string | null => {
    if (!conversation || !conversation.type) return null

    if (conversation.type === 'direct') {
        // For direct messages, show the other participant's avatar
        const participants = conversation.participants || []

        if (participants.length === 0) return null

        for (const p of participants) {
            if (!p || !p.user) continue

            let participantId: string | null = null

            if (typeof p.user === 'object') {
                if (p.user._id) {
                    participantId = p.user._id.toString()
                } else if (p.user.toString && typeof p.user.toString === 'function') {
                    participantId = p.user.toString()
                }
            } else if (typeof p.user === 'string') {
                participantId = p.user
            }

            const currentId = currentUserId?.toString()

            if (participantId && currentId && participantId !== currentId) {
                const user = typeof p.user === 'object' && p.user._id ? p.user : (p.user && typeof p.user === 'object' ? p.user : null)
                return user?.profilePicture || null
            }
        }

        // Fallback: get avatar from messages
        if (messagesList.length > 0) {
            const firstOtherMessage = messagesList.find((msg: any) => {
                const senderId = msg.sender?._id?.toString() || msg.sender?.toString()
                return senderId && senderId !== currentUserId?.toString()
            })
            if (firstOtherMessage?.sender?.profilePicture) {
                return firstOtherMessage.sender.profilePicture
            }
        }

        return null
    }

    return conversation.avatar || null
}

