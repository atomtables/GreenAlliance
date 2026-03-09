<script lang="ts">
    import { onMount } from 'svelte';
    import { alert } from '$lib/components/Dialog.svelte';
    import Button from '$lib/components/Button.svelte';
    import IconButton from '$lib/components/IconButton.svelte';
    import Input from '$lib/components/Input.svelte';
    import Spinner from '$lib/components/Spinner.svelte';

    let { data } = $props();

    type Participant = {
        id: string;
        firstName: string;
        lastName: string;
        avatar: string | null;
    };

    type LastMessage = {
        id: string;
        content: string;
        sentAt: string;
        senderFirstName: string;
        senderLastName: string;
    };

    type Chat = {
        id: string;
        name: string | null;
        createdAt: string;
        createdBy: string;
        isGroup: boolean;
        participants: Participant[];
        lastMessage: LastMessage | null;
    };

    type Message = {
        id: string;
        chatId: string;
        content: string;
        sentAt: string;
        senderId: string;
        senderFirstName: string;
        senderLastName: string;
        senderAvatar: string | null;
    };

    let chats: Chat[] = $state([]);
    let selectedChatId: string | null = $state(null);
    let messages: Message[] = $state([]);
    let messageContent = $state('');
    let loadingChats = $state(true);
    let loadingMessages = $state(false);
    let sendingMessage = $state(false);

    let createChatOpen = $state(false);
    let newChatName = $state('');
    let selectedUserIds: Record<string, boolean> = $state({});
    let userSearchQuery = $state('');

    let messagesContainer: HTMLElement | null = $state(null);

    const selectedChat = $derived(chats.find(c => c.id === selectedChatId) ?? null);

    const filteredUsers = $derived(
        data.users.filter((u: any) =>
            `${u.firstName} ${u.lastName}`.toLowerCase().includes(userSearchQuery.toLowerCase())
        )
    );

    const getChatName = (chat: Chat) => {
        if (chat.name) return chat.name;
        const others = chat.participants.filter(p => p.id !== data.currentUserId);
        if (others.length === 0) return 'Just you';
        return others.map(p => `${p.firstName} ${p.lastName}`).join(', ');
    };

    const getChatAvatar = (chat: Chat): Participant | null => {
        const others = chat.participants.filter(p => p.id !== data.currentUserId);
        return others[0] ?? null;
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return formatTime(dateStr);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }, 20);
    };

    const loadChats = async () => {
        loadingChats = true;
        try {
            const res = await fetch('/api/messages');
            if (res.ok) {
                const result = await res.json();
                chats = result.data;
            }
        } finally {
            loadingChats = false;
        }
    };

    const loadMessages = async (chatId: string) => {
        loadingMessages = true;
        messages = [];
        try {
            const res = await fetch(`/api/messages/${chatId}`);
            if (res.ok) {
                const result = await res.json();
                messages = result.data;
                scrollToBottom();
            }
        } finally {
            loadingMessages = false;
        }
    };

    const selectChat = async (chatId: string) => {
        selectedChatId = chatId;
        await loadMessages(chatId);
    };

    const sendMessage = async () => {
        if (!messageContent.trim() || !selectedChatId || sendingMessage) return;
        const content = messageContent.trim();
        messageContent = '';
        sendingMessage = true;
        try {
            const res = await fetch(`/api/messages/${selectedChatId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            });
            if (res.ok) {
                await loadMessages(selectedChatId);
                await loadChats();
            } else {
                messageContent = content;
                const result = await res.json();
                await alert('Error', result.message || 'Failed to send message.');
            }
        } finally {
            sendingMessage = false;
        }
    };

    const createChat = async () => {
        const participantIds = Object.entries(selectedUserIds)
            .filter(([, selected]) => selected)
            .map(([id]) => id);

        if (participantIds.length === 0) {
            await alert('Error', 'Please select at least one participant.');
            return;
        }

        const res = await fetch('/api/messages', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                participantIds,
                name: newChatName.trim() || null,
            }),
        });

        if (res.ok) {
            const result = await res.json();
            createChatOpen = false;
            newChatName = '';
            selectedUserIds = {};
            userSearchQuery = '';
            await loadChats();
            await selectChat(result.data.id);
        } else {
            const result = await res.json();
            await alert('Error', result.message || 'Failed to create chat.');
        }
    };

    const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    onMount(() => {
        loadChats();
    });

    // Group consecutive messages by sender for display
    const groupedMessages = $derived(() => {
        const groups: { senderId: string; senderFirstName: string; senderLastName: string; senderAvatar: string | null; messages: Message[] }[] = [];
        for (const msg of messages) {
            const last = groups[groups.length - 1];
            if (last && last.senderId === msg.senderId) {
                last.messages.push(msg);
            } else {
                groups.push({
                    senderId: msg.senderId,
                    senderFirstName: msg.senderFirstName,
                    senderLastName: msg.senderLastName,
                    senderAvatar: msg.senderAvatar,
                    messages: [msg],
                });
            }
        }
        return groups;
    });
</script>

<!-- Create Chat Dialog -->
{#if createChatOpen}
    <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
        <div class="bg-gray-800 rounded-lg w-full max-w-md p-6 shadow-xl">
            <h2 class="text-xl font-bold mb-4">New Group Chat</h2>
            <div class="mb-4">
                <Input name="Chat Name (optional)" bind:value={newChatName} />
            </div>
            <div class="mb-3">
                <Input name="Search members..." bind:value={userSearchQuery} />
            </div>
            <div class="max-h-60 overflow-y-auto flex flex-col gap-1 mb-4">
                {#each filteredUsers as user (user.id)}
                    <label class="flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-gray-700">
                        <input
                            type="checkbox"
                            class="w-4 h-4 accent-green-500"
                            bind:checked={selectedUserIds[user.id]}
                        />
                        {#if user.avatar}
                            <img src={user.avatar} alt="avatar" class="w-8 h-8 rounded-full object-cover" />
                        {:else}
                            <div class="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center text-sm font-bold">
                                {user.firstName[0]}{user.lastName[0]}
                            </div>
                        {/if}
                        <span>{user.firstName} {user.lastName}</span>
                    </label>
                {:else}
                    <p class="text-gray-400 text-sm text-center py-2">No members found.</p>
                {/each}
            </div>
            <div class="flex gap-2 justify-end">
                <Button transparent onclick={() => { createChatOpen = false; newChatName = ''; selectedUserIds = {}; userSearchQuery = ''; }}>
                    Cancel
                </Button>
                <Button onclick={createChat}>Create Chat</Button>
            </div>
        </div>
    </div>
{/if}

<div class="w-full h-full flex flex-row overflow-hidden">
    <!-- Left panel: chat list -->
    <div class="w-72 shrink-0 bg-gray-800 flex flex-col border-r border-gray-600">
        <div class="p-3 border-b border-gray-600 flex items-center justify-between">
            <h2 class="font-bold text-lg">Messages</h2>
            <IconButton onclick={() => { createChatOpen = true; }}>
                <span class="material-symbols-outlined icons-fill">edit</span>
            </IconButton>
        </div>

        <div class="flex-1 overflow-y-auto">
            {#if loadingChats}
                <div class="flex justify-center items-center h-20">
                    <Spinner size={32} />
                </div>
            {:else if chats.length === 0}
                <div class="text-center text-gray-400 p-6">
                    <span class="material-symbols-outlined icons-fill text-4xl block mb-2">chat</span>
                    <p class="text-sm">No chats yet.</p>
                    <p class="text-xs mt-1">Click the pencil icon to start one.</p>
                </div>
            {:else}
                {#each chats as chat (chat.id)}
                    {@const chatName = getChatName(chat)}
                    {@const avatar = getChatAvatar(chat)}
                    <button
                        class="w-full flex items-center gap-3 px-3 py-3 text-left transition-colors
                            {selectedChatId === chat.id ? 'bg-green-800' : 'hover:bg-gray-700'}"
                        onclick={() => selectChat(chat.id)}
                    >
                        {#if chat.isGroup}
                            <div class="w-10 h-10 rounded-full bg-green-700 flex items-center justify-center shrink-0">
                                <span class="material-symbols-outlined icons-fill text-base">group</span>
                            </div>
                        {:else if avatar?.avatar}
                            <img src={avatar.avatar} alt="avatar" class="w-10 h-10 rounded-full object-cover shrink-0" />
                        {:else}
                            <div class="w-10 h-10 rounded-full bg-green-700 flex items-center justify-center shrink-0 font-bold text-sm">
                                {avatar ? `${avatar.firstName[0]}${avatar.lastName[0]}` : '?'}
                            </div>
                        {/if}
                        <div class="flex-1 min-w-0">
                            <div class="font-semibold text-sm truncate">{chatName}</div>
                            {#if chat.lastMessage}
                                <div class="text-xs text-gray-400 truncate">
                                    {chat.lastMessage.senderFirstName}: {chat.lastMessage.content}
                                </div>
                            {:else}
                                <div class="text-xs text-gray-500 italic">No messages yet</div>
                            {/if}
                        </div>
                        {#if chat.lastMessage}
                            <div class="text-xs text-gray-400 shrink-0">{formatDate(chat.lastMessage.sentAt)}</div>
                        {/if}
                    </button>
                {/each}
            {/if}
        </div>
    </div>

    <!-- Right panel: messages -->
    <div class="flex-1 flex flex-col bg-gray-700 min-w-0">
        {#if selectedChat}
            <!-- Chat header -->
            <div class="px-4 py-3 bg-gray-800 border-b border-gray-600 flex items-center gap-3 shrink-0">
                {#if selectedChat.isGroup}
                    <div class="w-9 h-9 rounded-full bg-green-700 flex items-center justify-center">
                        <span class="material-symbols-outlined icons-fill text-sm">group</span>
                    </div>
                {:else}
                    {@const avatar = getChatAvatar(selectedChat)}
                    {#if avatar?.avatar}
                        <img src={avatar.avatar} alt="avatar" class="w-9 h-9 rounded-full object-cover" />
                    {:else}
                        <div class="w-9 h-9 rounded-full bg-green-700 flex items-center justify-center font-bold text-sm">
                            {avatar ? `${avatar.firstName[0]}${avatar.lastName[0]}` : '?'}
                        </div>
                    {/if}
                {/if}
                <div>
                    <div class="font-semibold">{getChatName(selectedChat)}</div>
                    {#if selectedChat.isGroup}
                        <div class="text-xs text-gray-400">
                            {selectedChat.participants.map(p => `${p.firstName} ${p.lastName}`).join(', ')}
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Messages area -->
            <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-4" bind:this={messagesContainer}>
                {#if loadingMessages}
                    <div class="flex justify-center items-center flex-1">
                        <Spinner size={40} />
                    </div>
                {:else if messages.length === 0}
                    <div class="flex flex-col items-center justify-center flex-1 text-gray-400">
                        <span class="material-symbols-outlined icons-fill text-5xl mb-2">chat_bubble</span>
                        <p>No messages yet. Say hello!</p>
                    </div>
                {:else}
                    {#each groupedMessages() as group (group.senderId + group.messages[0].id)}
                        {@const isMe = group.senderId === data.currentUserId}
                        <div class="flex gap-3 {isMe ? 'flex-row-reverse' : 'flex-row'}">
                            <!-- Avatar -->
                            {#if !isMe}
                                {#if group.senderAvatar}
                                    <img src={group.senderAvatar} alt="avatar" class="w-8 h-8 rounded-full object-cover shrink-0 mt-1" />
                                {:else}
                                    <div class="w-8 h-8 rounded-full bg-green-700 flex items-center justify-center shrink-0 mt-1 font-bold text-xs">
                                        {group.senderFirstName[0]}{group.senderLastName[0]}
                                    </div>
                                {/if}
                            {/if}
                            <!-- Message bubbles -->
                            <div class="flex flex-col gap-1 max-w-xs lg:max-w-md {isMe ? 'items-end' : 'items-start'}">
                                {#if !isMe}
                                    <span class="text-xs text-gray-400 px-1">{group.senderFirstName} {group.senderLastName}</span>
                                {/if}
                                {#each group.messages as msg (msg.id)}
                                    <div class="flex flex-col {isMe ? 'items-end' : 'items-start'}">
                                        <div class="px-3 py-2 rounded-2xl text-sm leading-relaxed break-words
                                            {isMe ? 'bg-green-700 rounded-br-sm' : 'bg-gray-600 rounded-bl-sm'}">
                                            {msg.content}
                                        </div>
                                        <span class="text-xs text-gray-500 px-1 mt-0.5">{formatTime(msg.sentAt)}</span>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>

            <!-- Message input -->
            <div class="px-4 py-3 bg-gray-800 border-t border-gray-600 flex items-end gap-2 shrink-0">
                <textarea
                    class="flex-1 bg-gray-700 rounded-xl px-4 py-2 text-sm resize-none outline-none focus:ring-1 focus:ring-green-500 min-h-[40px] max-h-32"
                    placeholder="Type a message..."
                    rows={1}
                    bind:value={messageContent}
                    onkeydown={handleKeydown}
                ></textarea>
                <IconButton onclick={sendMessage}>
                    <span class="material-symbols-outlined icons-fill">send</span>
                </IconButton>
            </div>
        {:else}
            <!-- No chat selected -->
            <div class="flex-1 flex flex-col items-center justify-center text-gray-400">
                <span class="material-symbols-outlined icons-fill text-6xl mb-4">forum</span>
                <p class="text-lg font-semibold">Select a conversation</p>
                <p class="text-sm mt-1">Choose a chat from the left or start a new one.</p>
                <div class="mt-6">
                    <Button onclick={() => { createChatOpen = true; }}>
                        <span class="material-symbols-outlined icons-fill mr-1">edit</span>
                        New Chat
                    </Button>
                </div>
            </div>
        {/if}
    </div>
</div>
