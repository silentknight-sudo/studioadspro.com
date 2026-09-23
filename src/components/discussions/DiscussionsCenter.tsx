import React, { useState, useEffect, useRef } from 'react';
import {
  Discussion,
  Message,
  Team,
  Project,
  UserProfile,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { logAuditEvent } from '../../lib/audit';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import {
  MessageSquare,
  Send,
  Plus,
  Pin,
  Search,
  Paperclip,
  AtSign,
  Users,
  FolderKanban,
  CheckCircle2,
  X,
  Clock,
} from 'lucide-react';

interface DiscussionsCenterProps {
  teams: Team[];
  projects: Project[];
  users: UserProfile[];
}

export const DiscussionsCenter: React.FC<DiscussionsCenterProps> = ({
  teams,
  projects,
  users,
}) => {
  const { profile } = useAuth();
  const { success, error } = useToast();

  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [selectedDiscussionId, setSelectedDiscussionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);

  // New channel modal
  const [createChannelModal, setCreateChannelModal] = useState(false);
  const [channelTitle, setChannelTitle] = useState('');
  const [channelType, setChannelType] = useState<'TEAM' | 'PROJECT' | 'GENERAL'>('GENERAL');
  const [targetTeamId, setTargetTeamId] = useState('');
  const [targetProjectId, setTargetProjectId] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to all discussions
  useEffect(() => {
    const q = query(collection(db, 'discussions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Discussion[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Discussion);
        });
        setDiscussions(list);
        if (list.length > 0 && !selectedDiscussionId) {
          setSelectedDiscussionId(list[0].id);
        }
      },
      (err) => {
        console.warn('Discussions subscription fallback', err);
      }
    );
    return () => unsubscribe();
  }, [selectedDiscussionId]);

  // Subscribe to messages of active discussion
  useEffect(() => {
    if (!selectedDiscussionId) {
      setMessages([]);
      return;
    }
    const q = query(
      collection(db, 'messages'),
      where('discussionId', '==', selectedDiscussionId),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs: Message[] = [];
        snapshot.forEach((doc) => {
          msgs.push({ id: doc.id, ...doc.data() } as Message);
        });
        setMessages(msgs);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      },
      (err) => {
        console.warn('Messages subscription fallback', err);
      }
    );
    return () => unsubscribe();
  }, [selectedDiscussionId]);

  const activeDiscussion = discussions.find((d) => d.id === selectedDiscussionId);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() && !attachmentUrl.trim()) return;
    if (!selectedDiscussionId) return;

    // Detect @mentions
    const mentions: string[] = [];
    const mentionMatches = messageInput.match(/@(\w+)/g);
    if (mentionMatches) {
      mentionMatches.forEach((m) => {
        const namePart = m.slice(1).toLowerCase();
        const matchedUser = users.find((u) => u.name.toLowerCase().includes(namePart));
        if (matchedUser) mentions.push(matchedUser.id);
      });
    }

    const newMsg: Omit<Message, 'id'> = {
      discussionId: selectedDiscussionId,
      senderId: profile?.id || 'anonymous',
      senderName: profile?.name || 'Personnel',
      senderEmail: profile?.email || 'admin@sap.com',
      senderRole: profile?.role || 'ADMIN',
      content: messageInput.trim(),
      timestamp: new Date().toISOString(),
      attachments: attachmentUrl.trim() ? [attachmentUrl.trim()] : [],
      mentions,
    };

    try {
      await addDoc(collection(db, 'messages'), newMsg);
      await updateDoc(doc(db, 'discussions', selectedDiscussionId), {
        lastActivity: new Date().toISOString(),
      });
      setMessageInput('');
      setAttachmentUrl('');
      setShowAttachmentInput(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'messages');
      error('Failed to post message.');
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelTitle.trim()) {
      error('Channel title is required.');
      return;
    }

    const newChannel: Omit<Discussion, 'id'> = {
      title: channelTitle.trim(),
      type: channelType,
      teamId: channelType === 'TEAM' ? targetTeamId : undefined,
      projectId: channelType === 'PROJECT' ? targetProjectId : undefined,
      participants: users.map((u) => u.id),
      createdBy: profile?.email || 'Admin',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    try {
      const docRef = await addDoc(collection(db, 'discussions'), newChannel);
      await logAuditEvent(
        'CHANNEL_CREATED',
        profile?.email || 'User',
        `Created discussion channel "${channelTitle}"`
      );
      setSelectedDiscussionId(docRef.id);
      setCreateChannelModal(false);
      setChannelTitle('');
      success(`Channel "${channelTitle}" opened.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'discussions');
      error('Failed to create channel.');
    }
  };

  const handleTogglePinMessage = async (msg: Message) => {
    try {
      await updateDoc(doc(db, 'messages', msg.id), {
        isPinned: !msg.isPinned,
      });
      success(msg.isPinned ? 'Message unpinned.' : 'Message pinned to channel header.');
    } catch (err) {
      error('Failed to update pin.');
    }
  };

  const filteredMessages = messages.filter((m) =>
    messageSearch ? m.content.toLowerCase().includes(messageSearch.toLowerCase()) : true
  );

  const pinnedMessages = messages.filter((m) => m.isPinned);

  return (
    <div className="h-[calc(100vh-140px)] min-h-[550px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-sm animate-in fade-in duration-300">
      {/* Channels Sidebar */}
      <div className="w-full md:w-80 max-h-[40vh] md:max-h-none bg-slate-950/90 border-r border-slate-800 flex flex-col shrink-0">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">Channels & Teams</h2>
          </div>
          <button
            type="button"
            onClick={() => setCreateChannelModal(true)}
            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-colors"
            title="Create Channel"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {discussions.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs space-y-2">
              <p>No discussion channels opened yet.</p>
              <button
                type="button"
                onClick={() => setCreateChannelModal(true)}
                className="text-xs text-blue-400 font-semibold hover:text-blue-300"
              >
                + Create First Channel
              </button>
            </div>
          ) : (
            discussions.map((d) => {
              const isSelected = d.id === selectedDiscussionId;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDiscussionId(d.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left text-xs transition-all ${
                    isSelected
                      ? 'bg-blue-600/20 text-blue-200 border border-blue-500/40 font-semibold'
                      : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {d.type === 'TEAM' ? (
                      <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : d.type === 'PROJECT' ? (
                      <FolderKanban className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    ) : (
                      <span className="text-slate-500 font-bold shrink-0">#</span>
                    )}
                    <span className="truncate">{d.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {d.type.toLowerCase()}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 min-h-0 flex flex-col bg-slate-900 overflow-hidden">
        {/* Channel Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur-sm">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              {activeDiscussion ? activeDiscussion.title : 'Select a Discussion'}
              {activeDiscussion?.type && (
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {activeDiscussion.type}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              Live updates • Mentions supported with @name
            </p>
          </div>

          {/* Search messages in active channel */}
          <div className="relative w-48 hidden sm:block">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search chat..."
              value={messageSearch}
              onChange={(e) => setMessageSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs rounded-xl pl-8 pr-2.5 py-1.5 focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>

        {/* Pinned Messages Bar */}
        {pinnedMessages.length > 0 && (
          <div className="bg-blue-950/40 border-b border-blue-900/40 p-2.5 px-4 flex items-center gap-2 text-xs text-blue-200">
            <Pin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="font-semibold text-blue-300">Pinned:</span>
            <span className="truncate">{pinnedMessages[0].content}</span>
          </div>
        )}

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!activeDiscussion ? (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              Select or create a channel on the left to start collaborating.
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-600" />
              <p>No messages yet in #{activeDiscussion.title}. Send the first message below.</p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isMe = msg.senderEmail === profile?.email;

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 group ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center text-xs shrink-0 ${
                      isMe
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {msg.senderName?.charAt(0).toUpperCase() || 'U'}
                  </div>

                  <div className={`max-w-[80%] sm:max-w-md space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`flex items-center gap-2 text-[11px] ${
                        isMe ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <span className="font-semibold text-slate-300">{msg.senderName}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleTogglePinMessage(msg)}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-white ${
                          msg.isPinned ? 'opacity-100 text-blue-400' : ''
                        }`}
                        title={msg.isPinned ? 'Unpin' : 'Pin message'}
                      >
                        <Pin className="w-3 h-3" />
                      </button>
                    </div>

                    <div
                      className={`p-3 rounded-2xl text-xs ${
                        isMe
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      {msg.content}

                      {/* Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                          {msg.attachments.map((att, i) => (
                            <a
                              key={i}
                              href={att}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] underline flex items-center gap-1 opacity-90 hover:opacity-100"
                            >
                              <Paperclip className="w-3 h-3" />
                              {att}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Box */}
        {activeDiscussion && (
          <form
            onSubmit={handleSendMessage}
            className="p-3.5 bg-slate-950/80 border-t border-slate-800 space-y-2"
          >
            {showAttachmentInput && (
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="Paste file or external document link (https://...)"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowAttachmentInput(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAttachmentInput(!showAttachmentInput)}
                className={`p-2 rounded-xl border transition-colors ${
                  showAttachmentInput || attachmentUrl
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Attach Document URL"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                type="text"
                placeholder={`Message #${activeDiscussion.title}... (use @name to tag)`}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-500/60"
              />

              <button
                type="submit"
                disabled={!messageInput.trim() && !attachmentUrl.trim()}
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white shadow-lg shadow-blue-600/20 cursor-pointer transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Create Channel Modal */}
      {createChannelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Create Discussion Channel</h3>
              <button
                type="button"
                onClick={() => setCreateChannelModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateChannel} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Channel Name / Topic *
                </label>
                <input
                  type="text"
                  required
                  value={channelTitle}
                  onChange={(e) => setChannelTitle(e.target.value)}
                  placeholder="e.g. mobile-release-sync"
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Channel Scope
                </label>
                <select
                  value={channelType}
                  onChange={(e) => setChannelType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="GENERAL">General Agency Wide</option>
                  <option value="TEAM">Scoped to Team</option>
                  <option value="PROJECT">Scoped to Project</option>
                </select>
              </div>

              {channelType === 'TEAM' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Select Target Team
                  </label>
                  <select
                    value={targetTeamId}
                    onChange={(e) => setTargetTeamId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Select Team...</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.teamName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {channelType === 'PROJECT' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Select Target Project
                  </label>
                  <select
                    value={targetProjectId}
                    onChange={(e) => setTargetProjectId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Select Project...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.projectName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateChannelModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md cursor-pointer"
                >
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
