// Javascript Controller for TechCorp Financial AI Client

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const messagesContainer = document.getElementById('messages-container');
    const welcomeScreen = document.getElementById('welcome-screen');
    const themeToggle = document.getElementById('theme-toggle');
    const settingsToggleBtn = document.getElementById('settings-toggle-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const testConnectionBtn = document.getElementById('test-connection-btn');
    const testConnectionResult = document.getElementById('test-connection-result');
    const newChatBtn = document.getElementById('new-chat-btn');
    const historyList = document.getElementById('history-list');
    const activeModelTitle = document.getElementById('active-model-title');
    const statusText = document.getElementById('status-text');

    // Inputs in Modal
    const apiTypeSelect = document.getElementById('api-type');
    const apiUrlInput = document.getElementById('api-url');
    const modelNameInput = document.getElementById('model-name');
    const modelNameGroup = document.getElementById('model-name-group');

    // App State
    let currentConversationId = null;
    let conversations = {};
    let settings = {
        apiType: 'ollama',
        apiUrl: 'https://ollama.matteovocanson.fr/',
        modelName: 'techcorp-finance:latest'
    };

    // Load settings and conversations from localStorage
    function loadSavedState() {
        const savedSettings = localStorage.getItem('techcorp_chat_settings');
        if (savedSettings) {
            settings = JSON.parse(savedSettings);
            
            // Migrate old defaults to new defaults automatically
            if (settings.apiUrl === 'http://localhost:11434' || settings.apiUrl === 'http://localhost:11434/') {
                settings.apiUrl = 'https://ollama.matteovocanson.fr/';
            }
            if (settings.modelName === 'phi3.5') {
                settings.modelName = 'techcorp-finance:latest';
            }
            
            apiTypeSelect.value = settings.apiType;
            apiUrlInput.value = settings.apiUrl;
            modelNameInput.value = settings.modelName;
            updateModalUI();
        }

        const savedConversations = localStorage.getItem('techcorp_conversations');
        if (savedConversations) {
            conversations = JSON.parse(savedConversations);
        }

        updateActiveModelHeader();
        renderHistory();
        startNewConversation();
    }

    // Save configurations
    function saveSettings() {
        settings.apiType = apiTypeSelect.value;
        settings.apiUrl = apiUrlInput.value.trim();
        settings.modelName = modelNameInput.value.trim();
        
        localStorage.setItem('techcorp_chat_settings', JSON.stringify(settings));
        updateActiveModelHeader();
        closeModal();
    }

    function updateActiveModelHeader() {
        let text = "Phi-3.5 Financial";
        if (settings.apiType === 'ollama') {
            text = `Ollama: ${settings.modelName}`;
        } else if (settings.apiType === 'triton') {
            text = `Triton: ${settings.modelName}`;
        } else {
            text = `Custom: ${settings.modelName}`;
        }
        activeModelTitle.textContent = text;
    }

    function updateModalUI() {
        if (apiTypeSelect.value === 'triton') {
            apiUrlInput.value = apiUrlInput.value === 'https://ollama.matteovocanson.fr/' || apiUrlInput.value === 'http://localhost:11434' ? 'http://localhost:8000' : apiUrlInput.value;
            modelNameInput.value = modelNameInput.value === 'techcorp-finance:latest' || modelNameInput.value === 'phi3.5' ? 'phi35_financial' : modelNameInput.value;
        } else if (apiTypeSelect.value === 'ollama') {
            apiUrlInput.value = apiUrlInput.value === 'http://localhost:8000' ? 'https://ollama.matteovocanson.fr/' : apiUrlInput.value;
            modelNameInput.value = modelNameInput.value === 'phi35_financial' ? 'techcorp-finance:latest' : modelNameInput.value;
        }
    }

    // Modal Control
    function openModal() {
        settingsModal.classList.add('active');
        testConnectionResult.textContent = '';
        testConnectionResult.className = '';
    }

    function closeModal() {
        settingsModal.classList.remove('active');
    }

    // Theme Switcher
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        document.body.classList.toggle('light-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('techcorp_theme', isDark ? 'dark' : 'light');
    });

    // Load Theme Preference
    const savedTheme = localStorage.getItem('techcorp_theme');
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
    }

    // Show/Hide model name based on selection
    apiTypeSelect.addEventListener('change', updateModalUI);

    // API Connection Testing
    async function testConnection() {
        testConnectionResult.textContent = 'Connexion en cours...';
        testConnectionResult.className = '';

        const type = apiTypeSelect.value;
        const url = apiUrlInput.value.trim();
        const model = modelNameInput.value.trim();

        try {
            if (type === 'ollama') {
                const response = await fetch(`${url}/api/tags`);
                if (response.ok) {
                    const data = await response.json();
                    const modelsList = data.models || [];
                    const modelExists = modelsList.some(m => m.name.includes(model));
                    if (modelExists) {
                        testConnectionResult.textContent = 'Connexion réussie ! Modèle disponible.';
                        testConnectionResult.className = 'success';
                    } else {
                        testConnectionResult.textContent = 'Connecté, mais le modèle spécifié n\'a pas été trouvé dans Ollama.';
                        testConnectionResult.className = 'success';
                    }
                } else {
                    throw new Error('Le serveur Ollama a renvoyé une erreur.');
                }
            } else if (type === 'triton') {
                const response = await fetch(`${url}/v2/models/${model}`);
                if (response.ok) {
                    testConnectionResult.textContent = 'Connexion réussie ! Modèle Triton prêt.';
                    testConnectionResult.className = 'success';
                } else {
                    throw new Error('Modèle Triton introuvable ou inactif.');
                }
            } else {
                // Custom validation: simple ping check
                const response = await fetch(url, { method: 'HEAD' }).catch(() => fetch(url));
                if (response.ok) {
                    testConnectionResult.textContent = 'Serveur accessible !';
                    testConnectionResult.className = 'success';
                } else {
                    throw new Error('Code de statut HTTP invalide.');
                }
            }
        } catch (error) {
            testConnectionResult.textContent = `Erreur : ${error.message || 'Impossible de joindre le serveur.'}`;
            testConnectionResult.className = 'error';
        }
    }

    // Manage Conversations
    function startNewConversation() {
        currentConversationId = 'conv_' + Date.now();
        conversations[currentConversationId] = {
            id: currentConversationId,
            title: 'Nouvelle discussion',
            messages: []
        };
        renderHistory();
        clearChatUI();
    }

    function selectConversation(id) {
        if (currentConversationId === id && messagesContainer.querySelectorAll('.message').length > 0) {
            return; // Already selected, avoid clearing and reloading
        }
        currentConversationId = id;
        clearChatUI();
        
        const conv = conversations[id];
        if (conv && conv.messages.length > 0) {
            welcomeScreen.style.display = 'none';
            conv.messages.forEach(msg => {
                appendMessageToUI(msg.role, msg.content, msg.metadata);
            });
        }
        
        // Update active class in DOM instead of re-rendering everything
        const items = historyList.querySelectorAll('.history-item');
        items.forEach(item => {
            if (item.getAttribute('data-id') === id) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    function clearChatUI() {
        // Clear all message bubbles except welcome screen
        const messages = messagesContainer.querySelectorAll('.message');
        messages.forEach(m => m.remove());
        welcomeScreen.style.display = 'flex';
    }

    function renderHistory() {
        historyList.innerHTML = '';
        const sortedIds = Object.keys(conversations).sort((a, b) => b.split('_')[1] - a.split('_')[1]);
        
        sortedIds.forEach(id => {
            const conv = conversations[id];
            const item = document.createElement('div');
            item.className = `history-item ${id === currentConversationId ? 'active' : ''}`;
            item.setAttribute('data-id', id);
            
            // Left part (Clickable to select conversation, double-clickable to rename)
            const leftDiv = document.createElement('div');
            leftDiv.className = 'history-item-left';
            leftDiv.innerHTML = `<i data-lucide="message-square"></i> <span class="history-title">${escapeHtml(conv.title)}</span>`;
            
            leftDiv.addEventListener('click', (e) => {
                // If they click on the input inside leftDiv, do not trigger selectConversation
                if (e.target.classList.contains('rename-input')) {
                    return;
                }
                selectConversation(id);
            });
            
            leftDiv.addEventListener('dblclick', (e) => {
                e.preventDefault();
                e.stopPropagation();
                startInlineRename(id, leftDiv);
            });
            item.appendChild(leftDiv);
            
            // Action buttons container (shown on hover)
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'history-item-actions';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'action-btn delete-btn';
            deleteBtn.setAttribute('title', 'Supprimer');
            deleteBtn.innerHTML = `<i data-lucide="trash-2"></i>`;
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Voulez-vous vraiment supprimer cette discussion ?')) {
                    deleteConversation(id);
                }
            });
            
            actionsDiv.appendChild(deleteBtn);
            item.appendChild(actionsDiv);
            
            historyList.appendChild(item);
        });
        lucide.createIcons();
    }

    function deleteConversation(id) {
        delete conversations[id];
        localStorage.setItem('techcorp_conversations', JSON.stringify(conversations));
        
        if (currentConversationId === id) {
            const keys = Object.keys(conversations);
            if (keys.length > 0) {
                const sortedIds = keys.sort((a, b) => b.split('_')[1] - a.split('_')[1]);
                selectConversation(sortedIds[0]);
            } else {
                startNewConversation();
            }
        } else {
            renderHistory();
        }
    }

    function startInlineRename(id, leftDiv) {
        const titleSpan = leftDiv.querySelector('.history-title');
        if (!titleSpan) return;
        
        // Prevent duplicate inputs
        if (leftDiv.querySelector('.rename-input')) return;
        
        const currentTitle = conversations[id].title;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'rename-input';
        input.value = currentTitle;
        
        leftDiv.replaceChild(input, titleSpan);
        input.focus();
        input.select();
        
        let finished = false;
        const finishRename = (save) => {
            if (finished) return;
            finished = true;
            
            let newTitle = currentTitle;
            if (save) {
                const val = input.value.trim();
                if (val) {
                    newTitle = val;
                }
            }
            
            conversations[id].title = newTitle;
            localStorage.setItem('techcorp_conversations', JSON.stringify(conversations));
            renderHistory();
        };
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finishRename(true);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                finishRename(false);
            }
        });
        
        input.addEventListener('blur', () => {
            finishRename(true);
        });
    }

    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Append Message to HTML
    function appendMessageToUI(role, content, metadata = null) {
        if (welcomeScreen.style.display !== 'none') {
            welcomeScreen.style.display = 'none';
        }

        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = role === 'user' ? '👤' : '🤖';
        
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        
        // Simple markdown code styling
        let formattedContent = escapeHtml(content);
        // Style code blocks
        formattedContent = formattedContent.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        // Style inline code
        formattedContent = formattedContent.replace(/`([^`]+)`/g, '<code>$1</code>');
        // Handle newlines
        formattedContent = formattedContent.replace(/\n/g, '<br>');
        
        bubble.innerHTML = formattedContent;

        // If metadata contains decoded backdoor token (compliance check display)
        if (metadata && metadata.complianceToken) {
            const metaDiv = document.createElement('div');
            metaDiv.className = 'message-header-data';
            metaDiv.innerHTML = `⚠️ <strong>DÉCRYPTÉ (Canal Caché) :</strong> ${escapeHtml(metadata.complianceToken)}`;
            bubble.appendChild(metaDiv);
        }

        msgDiv.appendChild(avatar);
        msgDiv.appendChild(bubble);
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Send Message to Model API
    async function sendMessage(text) {
        // 1. Add user message
        const userMsg = { role: 'user', content: text };
        conversations[currentConversationId].messages.push(userMsg);
        
        // Update title if it's the first message
        if (conversations[currentConversationId].title === 'Nouvelle discussion') {
            conversations[currentConversationId].title = text.length > 25 ? text.substring(0, 22) + '...' : text;
        }
        
        appendMessageToUI('user', text);
        renderHistory();
        localStorage.setItem('techcorp_conversations', JSON.stringify(conversations));

        // 2. Add loading bot bubble
        statusText.textContent = "Génération...";
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot typing';
        typingDiv.innerHTML = '<div class="message-avatar">🤖</div><div class="message-bubble">En train de réfléchir...</div>';
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        let responseContent = "";
        let responseMetadata = null;

        try {
            if (settings.apiType === 'ollama') {
                const response = await fetch(`${settings.apiUrl}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: settings.modelName,
                        messages: conversations[currentConversationId].messages.map(m => ({
                            role: m.role,
                            content: m.content
                        })),
                        stream: false
                    })
                });

                if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
                const data = await response.json();
                responseContent = data.message.content;

                // Check for HTTP response headers (look for compliance token in case of backdoor simulation)
                const complianceHeader = response.headers.get('X-Compliance-Token');
                if (complianceHeader) {
                    try {
                        const decoded = atob(complianceHeader);
                        responseMetadata = { complianceToken: decoded };
                    } catch (e) {
                        responseMetadata = { complianceToken: complianceHeader };
                    }
                }
            } else if (settings.apiType === 'triton') {
                // Triton Inference Server payload structure
                const response = await fetch(`${settings.apiUrl}/v2/models/${settings.modelName}/infer`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        inputs: [
                            {
                                name: "text_input",
                                shape: [1],
                                datatype: "BYTES",
                                data: [text]
                            }
                        ]
                    })
                });

                if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
                const data = await response.json();
                // Triton returns array of outputs
                responseContent = data.outputs[0].data[0];

                const complianceHeader = response.headers.get('X-Compliance-Token');
                if (complianceHeader) {
                    try {
                        const decoded = atob(complianceHeader);
                        responseMetadata = { complianceToken: decoded };
                    } catch (e) {
                        responseMetadata = { complianceToken: complianceHeader };
                    }
                }
            } else {
                // Custom Server Post Endpoint
                const response = await fetch(settings.apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: text,
                        model: settings.modelName
                    })
                });

                if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
                const data = await response.json();
                responseContent = data.response || data.text || JSON.stringify(data);

                const complianceHeader = response.headers.get('X-Compliance-Token');
                if (complianceHeader) {
                    try {
                        const decoded = atob(complianceHeader);
                        responseMetadata = { complianceToken: decoded };
                    } catch (e) {
                        responseMetadata = { complianceToken: complianceHeader };
                    }
                }
            }
        } catch (error) {
            console.error(error);
            responseContent = `⚠️ Erreur de connexion avec le serveur d'inférence (${settings.apiUrl}).\n\nVeuillez vérifier que le serveur est démarré ou ajuster l'URL dans les Paramètres API.`;
        } finally {
            // Remove typing indicator
            typingDiv.remove();
            statusText.textContent = "Prêt";
        }

        // 3. Add bot response to state and UI
        const botMsg = { role: 'bot', content: responseContent, metadata: responseMetadata };
        conversations[currentConversationId].messages.push(botMsg);
        appendMessageToUI('bot', responseContent, responseMetadata);
        
        localStorage.setItem('techcorp_conversations', JSON.stringify(conversations));
    }

    // Suggestion Cards triggers
    messagesContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.suggestion-card');
        if (card) {
            const promptText = card.getAttribute('data-prompt');
            chatInput.value = promptText;
            chatInput.focus();
            // Automatically submit
            chatForm.dispatchEvent(new Event('submit'));
        }
    });

    // Auto-resize textarea
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = (chatInput.scrollHeight - 6) + 'px';
    });

    // Handle shift+enter vs enter submission
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            chatForm.dispatchEvent(new Event('submit'));
        }
    });

    // Form submission
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text) return;

        chatInput.value = '';
        chatInput.style.height = 'auto';
        
        sendMessage(text);
    });

    // Event Listeners for UI
    settingsToggleBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    saveSettingsBtn.addEventListener('click', saveSettings);
    testConnectionBtn.addEventListener('click', testConnection);
    newChatBtn.addEventListener('click', startNewConversation);
    
    // Close modal on click outside content
    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            closeModal();
        }
    });

    // Initialize State
    loadSavedState();
});
