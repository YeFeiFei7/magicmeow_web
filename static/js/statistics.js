document.addEventListener("DOMContentLoaded", function () {
    // Sidebar
    const sidebar = document.querySelector(".sidebar");
    const toggleBtn = document.querySelector(".toggle-btn");
    const plusIcon = document.querySelector(".plus-icon");

    toggleBtn.addEventListener("click", function () {
        sidebar.classList.toggle("open");
        if (sidebar.classList.contains("open")) {
            plusIcon.style.display = "none";
        } else {
            plusIcon.style.display = "block";
        }
    });

    // Tabs
    function switchTab(tabId) {
        const tabIds = ['daily-content', 'monthly-content', 'all-content'];
        tabIds.forEach(id => {
            const tab = document.getElementById(id);
            if (tab) tab.style.display = 'none';
        });
        const selectedTab = document.getElementById(tabId);
        if (selectedTab) selectedTab.style.display = 'block';
    }

    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            switchTab(tabId);
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });

    const firstTabButton = document.querySelector('.tab-button[data-tab="daily-content"]');
    if (firstTabButton) firstTabButton.click();

    // Plan Progress Data
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentMonth = new Date().getMonth();
    document.getElementById('progressTitle').innerHTML = `<span style="color: #CEB3FF; font-weight: lighter;">${monthNames[currentMonth].toUpperCase()}</span> PLAN PROGRESS:`;

    async function fetchPlanStats() {
        try {
            const response = await fetch('/api/plan_stats', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (data.success) {
                return data.stats;
            } else {
                console.error('Failed to fetch plan stats:', data.error);
                return {
                    daily: { Red: { completed: 0, total: 0 }, Blue: { completed: 0, total: 0 }, Yellow: { completed: 0, total: 0 }, Green: { completed: 0, total: 0 } },
                    monthly: { Red: { completed: 0, total: 0 }, Blue: { completed: 0, total: 0 }, Yellow: { completed: 0, total: 0 }, Green: { completed: 0, total: 0 } },
                    all: { Red: { completed: 0, total: 0 }, Blue: { completed: 0, total: 0 }, Yellow: { completed: 0, total: 0 }, Green: { completed: 0, total: 0 } }
                };
            }
        } catch (error) {
            console.error('Error fetching plan stats:', error);
            return {
                daily: { Red: { completed: 0, total: 0 }, Blue: { completed: 0, total: 0 }, Yellow: { completed: 0, total: 0 }, Green: { completed: 0, total: 0 } },
                monthly: { Red: { completed: 0, total: 0 }, Blue: { completed: 0, total: 0 }, Yellow: { completed: 0, total: 0 }, Green: { completed: 0, total: 0 } },
                all: { Red: { completed: 0, total: 0 }, Blue: { completed: 0, total: 0 }, Yellow: { completed: 0, total: 0 }, Green: { completed: 0, total: 0 } }
            };
        }
    }

    function updatePlanProgress(stats, tab) {
        const quadrants = ['Red', 'Blue', 'Yellow', 'Green'];
        const tasks = document.querySelectorAll(`#${tab}-content .task`);
        const canvasId = tab === 'daily' ? 'chartCanvas-daily' : tab === 'monthly' ? 'chartCanvas' : 'chartCanvas-all';
        const toggleId = `chartToggle-${tab}`;

        quadrants.forEach((quadrant, index) => {
            const task = tasks[index];
            const badge = task.querySelector('.badge');
            const progressBar = task.querySelector('.progress-bar');
            const progressBarFill = task.querySelector('.progress-bar-fill');
            badge.textContent = `${stats[quadrant].completed}/${stats[quadrant].total}`;
            progressBarFill.style.width = stats[quadrant].total > 0 ? `${(stats[quadrant].completed / stats[quadrant].total) * 100}%` : '0%';
            progressBarFill.style.background = ['#F4A099', '#A3C1F3', '#FDE9A8', '#C9E2D0'][index];
            // Set progress bar background to white for Blue, Yellow, Green when no progress
            if (quadrant !== 'Red') {
                progressBar.style.background = stats[quadrant].total > 0 ? ['#A3C1F3', '#FDE9A8', '#C9E2D0'][index - 1] : 'white';
            } else {
                progressBar.style.background = 'white'; // Red's empty state is white too
            }
            badge.style.background = ['#F4A099', '#A3C1F3', '#FDE9A8', '#C9E2D0'][index];
        });

        const pieData = {
            labels: quadrants,
            datasets: [{
                data: quadrants.map(q => stats[q].completed),
                backgroundColor: ['#F4A099', '#A3C1F3', '#FDE9A8', '#C9E2D0'],
                borderColor: 'black',
                borderWidth: 2
            }]
        };

        const barData = {
            labels: ['', '', '', ''],
            datasets: [{
                label: '',
                data: quadrants.map(q => stats[q].completed),
                backgroundColor: ['#F4A099', '#A3C1F3', '#FDE9A8', '#C9E2D0'],
                borderColor: 'black',
                borderWidth: 2
            }]
        };

        const ctx = document.getElementById(canvasId).getContext('2d');
        let currentChart = Chart.getChart(ctx);
        if (currentChart) currentChart.destroy();
        currentChart = new Chart(ctx, {
            type: 'pie',
            data: pieData,
            options: {
                responsive: false,
                plugins: { legend: { display: false } }
            }
        });

        const toggle = document.getElementById(toggleId);
        toggle.addEventListener('click', () => {
            toggle.classList.toggle('active');
            currentChart.destroy();
            const type = toggle.classList.contains('active') ? 'bar' : 'pie';
            const data = toggle.classList.contains('active') ? barData : pieData;
            currentChart = new Chart(ctx, {
                type,
                data,
                options: {
                    responsive: false,
                    plugins: { legend: { display: false } },
                    scales: type === 'bar' ? {
                        x: { grid: { display: false }, ticks: { display: false }, title: { display: false } },
                        y: { grid: { display: false }, ticks: { display: false }, title: { display: false } }
                    } : {}
                }
            });
        });
    }

    // Function to refresh all tabs
    async function refreshAllStats() {
        const stats = await fetchPlanStats();
        updatePlanProgress(stats.daily, 'daily');
        updatePlanProgress(stats.monthly, 'monthly');
        updatePlanProgress(stats.all, 'all');
    }

    // Initial load
    refreshAllStats();

    // Check if we just returned from adding a plan
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('planAdded') === 'true') {
        refreshAllStats();
    }

    // Focus Stats (unchanged)
    async function fetchFocusStats() {
        try {
            const response = await fetch('/api/focus_stats', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (data.success) return data.stats;
            console.error('Failed to fetch focus stats:', data.error);
            return { daily: { sessions: 0, minutes: 0, weekly: [] }, monthly: { sessions: 0, minutes: 0, daily: [] }, all: { sessions: 0, minutes: 0, monthly: [] } };
        } catch (error) {
            console.error('Error fetching focus stats:', error);
            return { daily: { sessions: 0, minutes: 0, weekly: [] }, monthly: { sessions: 0, minutes: 0, daily: [] }, all: { sessions: 0, minutes: 0, monthly: [] } };
        }
    }

    function updateFocusStats(stats) {
        document.getElementById('daily-sessions').textContent = stats.daily.sessions;
        document.getElementById('daily-minutes').textContent = stats.daily.minutes;
        renderFocusChart('daily', stats.daily.weekly);

        document.getElementById('monthly-sessions').textContent = stats.monthly.sessions;
        document.getElementById('monthly-minutes').textContent = stats.monthly.minutes;
        renderFocusChart('monthly', stats.monthly.daily);

        document.getElementById('all-sessions').textContent = stats.all.sessions;
        document.getElementById('all-minutes').textContent = stats.all.minutes;
        renderFocusChart('all', stats.all.monthly);
    }

    function renderFocusChart(tab, data) {
        const containerId = `barContainer-${tab}`;
        const yAxisId = `yAxisMarks-${tab}`;
        const container = document.getElementById(containerId);
        const yAxisContainer = document.getElementById(yAxisId);
        container.innerHTML = '';
        yAxisContainer.innerHTML = '';

        const defaultMaxValue = 70;
        const yAxisSteps = 5;
        let maxValue = defaultMaxValue;
        let stepValue = Math.ceil(maxValue / yAxisSteps);

        if (data && data.length > 0) {
            maxValue = Math.max(...data.map(item => item.value), defaultMaxValue);
            stepValue = Math.ceil(maxValue / yAxisSteps);
        }

        for (let i = yAxisSteps; i >= 0; i--) {
            const mark = document.createElement('div');
            mark.className = 'y-axis-mark';
            mark.textContent = i * stepValue;
            mark.style.fontSize = '12px';
            mark.style.color = '#333';
            mark.style.marginBottom = '10px';
            yAxisContainer.appendChild(mark);
        }

        if (!data || data.length === 0) {
            const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
            data = weekdays.map(day => ({ day, value: 0 }));
        }

        const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        const orderedData = weekdays.map((day, index) => {
            const item = data.find(d => d.day === day) || { day, value: 0 };
            return item;
        });

        const colors = ['#C9E2D0', '#CEB3FF', '#F4A099', '#FDE9A8', '#A3C1F3', '#FF8CE9', '#93B493'];
        orderedData.forEach((item, index) => {
            const group = document.createElement('div');
            group.className = 'bar-group';
            const bar = document.createElement('div');
            bar.className = 'bar-focus';
            const barMaxHeight = 160;
            bar.style.height = `${(item.value / maxValue) * barMaxHeight}px`;
            bar.style.backgroundColor = colors[index % colors.length];
            bar.title = `${item.value} min`;
            const label = document.createElement('div');
            label.className = 'day-label';
            label.textContent = item.day;
            label.style.fontSize = '12px';
            label.style.color = '#333';
            group.appendChild(bar);
            group.appendChild(label);
            container.appendChild(group);
        });
    }

    fetchFocusStats().then(stats => updateFocusStats(stats));

    // Mood Stats (unchanged)
    async function fetchMoodStats() {
        try {
            const response = await fetch('/api/mood_stats', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (data.success) return data.stats;
            console.error('Failed to fetch mood stats:', data.error);
            return { daily: {}, monthly: {}, all: {} };
        } catch (error) {
            console.error('Error fetching mood stats:', error);
            return { daily: {}, monthly: {}, all: {} };
        }
    }

    function updateMoodStats(stats) {
        const monthlyBars = document.querySelectorAll('#monthly-content .bar');
        monthlyBars.forEach(bar => {
            const mood = parseInt(bar.querySelector('.value').getAttribute('data-mood'));
            const value = stats.monthly[mood] || 0;
            const valueElement = bar.querySelector('.value');
            valueElement.textContent = `${value.toFixed(2)}%`;
            const shape = bar.querySelector('.bar-shape');
            const star = bar.querySelector('.star');
            if (value > 30) {
                shape.classList.add('tall');
                star.src = '/static/images/filledStar.png';
            } else {
                shape.classList.remove('tall');
                star.src = '/static/images/star.png';
            }
        });

        const allBars = document.querySelectorAll('#all-content .bar');
        allBars.forEach(bar => {
            const mood = parseInt(bar.querySelector('.value').getAttribute('data-mood'));
            const value = stats.all[mood] || 0;
            const valueElement = bar.querySelector('.value');
            valueElement.textContent = `${value.toFixed(2)}%`;
            const shape = bar.querySelector('.bar-shape');
            const star = bar.querySelector('.star');
            if (value > 30) {
                shape.classList.add('tall');
                star.src = '/static/images/filledStar.png';
            } else {
                shape.classList.remove('tall');
                star.src = '/static/images/star.png';
            }
        });

        const dailyBars = document.querySelectorAll('.bar-daily');
        dailyBars.forEach(bar => {
            const mood = parseInt(bar.getAttribute('data-id'));
            const shape = bar.querySelector('.bar-shape-daily');
            const star = bar.querySelector('.star');
            if (stats.daily.mood === mood) {
                shape.classList.add('active');
                star.src = '/static/images/filledStar.png';
            } else {
                shape.classList.remove('active');
                star.src = '/static/images/star.png';
            }
        });
    }

    async function saveMood(mood) {
        try {
            const response = await fetch('/api/save_mood', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mood })
            });
            const data = await response.json();
            if (data.success) {
                const stats = await fetchMoodStats();
                updateMoodStats(stats);
            } else console.error('Failed to save mood:', data.error);
        } catch (error) {
            console.error('Error saving mood:', error);
        }
    }

    async function clearMood() {
        try {
            const response = await fetch('/api/clear_mood', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (data.success) {
                const stats = await fetchMoodStats();
                updateMoodStats(stats);
            } else console.error('Failed to clear mood:', data.error);
        } catch (error) {
            console.error('Error clearing mood:', error);
        }
    }

    const bars = document.querySelectorAll(".bar-daily");
    let selectedMood = null;
    fetchMoodStats().then(stats => {
        updateMoodStats(stats);
        selectedMood = stats.daily.mood || null;
    });

    bars.forEach(bar => {
        const star = bar.querySelector(".star");
        const mood = parseInt(bar.getAttribute('data-id'));
        star.addEventListener("click", async () => {
            if (selectedMood === null) {
                await saveMood(mood);
                selectedMood = mood;
            } else if (selectedMood === mood) {
                await clearMood();
                selectedMood = null;
            }
        });
    });

    // Chat functionality
    const inputEl = document.getElementById("Input");
    const sendBtn = document.getElementById("send-btn");
    const messagesContainer = document.getElementById("Block__Messages");
    const bunnyBtn = document.getElementById("bunny");
    const reminderPanel = document.getElementById("reminderPanel");
    const chatHistory = document.getElementById("chatHistory");
    const newChatBtn = document.getElementById("newChatBtn");

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
            if (data.messages.length > 0) reminderPanel.style.display = "none";
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
                    const addPlanButton = document.querySelector(".add-plan");
                    addPlanButton.style.backgroundColor = '#CEB3FF';
                    setTimeout(() => {
                        addPlanButton.style.backgroundColor = '';
                        window.location.href = '/addPlan';
                    }, 1000);
                }
                await loadChatHistory();
            } else appendMessage('assistant', 'Sorry, something went wrong!');
        } catch (error) {
            appendMessage('assistant', 'Error: Could not send message.');
            console.error('Chat error:', error);
        }
    }

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
            chatHistory.innerHTML = '';
            const sessionsByDate = {};
            data.sessions.forEach(session => {
                const timestamp = session.latest_update || session.timestamp;
                const isCurrent = session.is_current || false;
                const date = new Date(timestamp);
                const dateKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                if (!sessionsByDate[dateKey]) sessionsByDate[dateKey] = [];
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
                        <p style="display: inline-block; width: calc(100% - 80px); cursor: pointer;">
                            ${session.session_title}${isCurrent}
                            <span style="float: right; color: gray; font-size: 12px;">${time}</span>
                        </p>
                        <button class="delete-session-btn" style="float: right; background: #ff4d4d; color: white; border: none; padding: 2px 6px; border-radius: 4px; cursor: pointer; font-size: 12px;">Delete</button>
                    `;
                    sessionElement.querySelector('p').addEventListener('click', () => loadSessionMessages(session.session_id));
                    sessionElement.querySelector('.delete-session-btn').addEventListener('click', () => deleteSession(session.session_id));
                    chatHistory.appendChild(sessionElement);
                });
            });
        } catch (error) {
            console.error('Error loading chat history:', error);
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

    sendBtn.addEventListener('click', sendMessage);
    inputEl.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendBtn.click(); });
    bunnyBtn.addEventListener("click", () => {
        reminderPanel.style.display = reminderPanel.style.display === "none" ? "block" : "none";
        if (reminderPanel.style.display === "block") loadChatHistory();
    });
    newChatBtn.addEventListener("click", startNewChat);

    fetchUserInfo().then(fetchCurrentSession);
});