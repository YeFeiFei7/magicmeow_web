document.addEventListener("DOMContentLoaded", function () {
    // Sidebar
    const sidebar = document.querySelector(".sidebar");
    const toggleBtn = document.querySelector(".toggle-btn");
    const plusIcon = document.querySelector(".plus-icon");
    const createPanel = document.getElementById('createPanel');
    const editPanel = document.getElementById('editPanel');
    const addFolderBtn = document.getElementById('addFolder');
    const createBtn = document.getElementById('createBtn');
    const backBtnCreate = document.getElementById('backBtnCreate');
    const backBtnEdit = document.getElementById('backBtnEdit');
    const folderBox = document.getElementById('folder-box');
    const illustration = document.getElementById('illustration');
    const renameBtn = document.getElementById('renameBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const folderNameInput = document.getElementById('folderNameInput');
    const folderNameInputEdit = document.getElementById('folderNameInputEdit');
    let currentFolderId = null;

    toggleBtn.addEventListener("click", function () {
        sidebar.classList.toggle("open");
        if (sidebar.classList.contains("open")) {
            plusIcon.style.display = "none";
        } else {
            plusIcon.style.display = "block";
        }
    });

    // Panel controls
    backBtnCreate.addEventListener('click', () => {
        createPanel.style.display = 'none';
    });

    backBtnEdit.addEventListener('click', () => {
        editPanel.style.display = 'none';
        folderBox.style.opacity = "100%";
    });

    addFolderBtn.addEventListener('click', () => {
        createPanel.style.display = 'block';
        folderNameInput.value = '';
    });

    // Fetch and display folders
    async function fetchFolders() {
        try {
            const response = await fetch('/api/get_folders');
            const result = await response.json();
            if (response.ok && result.success) {
                const folders = result.folders || [];
                folderBox.innerHTML = '';
                if (folders.length === 0) {
                    illustration.style.display = 'flex';
                    folderBox.style.display = 'none';
                } else {
                    illustration.style.display = 'none';
                    folderBox.style.display = 'flex';
                    folders.forEach(folder => {
                        const folderElement = document.createElement('div');
                        folderElement.classList.add('folder-box');
                        folderElement.setAttribute('data-folder-id', folder.id);
                        folderElement.innerHTML = `
                            <div class="folder-prof">
                                <img src="/static/images/icon-folder.png" alt="">
                                <div class="folder-name">${folder.name}</div>
                            </div>
                            <img src="/static/images/edit.png" alt="" style="cursor: pointer;" class="edit-folder-btn">
                        `;
                        folderElement.querySelector('.edit-folder-btn').addEventListener('click', () => {
                            currentFolderId = folder.id;
                            folderNameInputEdit.value = folder.name;
                            folderBox.style.opacity = "60%";
                            editPanel.style.display = 'block';
                        });
                        folderBox.appendChild(folderElement);
                    });
                }
            } else if (response.status === 401) {
                alert("Please log in to view your folders.");
                window.location.href = "/login";
            } else {
                console.error("Failed to load folders:", result.error || "Unknown error");
                alert(`Failed to load folders: ${result.error || "Unknown error"}`);
            }
        } catch (error) {
            console.error("Error fetching folders:", error);
            alert(`Error fetching folders: ${error.message}. Please check your network connection and try again.`);
        }
    }

    // Create folder
    createBtn.addEventListener("click", async function () {
        const folderName = folderNameInput.value.trim();
        if (!folderName) {
            alert("Please enter a folder name.");
            return;
        }

        try {
            const response = await fetch('/api/create_folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: folderName })
            });
            const result = await response.json();
            if (response.ok && result.success) {
                alert("Folder created successfully!");
                createPanel.style.display = 'none';
                fetchFolders();
            } else if (response.status === 401) {
                alert("Please log in to create a folder.");
                window.location.href = "/login";
            } else {
                alert(result.error || "Failed to create folder.");
            }
        } catch (error) {
            console.error("Error creating folder:", error);
            alert(`Error creating folder: ${error.message}. Please try again.`);
        }
    });

    // Rename folder
    renameBtn.addEventListener("click", async function () {
        const newName = folderNameInputEdit.value.trim();
        if (!newName || !currentFolderId) {
            alert("Please enter a new folder name or select a pending.");
            return;
        }

        try {
            const response = await fetch('/api/rename_folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder_id: currentFolderId, new_name: newName })
            });
            const result = await response.json();
            if (response.ok && result.success) {
                alert("Folder renamed successfully!");
                editPanel.style.display = 'none';
                folderBox.style.opacity = "100%";
                fetchFolders();
            } else if (response.status === 401) {
                alert("Please log in to rename a folder.");
                window.location.href = "/login";
            } else {
                alert(result.error || "Failed to rename folder.");
            }
        } catch (error) {
            console.error("Error renaming folder:", error);
            alert(`Error renaming folder: ${error.message}. Please try again.`);
        }
    });

    // Delete folder
    deleteBtn.addEventListener("click", async function () {
        if (!currentFolderId) {
            alert("Please select a folder to delete.");
            return;
        }

        if (!confirm("Are you sure you want to delete this folder?")) {
            return;
        }

        try {
            const response = await fetch('/api/delete_folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder_id: currentFolderId })
            });
            const result = await response.json();
            if (response.ok && result.success) {
                alert("Folder deleted successfully!");
                editPanel.style.display = 'none';
                folderBox.style.opacity = "100%";
                fetchFolders();
            } else if (response.status === 401) {
                alert("Please log in to delete a folder.");
                window.location.href = "/login";
            } else {
                alert(result.error || "Failed to delete folder.");
            }
        } catch (error) {
            console.error("Error deleting folder:", error);
            alert(`Error deleting folder: ${error.message}. Please try again.`);
        }
    });

    // Chat functionality
    const inputEl = document.getElementById("Input");
    const sendBtn = document.getElementById("send-btn");
    const messagesContainer = document.getElementById("Block__Messages");
    const bunnyBtn = document.getElementById("bunny");
    const reminderPanel = document.getElementById("reminderPanel");
    const chatHistory = document.getElementById("chatHistory");
    const newChatBtn = document.getElementById("newChatBtn");
    const addPlanButton = document.querySelector(".add-plan");
    const actionButtons = document.querySelectorAll(".buttons button");

    let userAvatar = '/static/images/user.png';
    async function fetchUserInfo() {
        try {
            const response = await fetch('/api/user_info', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (data.avatar) userAvatar = data.avatar;
        } catch (error) {
            console.error('Error fetching user info:', error);
        }
    }

    async function fetchCurrentSession() {
        try {
            const response = await fetch('/api/current_session');
            const data = await response.json();
            messagesContainer.innerHTML = '';
            data.messages.forEach(msg => appendMessage(msg.role, msg.content));
            if (data.messages.length > 0) {
                reminderPanel.style.display = "none";
            }
        } catch (error) {
            console.error('Error fetching current session:', error);
        }
    }

    function appendMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('Message__Element', role === 'user' ? 'User' : 'Bot');

        const img = document.createElement('img');
        img.src = role === 'user' ? userAvatar : '/static/images/bunny.png';
        img.alt = role === 'user' ? 'User' : 'Bot';

        const messageContent = document.createElement('div');
        messageContent.classList.add('Message');
        messageContent.textContent = content;

        if (role === 'user') {
            messageDiv.appendChild(messageContent);
            messageDiv.appendChild(img);
        } else {
            messageDiv.appendChild(img);
            messageDiv.appendChild(messageContent);
        }

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async function sendMessage() {
        const message = inputEl.value.trim();
        if (!message) return;

        appendMessage('user', message);
        inputEl.value = '';

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, tone: 'cute' })
            });
            const data = await response.json();
            if (data.reply) {
                appendMessage('assistant', data.reply);
                if (data.reply.toLowerCase().includes('add plan')) {
                    addPlanButton.style.backgroundColor = '#CEB3FF';
                    setTimeout(() => {
                        addPlanButton.style.backgroundColor = '';
                    }, 1000);
                }
                await loadChatHistory();
            } else {
                appendMessage('assistant', 'Sorry, something went wrong!');
            }
        } catch (error) {
            appendMessage('assistant', 'Error: Could not send message.');
            console.error('Chat error:', error);
        }
    }

    // Handle action buttons (Add Plan, Statistics, Setting Goal)
    async function handleActionButton(action) {
        try {
            const response = await fetch('/api/user_summary', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (!data.success) {
                appendMessage('assistant', 'Oops, I couldn’t fetch your info. Please try again!');
                return;
            }

            let message = '';
            switch (action) {
                case 'add_plan':
                    const pending = data.plans.filter(p => !p.completed).length;
                    const completed = data.plans.length - pending;
                    if (pending > 0) {
                        message = `Yay! You have ${pending} plan${pending > 1 ? 's' : ''} to tackle! Completed ${completed} so far—great job! Wanna add a new plan or take a break?`;
                    } else {
                        message = `Wow, you’ve completed ${completed} plan${completed > 1 ? 's' : ''}! Ready to add a new one to keep the momentum going?`;
                    }
                    break;
                case 'statistics':
                    const totalFocus = data.focus_records.reduce((sum, r) => sum + r.duration, 0) / 60;
                    const completedPlans = data.plans.filter(p => p.completed).length;
                    message = `Here’s your progress: You’ve focused for ${Math.round(totalFocus)} minutes and completed ${completedPlans} plan${completedPlans > 1 ? 's' : ''}! Keep shining! Want to dive deeper into your stats?`;
                    break;
                case 'setting_goal':
                    const recentPlans = data.plans.slice(-3).map(p => p.plan_name).join(', ');
                    const recentMessages = data.recent_messages.join(' ');
                    message = `Based on your recent plans (${recentPlans || 'none yet'}) and chats, how about setting a goal like "${recentMessages.includes('study') ? 'Study for 2 hours this week' : 'Complete one new plan today'}"? Let’s make it happen!`;
                    break;
                default:
                    message = 'Hmm, not sure what to do here! Can you clarify?';
            }

            // Send the generated message to the chat API
            const chatResponse = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, tone: 'cute' })
            });
            const chatData = await chatResponse.json();
            if (chatData.reply) {
                appendMessage('assistant', chatData.reply);
            } else {
                appendMessage('assistant', 'Oops, something went wrong with my response!');
            }
        } catch (error) {
            console.error(`Error handling ${action}:`, error);
            appendMessage('assistant', 'Yikes, something broke! Please try again.');
        }
    }

    // Attach event listeners to action buttons
    actionButtons.forEach(button => {
        const imgSrc = button.querySelector('img').src;
        let action;
        if (imgSrc.includes('addPlan.png')) action = 'add_plan';
        else if (imgSrc.includes('statistics.png')) action = 'statistics';
        else if (imgSrc.includes('goals.png')) action = 'setting_goal';

        button.addEventListener('click', () => handleActionButton(action));
    });

    async function startNewChat() {
        try {
            const response = await fetch('/api/chat/new', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: '{{ session["user_id"] }}' })
            });
            const data = await response.json();
            if (!data.session_id) {
                console.error('Failed to create new session:', data.error);
                return;
            }

            localStorage.setItem('chatSessionId', data.session_id);
            messagesContainer.innerHTML = '';
            reminderPanel.style.display = "none";
            await loadChatHistory();
        } catch (error) {
            console.error('Error starting new chat:', error);
        }
    }

    async function deleteSession(sessionId) {
        if (!confirm('Are you sure you want to delete this chat session?')) return;

        try {
            const response = await fetch(`/api/chat/delete/${sessionId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (data.success) {
                if (localStorage.getItem('chatSessionId') === sessionId) {
                    localStorage.removeItem('chatSessionId');
                    messagesContainer.innerHTML = '';
                    reminderPanel.style.display = "none";
                }
                await loadChatHistory();
            } else {
                console.error('Failed to delete session:', data.error);
                alert('Failed to delete session: ' + data.error);
            }
        } catch (error) {
            console.error('Error deleting session:', error);
            alert('Error deleting session.');
        }
    }

    async function loadChatHistory() {
        try {
            const response = await fetch('/api/chat_history', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (!data.sessions) {
                chatHistory.innerHTML = '<p>No chat history available.</p>';
                return;
            }
            chatHistory.innerHTML = '';
            const sessionsByDate = {};
            data.sessions.forEach(session => {
                const timestamp = session.latest_update || session.timestamp;
                const isCurrent = session.is_current || false;
                const date = new Date(timestamp);
                const dateKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                if (!sessionsByDate[dateKey]) {
                    sessionsByDate[dateKey] = [];
                }
                sessionsByDate[dateKey].push({ ...session, is_current: isCurrent, latest_update: timestamp });
            });

            Object.keys(sessionsByDate).sort((a, b) => new Date(b) - new Date(a)).forEach(dateKey => {
                const dateHeader = document.createElement('div');
                dateHeader.className = 'date-header';
                dateHeader.innerHTML = `<p style="font-weight: bold; margin: 10px 0 5px;">${dateKey}</p>`;
                chatHistory.appendChild(dateHeader);

                sessionsByDate[dateKey].forEach(session => {
                    const sessionElement = document.createElement('div');
                    sessionElement.className = 'chat-session';
                    const time = new Date(session.latest_update).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    const isCurrent = session.is_current ? ' (Current)' : '';
                    sessionElement.innerHTML = `
                        <p style="display: inline-block; width: calc(100% - 60px); cursor: pointer;">
                            ${session.session_title}${isCurrent}
                            <span style="float: right; color: gray; font-size: 12px;">${time}</span>
                        </p>
                        <button class="delete-session-btn" style="float: right; background: #ff4d4d; color: white; border: none; padding: 2px 6px; border-radius: 4px; cursor: pointer; font-size: 12px;">Delete</button>
                    `;
                    sessionElement.querySelector('p').addEventListener('click', () => {
                        loadSessionMessages(session.session_id);
                    });
                    sessionElement.querySelector('.delete-session-btn').addEventListener('click', () => {
                        deleteSession(session.session_id);
                    });
                    chatHistory.appendChild(sessionElement);
                });
            });
        } catch (error) {
            console.error('Error loading chat history:', error);
            chatHistory.innerHTML = '<p>Error loading chat history. Please try again later.</p>';
        }
    }

    async function loadSessionMessages(sessionId) {
        try {
            const response = await fetch(`/api/chat_history/${sessionId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            messagesContainer.innerHTML = '';
            data.messages.forEach(msg => appendMessage(msg.role, msg.content));
            reminderPanel.style.display = "none";
            localStorage.setItem('chatSessionId', sessionId);
            await loadChatHistory();
        } catch (error) {
            console.error('Error loading session messages:', error);
        }
    }

    bunnyBtn.addEventListener("click", () => {
        reminderPanel.style.display = reminderPanel.style.display === "none" ? "block" : "none";
        if (reminderPanel.style.display === "block") {
            loadChatHistory();
        }
    });

    sendBtn.addEventListener('click', sendMessage);
    inputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendBtn.click();
    });

    newChatBtn.addEventListener("click", startNewChat);

    // Initial fetch
    fetchUserInfo().then(fetchCurrentSession);
    fetchFolders();
});