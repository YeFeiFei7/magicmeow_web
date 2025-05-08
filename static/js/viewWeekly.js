document.addEventListener("DOMContentLoaded", function () {
    const sidebar = document.querySelector(".sidebar");
    const toggleBtn = document.querySelector(".toggle-btn");
    const plusIcon = document.querySelector(".plus-icon");
    const planPopup = document.getElementById("planPopup");

    planPopup.style.display = "none";

    toggleBtn.addEventListener("click", function () {
        sidebar.classList.toggle("open");
        if (sidebar.classList.contains("open")) {
            plusIcon.style.display = "none";
        } else {
            plusIcon.style.display = "block";
        }
    });

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const yearEl = document.getElementById("year");
    const monthEl = document.getElementById("month");
    const weekRangeEl = document.getElementById("weekRange");
    const prevWeekBtn = document.getElementById("prevWeek");
    const nextWeekBtn = document.getElementById("nextWeek");

    let currentWeekStart = new Date();
    currentWeekStart.setDate(currentWeekStart.getDate() - ((currentWeekStart.getDay() + 6) % 7)); // Start on Monday

    function renderWeek() {
        const year = currentWeekStart.getFullYear();
        const month = currentWeekStart.getMonth();
        const startDay = currentWeekStart.getDate();

        yearEl.textContent = year;
        monthEl.textContent = monthNames[month].toUpperCase();

        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(startDay + 6);
        const rangeText = `${startDay} - ${weekEnd.getDate()}`;
        weekRangeEl.textContent = rangeText;

        fetchPlans();
    }

    prevWeekBtn.addEventListener("click", () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderWeek();
    });

    nextWeekBtn.addEventListener("click", () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderWeek();
    });

    renderWeek();

    async function fetchPlans() {
        try {
            const response = await fetch('/api/get_plans');
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error("Unexpected response format:", text);
                throw new Error("Server returned non-JSON response. You may need to log in or check the server.");
            }

            const result = await response.json();
            if (response.ok && result.success) {
                const plans = result.plans || [];
                console.log("Fetched plans:", plans);
                document.querySelectorAll('.day-box .plans').forEach(plansDiv => {
                    plansDiv.innerHTML = '';
                });
                document.querySelector('.day-box.goal-box .goals').innerHTML = '';
                plans.forEach(plan => {
                    addPlanToWeek(plan);
                });
            } else if (response.status === 401) {
                alert("Please log in to view your plans.");
                window.location.href = "/login";
            } else {
                console.error("Failed to load plans:", result.error || "Unknown error");
                alert("Failed to load plans: " + (result.error || "Unknown error"));
            }
        } catch (error) {
            console.error("Error fetching plans:", error);
            alert("Error fetching plans: " + error.message);
        }
    }

    function addPlanToWeek(plan) {
        const { date_start, date_end, plan_name, time_start, time_end, quadrant, id, completed, folder } = plan;
        if (!date_start) return;

        const startDate = new Date(date_start);
        let endDate = date_end ? new Date(date_end) : new Date(date_start);
        if (endDate < startDate) endDate = startDate;

        const weekStart = new Date(currentWeekStart);
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        let current = new Date(startDate);
        while (current <= endDate) {
            if (current >= weekStart && current <= weekEnd) {
                const dayOfWeek = (current.getDay() + 6) % 7; // Convert to 0=Sun, 1=Mon, ..., 6=Sat
                const dayBox = document.querySelector(`.day-box[data-day="${dayOfWeek}"] .plans`);
                if (dayBox && !dayBox.querySelector(`[data-plan-id="${id}"]`)) {
                    const planElement = document.createElement("div");
                    planElement.classList.add("plan-quadrant", quadrant || 'top-right');
                    if (completed) planElement.classList.add("completed");
                    planElement.setAttribute("data-plan-id", id);

                    const checkbox = document.createElement("input");
                    checkbox.type = "checkbox";
                    checkbox.classList.add("complete-checkbox");
                    checkbox.checked = completed || false;
                    checkbox.dataset.planId = id;
                    checkbox.addEventListener("change", async (e) => {
                        const planId = e.target.dataset.planId;
                        const isCompleted = e.target.checked;
                        await updatePlanCompletion(planId, isCompleted);
                    });

                    const name = document.createElement("div");
                    name.classList.add("plan-name");
                    name.textContent = plan_name || "Untitled Plan";
                    if (time_start && time_end) {
                        name.textContent += ` (${time_start} - ${time_end})`;
                    }

                    planElement.appendChild(checkbox);
                    planElement.appendChild(name);

                    planElement.addEventListener("click", (e) => {
                        if (e.target !== checkbox) {
                            showPlanPopup(plan);
                        }
                    });

                    dayBox.appendChild(planElement);
                }
            }
            current.setDate(current.getDate() + 1);
        }

        // Add to Goals section if folder is "Goals"
        if (folder === "Goals") {
            const goalsBox = document.querySelector('.day-box.goal-box .goals');
            if (goalsBox && !goalsBox.querySelector(`[data-plan-id="${id}"]`)) {
                const planElement = document.createElement("div");
                planElement.classList.add("plan-quadrant", quadrant || 'top-right');
                if (completed) planElement.classList.add("completed");
                planElement.setAttribute("data-plan-id", id);

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.classList.add("complete-checkbox");
                checkbox.checked = completed || false;
                checkbox.dataset.planId = id;
                checkbox.addEventListener("change", async (e) => {
                    const planId = e.target.dataset.planId;
                    const isCompleted = e.target.checked;
                    await updatePlanCompletion(planId, isCompleted);
                });

                const name = document.createElement("div");
                name.classList.add("plan-name");
                name.textContent = plan_name || "Untitled Plan";
                if (time_start && time_end) {
                    name.textContent += ` (${time_start} - ${time_end})`;
                }

                planElement.appendChild(checkbox);
                planElement.appendChild(name);

                planElement.addEventListener("click", (e) => {
                    if (e.target !== checkbox) {
                        showPlanPopup(plan);
                    }
                });

                goalsBox.appendChild(planElement);
            }
        }
    }

    async function updatePlanCompletion(planId, completed) {
        try {
            const response = await fetch('/api/edit_plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan_id: planId, completed: completed })
            });
            const result = await response.json();
            if (response.ok && result.success) {
                fetchPlans();
            } else {
                alert(result.error || "Failed to update plan.");
            }
        } catch (error) {
            console.error("Error updating plan:", error);
            alert("Error updating plan: " + error.message);
        }
    }

    function showPlanPopup(plan) {
        const popup = document.getElementById("planPopup");
        popup.style.display = "block";
        popup.dataset.planId = plan.id;

        document.querySelector(".plan-name-plan").textContent = plan.plan_name || "Untitled Plan";
        document.querySelector(".folder-name-plan").textContent = plan.folder || "No Folder";

        const dateRangeEl = document.querySelector(".date-range");
        const dateProgressBar = document.querySelector(".date-plan .progress-fill");
        if (plan.date_start && plan.date_end && plan.date_start !== plan.date_end) {
            dateRangeEl.textContent = `${plan.date_start} – ${plan.date_end}`;
            const startDate = new Date(plan.date_start);
            const endDate = new Date(plan.date_end);
            const now = new Date();
            const totalDuration = (endDate - startDate) / (1000 * 60 * 60 * 24);
            const elapsed = (now - startDate) / (1000 * 60 * 60 * 24);
            const progressPercent = Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
            dateProgressBar.style.width = `${progressPercent}%`;
        } else if (plan.date_start) {
            dateRangeEl.textContent = plan.date_start;
            dateProgressBar.style.width = "100%";
        } else {
            dateRangeEl.textContent = "No Date";
            dateProgressBar.style.width = "0%";
        }

        const timeRangeEl = document.querySelector(".time-range");
        const timeProgressBar = document.querySelector(".time-plan .progress-fill");
        const timeLeftEl = document.querySelector(".time-left-label");
        if (plan.time_start && plan.time_end) {
            timeRangeEl.textContent = `${plan.time_start} – ${plan.time_end}`;
            const now = new Date();
            const startDateTime = new Date(`${plan.date_start}T${plan.time_start}:00`);
            const endDateTime = new Date(`${plan.date_end || plan.date_start}T${plan.time_end}:00`);
            if (endDateTime > now && now >= startDateTime) {
                const totalDuration = (endDateTime - startDateTime) / (1000 * 60);
                const elapsed = (now - startDateTime) / (1000 * 60);
                const progressPercent = Math.min((elapsed / totalDuration) * 100, 100);
                timeProgressBar.style.width = `${progressPercent}%`;
                const timeDiff = endDateTime - now;
                const hours = Math.floor(timeDiff / (1000 * 60 * 60));
                const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
                timeLeftEl.textContent = `${hours}h ${minutes}m`;
            } else if (endDateTime <= now) {
                timeProgressBar.style.width = "100%";
                timeLeftEl.textContent = "Time's up!";
            } else {
                timeProgressBar.style.width = "0%";
                timeLeftEl.textContent = "Not started";
            }
        } else {
            timeRangeEl.textContent = "No Time";
            timeProgressBar.style.width = "0%";
            timeLeftEl.textContent = "";
        }

        const reminderSwitch = document.querySelector("#reminderToggle");
        reminderSwitch.checked = plan.reminder && plan.reminder.enabled;

        const repeatEl = document.querySelector(".repeat-plan");
        const repeatText = document.querySelector(".month-text");
        const weekText = document.querySelector(".week-text");
        const daysText = document.querySelector(".days-text");
        if (plan.repeat && plan.repeat.type) {
            repeatEl.style.display = "flex";
            repeatText.textContent = `Repeat: `;
            weekText.textContent = `${plan.repeat.type.charAt(0).toUpperCase() + plan.repeat.type.slice(1)} (${plan.repeat.count} times)`;
            if (plan.repeat.days && plan.repeat.days.length > 0) {
                const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
                const selectedDays = plan.repeat.days.map(day => daysOfWeek[day - 1]).join(" and ");
                daysText.textContent = selectedDays;
            } else {
                daysText.textContent = "";
            }
        } else {
            repeatEl.style.display = "none";
        }

        const notesEl = document.querySelector(".notes-text");
        notesEl.value = plan.notes || "No notes";

        const highlightOval = document.querySelector(".highlight-oval-plan");
        const quadrantMap = {
            'top-left': { top: '40px', left: '40px' },
            'top-right': { top: '40px', right: '40px' },
            'bottom-left': { bottom: '30px', left: '40px' },
            'bottom-right': { bottom: '30px', right: '40px' }
        };
        const quadrant = plan.quadrant || 'top-right';
        Object.assign(highlightOval.style, {
            top: quadrantMap[quadrant].top,
            right: quadrantMap[quadrant].right || quadrantMap[quadrant].left,
            bottom: quadrantMap[quadrant].bottom || '',
            left: quadrantMap[quadrant].left || '',
            borderColor: '#EE7981',
            display: 'block'
        });

        const colorMap = {
            'top-left': '#FED981',
            'top-right': '#EE7981',
            'bottom-left': '#AFD2BC',
            'bottom-right': '#B3B8F0'
        };
        highlightOval.style.borderColor = colorMap[quadrant] || '#EE7981';
    }

    document.querySelector(".back-arrow-plan").addEventListener("click", () => {
        document.getElementById("planPopup").style.display = "none";
    });

    window.addEventListener("click", (e) => {
        const popup = document.getElementById("planPopup");
        if (e.target === popup) popup.style.display = "none";
    });

    document.querySelector(".delete-btn-plan").addEventListener("click", async () => {
        const popup = document.getElementById("planPopup");
        const planId = popup.dataset.planId;
        if (!planId) {
            alert("Plan ID not found.");
            return;
        }

        if (!confirm("Are you sure you want to delete this plan?")) {
            return;
        }

        try {
            const response = await fetch('/api/delete_plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan_id: planId })
            });

            const result = await response.json();
            if (response.ok && result.success) {
                alert("Plan deleted successfully!");
                popup.style.display = "none";
                fetchPlans();
            } else if (response.status === 401) {
                alert("Please log in to delete your plan.");
                window.location.href = "/login";
            } else {
                alert(result.error || "Failed to delete plan.");
            }
        } catch (error) {
            console.error("Error deleting plan:", error);
            alert("Error deleting plan: " + error.message);
        }
    });

    document.querySelector(".edit-btn-plan").addEventListener("click", () => {
        const popup = document.getElementById("planPopup");
        const planId = popup.dataset.planId;
        if (!planId) {
            alert("Plan ID not found.");
            return;
        }

        window.location.href = `/addPlan?editPlanId=${planId}`;
    });

    const showBtn = document.getElementById("bunny");
    const panel = document.getElementById("reminderPanel");

    showBtn.addEventListener("click", () => {
        panel.style.display = panel.style.display === "none" ? "block" : "none";
    });

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
                    const addPlanButton = document.querySelector(".add-plan");
                    addPlanButton.style.backgroundColor = '#CEB3FF';
                    setTimeout(() => {
                        addPlanButton.style.backgroundColor = '';
                        window.location.href = '/addPlan';
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
                        <p style="display: inline-block; width: calc(100% - 80px); cursor: pointer;">
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
    inputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendBtn.click();
    });

    bunnyBtn.addEventListener("click", () => {
        reminderPanel.style.display = reminderPanel.style.display === "none" ? "block" : "none";
        if (reminderPanel.style.display === "block") {
            loadChatHistory();
        }
    });

    newChatBtn.addEventListener("click", startNewChat);

    fetchUserInfo().then(fetchCurrentSession);
});