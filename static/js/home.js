document.addEventListener("DOMContentLoaded", async function () {
    const sidebar = document.querySelector(".sidebar");
    const toggleBtn = document.querySelector(".toggle-btn");
    const plusIcon = document.querySelector(".plus-icon");
    const chatBox = document.querySelector(".chat-box");
    const sendButton = document.querySelector(".send-btn");
    const threebtn = document.querySelector(".threebtn");
    const chatBot = document.querySelector(".chatbot");
    const Block__Messages = document.getElementById('Block__Messages');
    const Input = document.getElementById('Input');
    const SendBtn = document.getElementById('send-btn');
    const reminderPanel = document.getElementById('reminderPanel');
    const chatHistory = document.getElementById('chatHistory');
    const bunnyBtn = document.getElementById('bunny');
    const newChatBtn = document.getElementById('newChatBtn');

    // 获取当前用户头像
    let userAvatar = '/static/images/user.png';
    try {
        const response = await fetch('/api/user_info', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        if (data.avatar) {
            userAvatar = data.avatar;
        }
    } catch (error) {
        console.error('Error fetching user info:', error);
    }

    // 自动加载最近的聊天会话
    async function loadLatestSession() {
        // Check if we should show the welcome screen
        if (!localStorage.getItem('chatSessionId')) {
            chatBox.style.display = "block";
            chatBot.style.display = "none";
            threebtn.style.display = "none";
            Block__Messages.innerHTML = '';
            return;
        }

        try {
            const response = await fetch('/api/current_session', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (data.messages && data.messages.length > 0) {
                Block__Messages.innerHTML = '';
                data.messages.forEach(msg => {
                    const messageClass = msg.role === 'user' ? 'User' : 'Bot';
                    const imgSrc = msg.role === 'user' ? userAvatar : '/static/images/bunny.png';
                    const messageElement = `
                        <div class="Message__Element ${messageClass}">
                            ${msg.role === 'user' ? `
                                <div class="Message">${msg.content}</div>
                                <img src="${imgSrc}" alt="" style="height: 50px; border-radius: 50%; border: 3px solid black; object-fit: cover; margin-left: 5px;">
                            ` : `
                                <img src="${imgSrc}" alt="" style="height: 50px;">
                                <div class="Message">${msg.content}</div>
                            `}
                        </div>
                    `;
                    Block__Messages.innerHTML += messageElement;
                });
                chatBox.style.display = "none";
                threebtn.style.display = "flex";
                chatBot.style.display = "block";
                Block__Messages.scrollTop = Block__Messages.scrollHeight;
            } else {
                // Fallback to latest session from history
                const historyResponse = await fetch('/api/chat_history', {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                const historyData = await historyResponse.json();
                if (historyData.sessions && historyData.sessions.length > 0) {
                    const latestSession = historyData.sessions[0];
                    await loadSessionMessages(latestSession.session_id);
                } else {
                    chatBox.style.display = "block";
                    chatBot.style.display = "none";
                    threebtn.style.display = "none";
                }
            }
        } catch (error) {
            console.error('Error loading latest session:', error);
            chatBox.style.display = "block";
            chatBot.style.display = "none";
            threebtn.style.display = "none";
        }
    }

    // 调用自动加载
    await loadLatestSession();

    // 开始新聊天
    async function startNewChat() {
        try {
            // 创建新会话
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

            // 保存新会话 ID
            localStorage.setItem('chatSessionId', data.session_id);

            // 重置界面
            Block__Messages.innerHTML = '';
            chatBox.style.display = "block";
            chatBot.style.display = "none";
            threebtn.style.display = "none";
            reminderPanel.style.display = "none";

            // 刷新聊天历史
            await loadChatHistory();
        } catch (error) {
            console.error('Error starting new chat:', error);
        }
    }

    // 删除会话
    async function deleteSession(sessionId) {
        if (!confirm('Are you sure you want to delete this chat session?')) return;

        try {
            const response = await fetch(`/api/chat/delete/${sessionId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (data.success) {
                // 如果删除的是当前会话，重置界面
                if (localStorage.getItem('chatSessionId') === sessionId) {
                    localStorage.removeItem('chatSessionId');
                    Block__Messages.innerHTML = '';
                    chatBox.style.display = "block";
                    chatBot.style.display = "none";
                    threebtn.style.display = "none";
                }
                // 刷新聊天历史
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

    // 侧边栏切换
    toggleBtn.addEventListener("click", function () {
        sidebar.classList.toggle("open");
        plusIcon.style.display = sidebar.classList.contains("open") ? "none" : "block";
    });

    // 提醒面板（显示聊天历史）
    bunnyBtn.addEventListener("click", () => {
        reminderPanel.style.display = reminderPanel.style.display === "none" ? "block" : "none";
        if (reminderPanel.style.display === "block") {
            loadChatHistory();
        }
    });

    // 绑定“Start New Chat”按钮事件
    newChatBtn.addEventListener("click", startNewChat);

    // 通知弹窗
    const showNot = document.getElementById("notification");
    const popup = document.getElementById("notificationPopup");
    showNot.addEventListener("click", () => {
        popup.style.visibility = popup.style.visibility === "hidden" ? "visible" : "hidden";
    });

    // 加载聊天历史
    async function loadChatHistory() {
        try {
            const response = await fetch('/api/chat_history', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            chatHistory.innerHTML = '';

            // 按日期分组会话
            const sessionsByDate = {};
            data.sessions.forEach(session => {
                const date = new Date(session.latest_update || session.timestamp);
                const dateKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                if (!sessionsByDate[dateKey]) {
                    sessionsByDate[dateKey] = [];
                }
                sessionsByDate[dateKey].push(session);
            });

            // 按日期降序渲染
            Object.keys(sessionsByDate).sort((a, b) => new Date(b) - new Date(a)).forEach(dateKey => {
                const dateHeader = document.createElement('div');
                dateHeader.className = 'date-header';
                dateHeader.innerHTML = `<p style="font-weight: bold; margin: 10px 0 5px;">${dateKey}</p>`;
                chatHistory.appendChild(dateHeader);

                sessionsByDate[dateKey].forEach(session => {
                    const sessionElement = document.createElement('div');
                    sessionElement.className = 'chat-session';
                    const time = new Date(session.latest_update || session.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
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
        }
    }

    // 加载特定会话的消息
    async function loadSessionMessages(sessionId) {
        try {
            const response = await fetch(`/api/chat_history/${sessionId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            Block__Messages.innerHTML = '';
            data.messages.forEach(msg => {
                const messageClass = msg.role === 'user' ? 'User' : 'Bot';
                const imgSrc = msg.role === 'user' ? userAvatar : '/static/images/bunny.png';
                const messageElement = `
                    <div class="Message__Element ${messageClass}">
                        ${msg.role === 'user' ? `
                            <div class="Message">${msg.content}</div>
                            <img src="${imgSrc}" alt="" style="height: 50px; border-radius: 50%; border: 3px solid black; object-fit: cover; margin-left: 5px;">
                        ` : `
                            <img src="${imgSrc}" alt="" style="height: 50px;">
                            <div class="Message">${msg.content}</div>
                        `}
                    </div>
                `;
                Block__Messages.innerHTML += messageElement;
            });
            chatBox.style.display = "none";
            threebtn.style.display = "flex";
            chatBot.style.display = "block";
            Block__Messages.scrollTop = Block__Messages.scrollHeight;

            // 设置当前会话
            localStorage.setItem('chatSessionId', sessionId);

            // 刷新聊天历史以更新 Current 标记
            await loadChatHistory();
        } catch (error) {
            console.error('Error loading session messages:', error);
        }
    }

    // 发送消息函数
    async function sendMessage() {
        if (chatBox && chatBox.style.display !== "none") {
            chatBox.style.display = "none";
            threebtn.style.display = "flex";
            chatBot.style.display = "block";
        }

        const value = Input.value.trim();
        if (value === '') return;

        const userMessage = `
            <div class="Message__Element User">
                <div class="Message">${value}</div>
                <img src="${userAvatar}" alt="" style="height: 50px; border-radius: 50%; border: 3px solid black; object-fit: cover; margin-left: 5px;">
            </div>
        `;
        Block__Messages.innerHTML += userMessage;
        Input.value = '';

        const loadingMessage = `
            <div class="Message__Element Bot">
                <img src="/static/images/bunny.png" alt="" style="height: 50px;">
                <div class="Message">...</div>
            </div>
        `;
        Block__Messages.innerHTML += loadingMessage;
        Block__Messages.scrollTop = Block__Messages.scrollHeight;

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: value, tone: 'cute' })
            });

            const data = await response.json();
            if (data.reply) {
                const lastBotMessage = Block__Messages.querySelector('.Message__Element.Bot:last-child');
                if (lastBotMessage) lastBotMessage.remove();

                const botMessage = `
                    <div class="Message__Element Bot">
                        <img src="/static/images/bunny.png" alt="" style="height: 50px;">
                        <div class="Message">${data.reply}</div>
                    </div>
                `;
                Block__Messages.innerHTML += botMessage;

                // 保存当前会话 ID
                if (!localStorage.getItem('chatSessionId')) {
                    const historyResponse = await fetch('/api/chat_history', {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    const historyData = await historyResponse.json();
                    if (historyData.sessions && historyData.sessions.length > 0) {
                        localStorage.setItem('chatSessionId', historyData.sessions[0].session_id);
                    }
                }

                // 刷新聊天历史
                await loadChatHistory();

                if (data.reply.toLowerCase().includes('add plan')) {
                    const addPlanButton = document.querySelector('.add-plan');
                    if (addPlanButton) {
                        addPlanButton.style.backgroundColor = '#CEB3FF';
                        setTimeout(() => {
                            addPlanButton.style.backgroundColor = '';
                            window.location.href = '/addPlan';
                        }, 1000);
                    }
                }
            } else {
                throw new Error(data.error || 'No reply from backend');
            }
        } catch (error) {
            console.error('Frontend error:', error);
            const lastBotMessage = Block__Messages.querySelector('.Message__Element.Bot:last-child');
            if (lastBotMessage) lastBotMessage.remove();

            const errorMessage = `
                <div class="Message__Element Bot">
                    <img src="/static/images/bunny.png" alt="" style="height: 50px;">
                    <div class="Message">Oops, something went wrong! Let's try again. Error: ${error.message}</div>
                </div>
            `;
            Block__Messages.innerHTML += errorMessage;
        }

        Block__Messages.scrollTop = Block__Messages.scrollHeight;

        const allMessages = Block__Messages.querySelectorAll('.Message__Element');
        if (allMessages.length > 30) {
            Block__Messages.removeChild(allMessages[0]);
        }
    }

    SendBtn.addEventListener('click', sendMessage);

    Input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});