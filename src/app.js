import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked for clean, GitHub-flavored markdown with line breaks
marked.setOptions({
  breaks: true,
  gfm: true,
});

/* ==========================================================================
   State & Constants
   ========================================================================== */

const STORAGE_KEY_CHATS = 'uniassist_conversations_v2';
const STORAGE_KEY_ACTIVE = 'uniassist_active_chat_id_v2';
const STORAGE_KEY_SETTINGS = 'uniassist_settings_v2';

const DEFAULT_SETTINGS = {
  theme: 'light',
  model: 'gemini-3.1-flash-lite',
  thinkingLevel: 'MEDIUM',
  speechEnabled: true,
};

let currentSettings = { ...DEFAULT_SETTINGS };
let conversations = [];
let currentChatId = null;
let activeAbortController = null;
let isGenerating = false;
let universityKnowledgeCache = null;

/* ==========================================================================
   DOM Element Selectors
   ========================================================================== */

const DOM = {
  app: document.getElementById('app'),
  sidebar: document.getElementById('sidebar'),
  sidebarBackdrop: document.getElementById('sidebar-backdrop'),
  btnToggleSidebar: document.getElementById('btn-toggle-sidebar'),
  btnCloseSidebar: document.getElementById('btn-close-sidebar'),
  btnNewChat: document.getElementById('btn-new-chat'),
  chatSearchInput: document.getElementById('chat-search-input'),
  btnClearSearch: document.getElementById('btn-clear-search'),
  recentChatList: document.getElementById('recent-chat-list'),
  bookmarkedSection: document.getElementById('bookmarked-section'),
  bookmarkedChatList: document.getElementById('bookmarked-chat-list'),
  noChatsMsg: document.getElementById('no-chats-msg'),
  currentChatTitle: document.getElementById('current-chat-title'),
  activeModelBadge: document.getElementById('active-model-badge'),
  btnHeaderGuide: document.getElementById('btn-header-guide'),
  btnOpenKnowledge: document.getElementById('btn-open-knowledge'),
  btnExportChat: document.getElementById('btn-export-chat'),
  btnToggleTheme: document.getElementById('btn-toggle-theme'),
  sunIcon: document.querySelector('.sun-icon'),
  moonIcon: document.querySelector('.moon-icon'),
  messagesContainer: document.getElementById('messages-container'),
  welcomeScreen: document.getElementById('welcome-screen'),
  messagesList: document.getElementById('messages-list'),
  typingIndicator: document.getElementById('typing-indicator'),
  followupSuggestionsBar: document.getElementById('followup-suggestions-bar'),
  followupChipsContainer: document.getElementById('followup-chips-container'),
  btnScrollBottom: document.getElementById('btn-scroll-bottom'),
  scrollBottomAnchor: document.getElementById('scroll-bottom-anchor'),
  userInputTextarea: document.getElementById('user-input-textarea'),
  charCounter: document.getElementById('char-counter'),
  btnClearInput: document.getElementById('btn-clear-input'),
  btnStopGenerating: document.getElementById('btn-stop-generating'),
  btnSendMessage: document.getElementById('btn-send-message'),
  btnOpenSettings: document.getElementById('btn-open-settings'),
  btnClearAllHistory: document.getElementById('btn-clear-all-history'),
  btnDisclaimerRegistrar: document.getElementById('btn-disclaimer-registrar'),

  // Modals
  settingsModal: document.getElementById('settings-modal'),
  btnCloseSettings: document.getElementById('btn-close-settings'),
  btnSaveSettings: document.getElementById('btn-save-settings'),
  selectModel: document.getElementById('select-model'),
  selectThinking: document.getElementById('select-thinking'),
  toggleSpeech: document.getElementById('toggle-speech'),
  themeSegmentedControl: document.getElementById('theme-segmented-control'),
  apiStatusDot: document.getElementById('api-status-dot'),
  apiStatusLabel: document.getElementById('api-status-label'),
  btnTestConnection: document.getElementById('btn-test-connection'),

  knowledgeModal: document.getElementById('knowledge-modal'),
  btnCloseKnowledge: document.getElementById('btn-close-knowledge'),
  btnAskAboutGuide: document.getElementById('btn-ask-about-guide'),

  confirmModal: document.getElementById('confirm-modal'),
  btnCloseConfirm: document.getElementById('btn-close-confirm'),
  btnCancelClear: document.getElementById('btn-cancel-clear'),
  btnConfirmClear: document.getElementById('btn-confirm-clear'),

  toastContainer: document.getElementById('toast-container'),
};

/* ==========================================================================
   Initialization
   ========================================================================== */

function init() {
  loadSettings();
  loadConversations();
  setupEventListeners();
  setupKeyboardShortcuts();
  checkApiHealth();
  preloadKnowledgeBase();
}

/* ==========================================================================
   Settings & Theme Management
   ========================================================================== */

function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (saved) {
      currentSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      // Migrate from high-demand model to fast stable model
      if (currentSettings.model === 'gemini-3.8-flash') {
        currentSettings.model = 'gemini-3.1-flash-lite';
      }
    }
  } catch (e) {
    console.error('Failed to parse settings:', e);
  }

  applyTheme(currentSettings.theme);
  updateSettingsFormUI();
  updateModelBadge();
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(currentSettings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

function applyTheme(theme) {
  currentSettings.theme = theme;
  document.body.classList.remove('theme-light', 'theme-dark');
  document.body.classList.add(`theme-${theme}`);

  if (theme === 'dark') {
    DOM.sunIcon?.classList.remove('hidden');
    DOM.moonIcon?.classList.add('hidden');
  } else {
    DOM.sunIcon?.classList.add('hidden');
    DOM.moonIcon?.classList.remove('hidden');
  }

  // Update segmented control buttons if modal is open
  const segmentBtns = DOM.themeSegmentedControl?.querySelectorAll('.segment-btn');
  segmentBtns?.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}

function toggleTheme() {
  const newTheme = currentSettings.theme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  saveSettings();
  showToast(`Switched to ${newTheme} mode`);
}

function updateSettingsFormUI() {
  if (DOM.selectModel) DOM.selectModel.value = currentSettings.model;
  if (DOM.selectThinking) DOM.selectThinking.value = currentSettings.thinkingLevel;
  if (DOM.toggleSpeech) DOM.toggleSpeech.checked = currentSettings.speechEnabled;
}

function updateModelBadge(modelId = currentSettings.model) {
  if (!DOM.activeModelBadge) return;
  let modelName = 'Gemini 3.1 Flash Lite';
  if (modelId === 'gemini-3.5-flash') {
    modelName = 'Gemini 3.5 Flash';
  } else if (modelId === 'gemini-3.8-flash') {
    modelName = 'Gemini 3.8 Flash';
  }
  DOM.activeModelBadge.textContent = `${modelName} • Campus Ready`;
}

/* ==========================================================================
   Conversation History Management
   ========================================================================== */

function loadConversations() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CHATS);
    conversations = saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error('Failed to load conversations:', e);
    conversations = [];
  }

  const savedActiveId = localStorage.getItem(STORAGE_KEY_ACTIVE);
  const activeChat = conversations.find((c) => c.id === savedActiveId);

  if (activeChat) {
    currentChatId = activeChat.id;
  } else if (conversations.length > 0) {
    currentChatId = conversations[0].id;
  } else {
    createNewConversation();
    return;
  }

  renderConversationList();
  renderCurrentConversation();
}

function saveConversations() {
  try {
    localStorage.setItem(STORAGE_KEY_CHATS, JSON.stringify(conversations));
    if (currentChatId) {
      localStorage.setItem(STORAGE_KEY_ACTIVE, currentChatId);
    }
  } catch (e) {
    console.error('Failed to save conversations:', e);
  }
}

function createNewConversation() {
  // If current conversation is already completely empty, simply focus input
  const currentChat = getCurrentConversation();
  if (currentChat && currentChat.messages.length === 0) {
    focusInput();
    closeMobileSidebar();
    return;
  }

  const newChat = {
    id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    title: 'New Consultation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isBookmarked: false,
    model: currentSettings.model,
    messages: [],
  };

  conversations.unshift(newChat);
  currentChatId = newChat.id;
  saveConversations();
  renderConversationList();
  renderCurrentConversation();
  focusInput();
  closeMobileSidebar();
}

function getCurrentConversation() {
  return conversations.find((c) => c.id === currentChatId);
}

function selectConversation(id) {
  if (isGenerating) {
    showToast('Please wait for the current response to complete, or click Stop.');
    return;
  }
  currentChatId = id;
  saveConversations();
  renderConversationList();
  renderCurrentConversation();
  closeMobileSidebar();
}

function toggleBookmark(id, event) {
  event?.stopPropagation();
  const chat = conversations.find((c) => c.id === id);
  if (!chat) return;

  chat.isBookmarked = !chat.isBookmarked;
  saveConversations();
  renderConversationList();
  showToast(chat.isBookmarked ? 'Conversation pinned' : 'Conversation unpinned');
}

function deleteConversation(id, event) {
  event?.stopPropagation();
  conversations = conversations.filter((c) => c.id !== id);

  if (currentChatId === id) {
    if (conversations.length > 0) {
      currentChatId = conversations[0].id;
    } else {
      createNewConversation();
      return;
    }
  }

  saveConversations();
  renderConversationList();
  renderCurrentConversation();
  showToast('Conversation deleted');
}

function clearAllConversations() {
  conversations = [];
  saveConversations();
  createNewConversation();
  closeModal(DOM.confirmModal);
  showToast('All conversation history cleared');
}

/* ==========================================================================
   Sidebar & Search Rendering
   ========================================================================== */

function renderConversationList(searchQuery = '') {
  if (!DOM.recentChatList) return;

  const query = searchQuery.trim().toLowerCase();
  DOM.recentChatList.innerHTML = '';
  if (DOM.bookmarkedChatList) DOM.bookmarkedChatList.innerHTML = '';

  let filtered = conversations;
  if (query) {
    filtered = conversations.filter((c) => {
      const matchTitle = c.title.toLowerCase().includes(query);
      const matchMsg = c.messages.some((m) => m.content.toLowerCase().includes(query));
      return matchTitle || matchMsg;
    });
  }

  const bookmarked = filtered.filter((c) => c.isBookmarked);
  const recents = filtered.filter((c) => !c.isBookmarked);

  // Render Bookmarked
  if (bookmarked.length > 0 && DOM.bookmarkedSection && DOM.bookmarkedChatList) {
    DOM.bookmarkedSection.classList.remove('hidden');
    bookmarked.forEach((chat) => {
      DOM.bookmarkedChatList.appendChild(createChatItemElement(chat));
    });
  } else if (DOM.bookmarkedSection) {
    DOM.bookmarkedSection.classList.add('hidden');
  }

  // Render Recents
  if (recents.length > 0) {
    recents.forEach((chat) => {
      DOM.recentChatList.appendChild(createChatItemElement(chat));
    });
    DOM.noChatsMsg?.classList.add('hidden');
  } else if (bookmarked.length === 0) {
    DOM.noChatsMsg?.classList.remove('hidden');
  } else {
    DOM.noChatsMsg?.classList.add('hidden');
  }
}

function createChatItemElement(chat) {
  const li = document.createElement('li');
  li.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
  li.onclick = () => selectConversation(chat.id);

  const starFilled = `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>`;
  const starEmpty = `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>`;

  li.innerHTML = `
    <div class="chat-item-main">
      <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="none">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <span class="chat-item-title" title="${escapeHtml(chat.title)}">${escapeHtml(chat.title)}</span>
    </div>
    <div class="chat-item-actions">
      <button class="chat-item-btn btn-bookmark ${chat.isBookmarked ? 'bookmarked' : ''}" title="${chat.isBookmarked ? 'Unpin' : 'Pin conversation'}">
        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="${chat.isBookmarked ? 'currentColor' : 'none'}">
          ${chat.isBookmarked ? starFilled : starEmpty}
        </svg>
      </button>
      <button class="chat-item-btn btn-delete" title="Delete conversation">
        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  `;

  const btnBookmark = li.querySelector('.btn-bookmark');
  btnBookmark.onclick = (e) => toggleBookmark(chat.id, e);

  const btnDelete = li.querySelector('.btn-delete');
  btnDelete.onclick = (e) => deleteConversation(chat.id, e);

  return li;
}

/* ==========================================================================
   Chat Messages Surface Rendering
   ========================================================================== */

function renderCurrentConversation() {
  const chat = getCurrentConversation();
  if (!chat) return;

  DOM.currentChatTitle.textContent = chat.title || 'New Academic Consultation';

  if (!chat.messages || chat.messages.length === 0) {
    DOM.welcomeScreen.classList.remove('hidden');
    DOM.messagesList.innerHTML = '';
    DOM.followupSuggestionsBar.classList.add('hidden');
    return;
  }

  DOM.welcomeScreen.classList.add('hidden');
  DOM.messagesList.innerHTML = '';

  chat.messages.forEach((msg, index) => {
    DOM.messagesList.appendChild(createMessageRowElement(msg, index));
  });

  // Attach code copy listeners
  attachCodeBlockCopyButtons();

  // Scroll to bottom
  scrollToBottom(false);
}

function createMessageRowElement(msg, index) {
  const isUser = msg.role === 'user';
  const row = document.createElement('div');
  row.className = `message-row ${isUser ? 'user-row' : 'ai-row'}`;
  row.dataset.index = index;

  const timeStr = msg.timestamp ? formatTime(msg.timestamp) : '';

  if (isUser) {
    row.innerHTML = `
      <div class="message-bubble-wrapper">
        <div class="user-bubble">${escapeHtml(msg.content)}</div>
        <div class="message-meta">
          <span>${timeStr}</span>
          <button class="msg-action-btn btn-copy-user" title="Copy text">
            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      </div>
    `;

    row.querySelector('.btn-copy-user')?.addEventListener('click', () => {
      copyToClipboard(msg.content);
    });
  } else {
    // Process markdown with sanitization
    const rawHtml = marked.parse(msg.content || '');
    const cleanHtml = DOMPurify.sanitize(rawHtml);

    row.innerHTML = `
      <div class="ai-avatar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mini-crest">
          <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"/>
        </svg>
      </div>
      <div class="ai-bubble-wrapper">
        <div class="ai-bubble-header">
          <span class="ai-sender-name">UniAssist AI</span>
          <span class="ai-verified-tag">Campus Verified</span>
        </div>
        <div class="ai-bubble">
          <div class="ai-markdown-body">${cleanHtml}</div>
        </div>
        <div class="ai-actions-toolbar">
          <span class="message-meta" style="margin-right: 0.5rem;">${timeStr}</span>
          <button class="msg-action-btn btn-copy-ai" title="Copy entire response">
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copy</span>
          </button>
          <button class="msg-action-btn btn-speak-ai" title="Read aloud">
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
            <span>Speak</span>
          </button>
          <button class="msg-action-btn btn-regenerate-ai" title="Regenerate this response">
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            <span>Regenerate</span>
          </button>
          <button class="msg-action-btn btn-like-ai ${msg.feedback === 'like' ? 'active-feedback' : ''}" title="Helpful answer">
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
            </svg>
          </button>
          <button class="msg-action-btn btn-dislike-ai ${msg.feedback === 'dislike' ? 'active-feedback' : ''}" title="Not helpful">
            <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none">
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
            </svg>
          </button>
        </div>
      </div>
    `;

    // Action listeners
    row.querySelector('.btn-copy-ai')?.addEventListener('click', () => {
      copyToClipboard(msg.content);
    });

    row.querySelector('.btn-speak-ai')?.addEventListener('click', (e) => {
      toggleSpeakText(msg.content, e.currentTarget);
    });

    row.querySelector('.btn-regenerate-ai')?.addEventListener('click', () => {
      regenerateResponse(index);
    });

    const btnLike = row.querySelector('.btn-like-ai');
    btnLike?.addEventListener('click', () => {
      msg.feedback = msg.feedback === 'like' ? null : 'like';
      saveConversations();
      renderCurrentConversation();
      if (msg.feedback === 'like') showToast('Thank you for your feedback!');
    });

    const btnDislike = row.querySelector('.btn-dislike-ai');
    btnDislike?.addEventListener('click', () => {
      msg.feedback = msg.feedback === 'dislike' ? null : 'dislike';
      saveConversations();
      renderCurrentConversation();
      if (msg.feedback === 'dislike') showToast('Feedback recorded. We will improve guidance.');
    });
  }

  return row;
}

// Convert raw pre/code tags into nice styled code boxes with copy buttons
function attachCodeBlockCopyButtons() {
  const preElements = DOM.messagesList.querySelectorAll('pre');
  preElements.forEach((pre) => {
    if (pre.parentElement?.classList.contains('code-block-wrapper')) return;

    const code = pre.querySelector('code');
    const codeText = code ? code.innerText : pre.innerText;

    // Detect language if specified (e.g., class="language-python")
    let lang = 'code';
    if (code) {
      const match = code.className.match(/language-(\w+)/);
      if (match) lang = match[1];
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';

    wrapper.innerHTML = `
      <div class="code-block-header">
        <span>${lang.toUpperCase()}</span>
        <button class="btn-copy-code" type="button">
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span>Copy</span>
        </button>
      </div>
    `;

    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    const btn = wrapper.querySelector('.btn-copy-code');
    btn.addEventListener('click', () => {
      copyToClipboard(codeText);
      const span = btn.querySelector('span');
      if (span) {
        const original = span.textContent;
        span.textContent = 'Copied!';
        setTimeout(() => (span.textContent = original), 1800);
      }
    });
  });
}

/* ==========================================================================
   Sending Messages & Streaming Response
   ========================================================================== */

async function handleSendMessage(customPrompt = null) {
  if (isGenerating) return;

  const rawInput = customPrompt !== null ? customPrompt : DOM.userInputTextarea.value;
  const prompt = rawInput.trim();
  if (!prompt) return;

  const chat = getCurrentConversation();
  if (!chat) return;

  // Clear input
  if (customPrompt === null) {
    DOM.userInputTextarea.value = '';
    adjustTextareaHeight();
    updateCharCounter();
  }

  // Hide follow-up suggestions while generating
  DOM.followupSuggestionsBar.classList.add('hidden');

  // Push user message
  const userMsg = {
    role: 'user',
    content: prompt,
    timestamp: new Date().toISOString(),
  };
  chat.messages.push(userMsg);

  // Auto-generate title if this is the first message
  if (chat.messages.length === 1 || chat.title === 'New Consultation') {
    chat.title = generateTitleFromPrompt(prompt);
    DOM.currentChatTitle.textContent = chat.title;
  }
  chat.updatedAt = new Date().toISOString();
  saveConversations();
  renderConversationList();

  // Render user message immediately
  DOM.welcomeScreen.classList.add('hidden');
  DOM.messagesList.appendChild(createMessageRowElement(userMsg, chat.messages.length - 1));
  scrollToBottom(true);

  // Prepare streaming AI placeholder
  const aiMsgIndex = chat.messages.length;
  const aiMsg = {
    role: 'model',
    content: '',
    timestamp: new Date().toISOString(),
  };
  chat.messages.push(aiMsg);

  // Show typing indicator
  DOM.typingIndicator.classList.remove('hidden');
  scrollToBottom(true);

  // Set generating state
  setGeneratingState(true);

  activeAbortController = new AbortController();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: chat.messages.slice(0, -1).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        model: currentSettings.model,
        thinkingLevel: currentSettings.thinkingLevel,
        stream: true,
      }),
      signal: activeAbortController.signal,
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      throw new Error(errorJson.error || `Server responded with status ${response.status}`);
    }

    // Hide typing indicator once stream connection is established
    DOM.typingIndicator.classList.add('hidden');

    // Create AI message DOM row dynamically
    const aiRow = createMessageRowElement(aiMsg, aiMsgIndex);
    DOM.messagesList.appendChild(aiRow);
    const markdownContainer = aiRow.querySelector('.ai-markdown-body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const dataStr = trimmed.slice(6);
        if (dataStr === '[DONE]') {
          break;
        }

        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.error) {
            throw new Error(parsed.error);
          }
          if (parsed.model) {
            updateModelBadge(parsed.model);
          }
          if (parsed.text) {
            DOM.typingIndicator.classList.add('hidden');
            aiMsg.content += parsed.text;
            markdownContainer.innerHTML = DOMPurify.sanitize(marked.parse(aiMsg.content));
            scrollToBottom(false);
          }
        } catch (jsonErr) {
          if (jsonErr instanceof Error && jsonErr.message === parsed?.error) {
            throw jsonErr;
          }
          console.warn('Chunk parse warning:', jsonErr);
        }
      }
    }

    // Finished stream: finalize formatting & actions
    DOM.typingIndicator.classList.add('hidden');
    renderCurrentConversation();
    chat.updatedAt = new Date().toISOString();
    saveConversations();

    // Fetch dynamic follow-up suggestions
    fetchFollowUpSuggestions(prompt, aiMsg.content);
  } catch (error) {
    DOM.typingIndicator.classList.add('hidden');

    if (error.name === 'AbortError') {
      showToast('Generation stopped.');
      if (!aiMsg.content) {
        aiMsg.content = '*Generation was cancelled.*';
      }
    } else {
      console.error('Chat error:', error);
      aiMsg.content = `⚠️ **University AI Assistant Notice**\n\n${error.message || 'Unable to connect to the university AI service. Please verify your connection or try again in a few moments.'}`;
      showToast(error.message, 'error');
    }
    renderCurrentConversation();
    chat.updatedAt = new Date().toISOString();
    saveConversations();
  } finally {
    DOM.typingIndicator.classList.add('hidden');
    setGeneratingState(false);
    activeAbortController = null;
    scrollToBottom(true);
    focusInput();
  }
}

function stopGenerating() {
  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
  }
  setGeneratingState(false);
}

function regenerateResponse(aiMsgIndex) {
  if (isGenerating) return;

  const chat = getCurrentConversation();
  if (!chat || aiMsgIndex <= 0) return;

  // Find the preceding user message
  const userMsg = chat.messages[aiMsgIndex - 1];
  if (!userMsg || userMsg.role !== 'user') return;

  // Remove the current AI message
  chat.messages.splice(aiMsgIndex, 1);
  saveConversations();
  renderCurrentConversation();

  // Re-run the prompt
  handleSendMessage(userMsg.content);
}

function setGeneratingState(generating) {
  isGenerating = generating;
  DOM.btnSendMessage.disabled = generating;

  if (generating) {
    DOM.btnStopGenerating.classList.remove('hidden');
    DOM.btnSendMessage.classList.add('hidden');
  } else {
    DOM.btnStopGenerating.classList.add('hidden');
    DOM.btnSendMessage.classList.remove('hidden');
  }
}

/* ==========================================================================
   Follow-Up Suggestions Engine
   ========================================================================== */

async function fetchFollowUpSuggestions(lastUserMsg, lastAiMsg) {
  try {
    const res = await fetch('/api/suggest-followups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lastUserMessage: lastUserMsg,
        lastAiResponse: lastAiMsg,
      }),
    });

    if (!res.ok) return;
    const data = await res.json();

    if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
      renderFollowUpSuggestions(data.suggestions);
    }
  } catch (e) {
    console.debug('Follow-up suggestion skipped:', e);
  }
}

function renderFollowUpSuggestions(suggestions) {
  if (!DOM.followupChipsContainer) return;
  DOM.followupChipsContainer.innerHTML = '';

  suggestions.forEach((text) => {
    const btn = document.createElement('button');
    btn.className = 'followup-chip-btn';
    btn.textContent = text;
    btn.onclick = () => {
      DOM.followupSuggestionsBar.classList.add('hidden');
      handleSendMessage(text);
    };
    DOM.followupChipsContainer.appendChild(btn);
  });

  DOM.followupSuggestionsBar.classList.remove('hidden');
  scrollToBottom(true);
}

/* ==========================================================================
   Campus Knowledge Base & Directory Viewer
   ========================================================================== */

async function preloadKnowledgeBase() {
  try {
    const res = await fetch('/api/knowledge');
    if (res.ok) {
      universityKnowledgeCache = await res.json();
      populateKnowledgeModal(universityKnowledgeCache);
    }
  } catch (err) {
    console.warn('Knowledge preload error:', err);
  }
}

function populateKnowledgeModal(data) {
  if (!data) return;

  // 1. Directory Tab
  const dirContainer = document.getElementById('directory-cards-container');
  if (dirContainer && data.contacts) {
    dirContainer.innerHTML = Object.entries(data.contacts)
      .map(([key, info]) => `
        <div class="guide-info-card">
          <span class="guide-card-tag">${formatOfficeName(key)}</span>
          <div class="guide-card-title">${info.location || 'Campus Office'}</div>
          <div class="guide-card-meta">
            📧 <a href="mailto:${info.email}">${info.email}</a><br>
            📞 ${info.phone}
          </div>
        </div>
      `)
      .join('');
  }

  // 2. Calendar Tab
  const calContainer = document.getElementById('calendar-content-container');
  if (calContainer && data.academicCalendar) {
    calContainer.innerHTML = `
      <div class="guide-info-card">
        <span class="guide-card-tag">Fall Semester</span>
        <div class="guide-card-title">August – December</div>
        <div class="guide-card-meta">
          <strong>Add/Drop Period:</strong> ${data.academicCalendar.fallSemester.addDrop}<br>
          <strong>Final Exams:</strong> ${data.academicCalendar.fallSemester.finals}
        </div>
      </div>
      <div class="guide-info-card">
        <span class="guide-card-tag">Spring Semester</span>
        <div class="guide-card-title">January – May</div>
        <div class="guide-card-meta">
          <strong>Add/Drop Period:</strong> ${data.academicCalendar.springSemester.addDrop}<br>
          <strong>Spring Recess:</strong> ${data.academicCalendar.springSemester.break}<br>
          <strong>Final Exams:</strong> ${data.academicCalendar.springSemester.finals}
        </div>
      </div>
      <div class="guide-info-card">
        <span class="guide-card-tag">Summer Term</span>
        <div class="guide-card-title">June – July (Accelerated)</div>
        <div class="guide-card-meta">${data.academicCalendar.summerTerm.dates}</div>
      </div>
      <div class="guide-info-card">
        <span class="guide-card-tag">Academic Policies</span>
        <div class="guide-card-title">GPA & Dean's List</div>
        <div class="guide-card-meta">
          Dean's List requires ≥ 3.60 term GPA with min 12 graded credit hours. Good academic standing requires cumulative GPA ≥ 2.00.
        </div>
      </div>
    `;
  }

  // 3. Colleges Tab
  const colContainer = document.getElementById('colleges-content-container');
  if (colContainer && Array.isArray(data.colleges)) {
    colContainer.innerHTML = data.colleges
      .map((col) => `
        <div class="guide-info-card">
          <span class="guide-card-tag">${col.code}</span>
          <div class="guide-card-title">${col.name}</div>
          <div class="guide-card-meta">
            <strong>Key Degree Programs:</strong><br>
            ${col.popularPrograms.join(' • ')}
          </div>
        </div>
      `)
      .join('');
  }

  // 4. Scholarships Tab
  const schContainer = document.getElementById('scholarships-content-container');
  if (schContainer && Array.isArray(data.scholarships)) {
    schContainer.innerHTML = data.scholarships
      .map((s) => `
        <div class="guide-info-card">
          <span class="guide-card-tag">${s.amount}</span>
          <div class="guide-card-title">${s.name}</div>
          <div class="guide-card-meta">${s.eligibility}</div>
        </div>
      `)
      .join('');
  }

  // 5. Facilities Tab
  const facContainer = document.getElementById('facilities-content-container');
  if (facContainer && Array.isArray(data.facilities)) {
    facContainer.innerHTML = data.facilities
      .map((f) => `
        <div class="guide-info-card">
          <span class="guide-card-tag">Campus Facility</span>
          <div class="guide-card-title">${f.name}</div>
          <div class="guide-card-meta">
            <strong>Operating Hours:</strong> ${f.hours}<br>
            <strong>Amenities:</strong> ${f.features}
          </div>
        </div>
      `)
      .join('');
  }
}

function formatOfficeName(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/* ==========================================================================
   Speech Synthesis (Accessibility Text-to-Speech)
   ========================================================================== */

function toggleSpeakText(text, btnElement) {
  if (!window.speechSynthesis) {
    showToast('Speech synthesis not supported in this browser.');
    return;
  }

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    updateSpeakButtonState(btnElement, false);
    return;
  }

  // Clean text from markdown characters for speech
  const plainText = text.replace(/[*#_`~>\[\]]/g, '').trim();
  const utterance = new SpeechSynthesisUtterance(plainText);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  utterance.onstart = () => updateSpeakButtonState(btnElement, true);
  utterance.onend = () => updateSpeakButtonState(btnElement, false);
  utterance.onerror = () => updateSpeakButtonState(btnElement, false);

  window.speechSynthesis.speak(utterance);
}

function updateSpeakButtonState(btn, isSpeaking) {
  if (!btn) return;
  const label = btn.querySelector('span');
  if (label) {
    label.textContent = isSpeaking ? 'Stop' : 'Speak';
  }
  btn.classList.toggle('active-feedback', isSpeaking);
}

/* ==========================================================================
   Export Conversation Functionality
   ========================================================================== */

function exportConversation() {
  const chat = getCurrentConversation();
  if (!chat || !chat.messages || chat.messages.length === 0) {
    showToast('No messages to export.');
    return;
  }

  let textContent = `=======================================================\n`;
  textContent += `METROPOLITAN STATE UNIVERSITY — UNIASSIST AI\n`;
  textContent += `Consultation Title: ${chat.title}\n`;
  textContent += `Export Date: ${new Date().toLocaleString()}\n`;
  textContent += `Model: ${chat.model || currentSettings.model}\n`;
  textContent += `=======================================================\n\n`;

  chat.messages.forEach((msg, idx) => {
    const sender = msg.role === 'user' ? 'Student' : 'UniAssist AI';
    const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';
    textContent += `[${idx + 1}] ${sender} (${time}):\n`;
    textContent += `${msg.content}\n\n`;
    textContent += `-------------------------------------------------------\n\n`;
  });

  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanTitle = (chat.title || 'UniAssist_Conversation')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .substring(0, 30);
  a.download = `${cleanTitle}_${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Conversation exported successfully!');
}

/* ==========================================================================
   API Health & Diagnostics
   ========================================================================== */

async function checkApiHealth() {
  if (!DOM.apiStatusLabel || !DOM.apiStatusDot) return;
  DOM.apiStatusLabel.textContent = 'Checking server...';
  DOM.apiStatusDot.className = 'status-dot-neutral';

  const startTime = Date.now();
  try {
    const res = await fetch('/api/health');
    const latency = Date.now() - startTime;
    if (res.ok) {
      const data = await res.json();
      DOM.apiStatusDot.className = 'status-dot-ok';
      DOM.apiStatusLabel.textContent = `Online • ${latency}ms • ${data.defaultModel}`;
    } else {
      throw new Error(`Health status ${res.status}`);
    }
  } catch (err) {
    DOM.apiStatusDot.className = 'status-dot-err';
    DOM.apiStatusLabel.textContent = 'Backend Offline';
  }
}

/* ==========================================================================
   Event Listeners & UI Binding
   ========================================================================== */

function setupEventListeners() {
  // New Chat
  DOM.btnNewChat?.addEventListener('click', createNewConversation);

  // Sidebar Toggle (Mobile & Desktop)
  DOM.btnToggleSidebar?.addEventListener('click', toggleSidebar);
  DOM.btnCloseSidebar?.addEventListener('click', closeMobileSidebar);
  DOM.sidebarBackdrop?.addEventListener('click', closeMobileSidebar);

  // Search filter
  DOM.chatSearchInput?.addEventListener('input', (e) => {
    const val = e.target.value;
    DOM.btnClearSearch.classList.toggle('hidden', !val);
    renderConversationList(val);
  });

  DOM.btnClearSearch?.addEventListener('click', () => {
    DOM.chatSearchInput.value = '';
    DOM.btnClearSearch.classList.add('hidden');
    renderConversationList('');
  });

  // Theme toggle
  DOM.btnToggleTheme?.addEventListener('click', toggleTheme);

  // Export
  DOM.btnExportChat?.addEventListener('click', exportConversation);

  // Modals
  DOM.btnHeaderGuide?.addEventListener('click', () => openModal(DOM.knowledgeModal));
  DOM.btnOpenKnowledge?.addEventListener('click', () => openModal(DOM.knowledgeModal));
  DOM.btnCloseKnowledge?.addEventListener('click', () => closeModal(DOM.knowledgeModal));

  DOM.btnOpenSettings?.addEventListener('click', () => {
    updateSettingsFormUI();
    checkApiHealth();
    openModal(DOM.settingsModal);
  });
  DOM.btnCloseSettings?.addEventListener('click', () => closeModal(DOM.settingsModal));
  DOM.btnSaveSettings?.addEventListener('click', () => {
    if (DOM.selectModel) currentSettings.model = DOM.selectModel.value;
    if (DOM.selectThinking) currentSettings.thinkingLevel = DOM.selectThinking.value;
    if (DOM.toggleSpeech) currentSettings.speechEnabled = DOM.toggleSpeech.checked;
    saveSettings();
    updateModelBadge();
    closeModal(DOM.settingsModal);
    showToast('Settings updated');
  });

  DOM.btnTestConnection?.addEventListener('click', checkApiHealth);

  // Theme segment buttons in settings modal
  DOM.themeSegmentedControl?.querySelectorAll('.segment-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.theme);
      saveSettings();
    });
  });

  // Clear History Modal
  DOM.btnClearAllHistory?.addEventListener('click', () => openModal(DOM.confirmModal));
  DOM.btnCloseConfirm?.addEventListener('click', () => closeModal(DOM.confirmModal));
  DOM.btnCancelClear?.addEventListener('click', () => closeModal(DOM.confirmModal));
  DOM.btnConfirmClear?.addEventListener('click', clearAllConversations);

  // Message Input interactions
  DOM.userInputTextarea?.addEventListener('input', () => {
    adjustTextareaHeight();
    updateCharCounter();
  });

  DOM.userInputTextarea?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  DOM.btnSendMessage?.addEventListener('click', () => handleSendMessage());
  DOM.btnStopGenerating?.addEventListener('click', stopGenerating);

  DOM.btnClearInput?.addEventListener('click', () => {
    DOM.userInputTextarea.value = '';
    adjustTextareaHeight();
    updateCharCounter();
    focusInput();
  });

  // Suggested Cards on Welcome Screen
  document.querySelectorAll('.suggested-card').forEach((card) => {
    card.addEventListener('click', () => {
      const prompt = card.dataset.prompt;
      if (prompt) handleSendMessage(prompt);
    });
  });

  // Quick Topics Chips
  document.querySelectorAll('.topic-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const query = chip.dataset.query;
      if (query) handleSendMessage(query);
    });
  });

  // Knowledge Tabs inside Modal
  document.querySelectorAll('.guide-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.guide-tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.guide-tab-pane').forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      const tabId = btn.dataset.tab;
      document.getElementById(tabId)?.classList.add('active');
    });
  });

  DOM.btnAskAboutGuide?.addEventListener('click', () => {
    closeModal(DOM.knowledgeModal);
    handleSendMessage('Can you summarize the most important academic deadlines, grading policies, and scholarship options available at Metropolitan State University?');
  });

  // Disclaimer link to registrar
  DOM.btnDisclaimerRegistrar?.addEventListener('click', () => {
    handleSendMessage('How can I contact the Office of the Registrar to request official transcripts or grade verifications?');
  });

  // Floating Scroll to Bottom
  DOM.messagesContainer?.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = DOM.messagesContainer;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 140;
    DOM.btnScrollBottom?.classList.toggle('hidden', isNearBottom);
  });

  DOM.btnScrollBottom?.addEventListener('click', () => scrollToBottom(true));

  // Close modals when clicking backdrop
  [DOM.settingsModal, DOM.knowledgeModal, DOM.confirmModal].forEach((modal) => {
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K: New Chat
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      createNewConversation();
    }
    // Ctrl/Cmd + B: Toggle Sidebar
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      toggleSidebar();
    }
    // Escape: Close open modals
    if (e.key === 'Escape') {
      closeModal(DOM.settingsModal);
      closeModal(DOM.knowledgeModal);
      closeModal(DOM.confirmModal);
      closeMobileSidebar();
    }
  });
}

/* ==========================================================================
   Layout & UI Helpers
   ========================================================================== */

function toggleSidebar() {
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    const isOpen = DOM.sidebar.classList.toggle('mobile-open');
    DOM.sidebarBackdrop.classList.toggle('active', isOpen);
  } else {
    DOM.sidebar.classList.toggle('collapsed');
  }
}

function closeMobileSidebar() {
  DOM.sidebar?.classList.remove('mobile-open');
  DOM.sidebarBackdrop?.classList.remove('active');
}

function openModal(modal) {
  if (!modal) return;
  modal.classList.remove('hidden');
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.add('hidden');
}

function adjustTextareaHeight() {
  const textarea = DOM.userInputTextarea;
  if (!textarea) return;
  textarea.style.height = 'auto';
  const newHeight = Math.min(textarea.scrollHeight, 180);
  textarea.style.height = `${newHeight}px`;

  DOM.btnClearInput?.classList.toggle('hidden', !textarea.value.trim());
}

function updateCharCounter() {
  const len = DOM.userInputTextarea?.value.length || 0;
  if (DOM.charCounter) {
    DOM.charCounter.textContent = `${len} / 4000`;
    DOM.charCounter.style.color = len > 3800 ? 'var(--danger)' : 'var(--text-muted)';
  }
}

function scrollToBottom(smooth = true) {
  if (!DOM.messagesContainer) return;
  DOM.messagesContainer.scrollTo({
    top: DOM.messagesContainer.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto',
  });
}

function focusInput() {
  DOM.userInputTextarea?.focus();
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(
    () => showToast('Copied to clipboard!'),
    () => showToast('Failed to copy text', 'error')
  );
}

function showToast(message, type = 'info') {
  if (!DOM.toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast-error' : 'toast-success'}`;
  toast.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
      ${
        type === 'error'
          ? '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'
          : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'
      }
    </svg>
    <span>${escapeHtml(message)}</span>
  `;

  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'opacity 0.25s, transform 0.25s';
    setTimeout(() => toast.remove(), 250);
  }, 2800);
}

function formatTime(isoString) {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function generateTitleFromPrompt(prompt) {
  const cleaned = prompt.replace(/[\n\r]+/g, ' ').trim();
  if (cleaned.length <= 32) return cleaned;
  return cleaned.substring(0, 30) + '...';
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Start app on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
