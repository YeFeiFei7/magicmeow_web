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

    // Reminder-chat
    const showBtn = document.getElementById("bunny");
    const panel = document.getElementById("reminderPanel");

    showBtn.addEventListener("click", () => {
        panel.style.display = panel.style.display === "none" ? "block" : "none";
    });

    // Folder Management
    let folders = [];
    let selectedFolder = null;

    // Load folders from backend
    async function loadFolders() {
        try {
            const response = await fetch('/api/get_folders');
            const result = await response.json();
            if (response.ok) {
                // Extract the 'folders' array from the response and map to folder names
                folders = result.folders.map(folder => folder.name);
                renderFolders();
            } else if (response.status === 401) {
                alert("Please log in to access folders.");
                window.location.href = "/login";
            } else {
                throw new Error(result.error || "Failed to load folders");
            }
        } catch (error) {
            console.error("Error loading folders:", error);
            alert("Error loading folders: " + error.message);
        }
    }

    // Render folders in the selection panel
    function renderFolders() {
        const folderPanel = document.querySelector(".folder");
        const noFolderPanel = document.querySelector(".no-folder");
        const illustration = document.querySelector(".illustration");

        if (!folderPanel) {
            console.error("Folder panel element not found in the DOM.");
            return;
        }

        folderPanel.innerHTML = '';

        if (folders.length === 0) {
            if (noFolderPanel) noFolderPanel.style.display = "block";
            if (illustration) illustration.style.display = "block";
            folderPanel.style.display = "none";
        } else {
            if (noFolderPanel) noFolderPanel.style.display = "none";
            if (illustration) illustration.style.display = "block";

            folderPanel.style.display = "none";

            folderPanel.innerHTML = `
                <h2 style="text-align: center;">FOLDER</h2>
                <img src="/static/images/arrow.png" alt="" id="close-folder-btn"
                    style="width: 40px; height:40px; position:absolute; top:10px; right:14px; cursor: pointer;">
                <hr class="dashed-line">
            `;

            folders.forEach(folder => {
                const btn = document.createElement("button");
                btn.classList.add("folder-button", "selection");
                btn.style.width = "530px";
                btn.style.marginBottom = "20px";
                btn.setAttribute("data-folder", folder);
                btn.innerHTML = `
                    <img src="/static/images/icon-folder.png" alt="" style="width: 60px; height:60px;">
                    <p>${folder}</p>
                `;
                btn.addEventListener("click", () => {
                    selectedFolder = folder;
                    const selectedFolderElement = document.getElementById("selectedFolder");
                    if (selectedFolderElement) {
                        selectedFolderElement.textContent = selectedFolder;
                    }
                    const closeBtn = document.getElementById("close-folder-btn");
                    if (closeBtn) closeBtn.click();
                    checkSaveButtonVisibility();
                });
                folderPanel.appendChild(btn);
            });
        }
    }

    loadFolders();

    // Create folder
    document.getElementById("createFolderBtn").addEventListener("click", async () => {
        const folderName = document.getElementById("newFolderName").value.trim();
        if (folderName && !folders.includes(folderName)) {
            try {
                const response = await fetch('/api/create_folder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ folder_name: folderName })
                });
                const result = await response.json();
                if (response.ok) {
                    folders.push(folderName);
                    renderFolders();
                    document.getElementById("close-createFolder-btn").click();
                    alert(`Folder "${folderName}" created!`);
                } else if (response.status === 401) {
                    alert("Please log in to create a folder.");
                    window.location.href = "/login";
                } else {
                    throw new Error(result.error || "Failed to create folder");
                }
            } catch (error) {
                console.error("Error creating folder:", error);
                alert("Error creating folder: " + error.message);
            }
        } else {
            alert("Please enter a unique folder name.");
        }
    });

    // Check Save button visibility
    function checkSaveButtonVisibility() {
        const planName = document.getElementById("planName").value.trim();
        const saveBtn = document.getElementById("save-btn");
        if (planName && selectedFolder) {
            saveBtn.style.display = "block";
        } else {
            saveBtn.style.display = "none";
        }
    }

    document.getElementById("planName").addEventListener("input", checkSaveButtonVisibility);

    // Detailed Configuration
    const illustration = document.querySelector(".illustration");

    const panels = {
        folder: {
            btn: document.getElementById("toggle-btn"),
            panel: document.querySelector(".folder"),
            close: document.getElementById("close-folder-btn")
        },
        createFolder: {
            btn: document.getElementById("createFolder"),
            panel: document.querySelector(".create-folder"),
            close: document.getElementById("close-createFolder-btn")
        },
        quadrants: {
            btn: document.getElementById("quadrants-btn"),
            panel: document.querySelector(".quadrants"),
            close: document.getElementById("close-quadrants-btn")
        },
        time: {
            btn: document.getElementById("time-btn"),
            panel: document.querySelector(".time-picker-container"),
            close: document.getElementById("close-time-btn")
        },
        reminder: {
            btn: document.getElementById("reminder-btn"),
            panel: document.querySelector(".reminder"),
            close: document.getElementById("close-reminder-btn")
        },
        date: {
            btn: document.getElementById("date-btn"),
            panel: document.querySelector(".calendar-container"),
            close: document.getElementById("close-date-btn")
        },
        repeat: {
            btn: document.getElementById("repeat-btn"),
            panel: document.querySelector(".repeat-container"),
            close: document.getElementById("close-reapeat-btn")
        },
        planDetails: {
            btn: document.getElementById("save-btn"),
            panel: document.querySelector(".plan-details"),
            close: document.getElementById("close-plan-btn")
        },
        popupNote: {
            panel: document.querySelector(".popup-note"),
            auto: true
        }
    };

    let currentOpenPanel = null;

    function openOrClosePanel(panelObj) {
        const { panel, close } = panelObj;

        if (currentOpenPanel && currentOpenPanel !== panel) {
            currentOpenPanel.style.display = "none";
            for (let key in panels) {
                if (panels[key].panel === currentOpenPanel) {
                    panels[key].close.style.display = "none";
                }
            }
        }

        if (currentOpenPanel === panel) {
            panel.style.display = "none";
            close.style.display = "none";
            if (illustration) illustration.style.display = "block";
            currentOpenPanel = null;
        } else {
            if (illustration) illustration.style.display = "none";
            panel.style.display = "block";
            close.style.display = "inline";
            currentOpenPanel = panel;
        }
    }

    for (let key in panels) {
        const { btn, panel, close, auto } = panels[key];
        if (!btn || !panel || !close || auto) continue;

        btn.addEventListener("click", () => openOrClosePanel(panels[key]));
        close.addEventListener("click", () => {
            panel.style.display = "none";
            close.style.display = "none";
            if (illustration) illustration.style.display = "block";
            currentOpenPanel = null;
        });

        panel.addEventListener("click", (event) => {
            if (event.target === panel) {
                openOrClosePanel(panels[key]);
            }
        });
    }

    // Load folders on page load
    loadFolders();

    // Ensure popup-note is hidden by default
    const popupNote = document.querySelector(".popup-note");
    if (popupNote) {
        popupNote.style.display = "none";
    }

    // Quadrant
    const quadrantItems = document.querySelectorAll('.quadrant-item');
    const oval = document.querySelector('.highlight-oval');
    let selectedQuadrant = null;

    const colorMap = {
        'top-left': '#FED981',
        'top-right': '#EE7981',
        'bottom-left': '#AFD2BC',
        'bottom-right': '#B3B8F0'
    };

    quadrantItems.forEach(item => {
        item.addEventListener('click', () => {
            const rect = item.getBoundingClientRect();
            const parentRect = item.parentElement.getBoundingClientRect();
            let color = '#000';
            for (let key in colorMap) {
                if (item.classList.contains(key)) {
                    color = colorMap[key];
                    selectedQuadrant = key;
                    break;
                }
            }

            oval.style.left = (rect.left - parentRect.left + rect.width / 2 - 90) + "px";
            oval.style.top = (rect.top - parentRect.top + 10) + "px";
            oval.style.borderColor = color;
            oval.style.display = "block";
        });
    });

    // Calendar
    let currentDate = dayjs();
    let selectedStart = null;
    let selectedEnd = null;

    function showPopupNote() {
        const popupNote = document.querySelector(".popup-note");
        if (popupNote) {
            popupNote.style.display = "block";

            setTimeout(() => {
                popupNote.style.display = "none";
            }, 8000);

            popupNote.addEventListener("click", () => {
                popupNote.style.display = "none";
            }, { once: true });
        }
    }

    function renderCalendar() {
        const firstDayOfMonth = currentDate.startOf('month');
        const lastDayOfMonth = currentDate.endOf('month');
        const daysInMonth = lastDayOfMonth.date();
        const firstDayWeekday = (firstDayOfMonth.day() + 6) % 7;

        document.getElementById('month-year').textContent = currentDate.format('YYYY MMMM');
        const calendarBody = document.getElementById('calendar-body');
        calendarBody.innerHTML = '';

        let row = document.createElement('tr');
        for (let i = 0; i < firstDayWeekday; i++) {
            row.appendChild(document.createElement('td'));
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('td');
            const circle = document.createElement('div');
            circle.classList.add('day-circle');
            circle.textContent = day;
            cell.appendChild(circle);
            const cellDate = currentDate.date(day);

            const isSameAsStart = selectedStart && cellDate.isSame(selectedStart, 'day');
            const isSameAsEnd = selectedEnd && cellDate.isSame(selectedEnd, 'day');
            const isInRange = selectedStart && selectedEnd &&
                cellDate.isAfter(selectedStart, 'day') && cellDate.isBefore(selectedEnd, 'day');

            if (isSameAsStart && !selectedEnd) {
                cell.classList.add('single-selection');
            } else if (isSameAsStart || isSameAsEnd) {
                cell.classList.add('range-endpoints');
            } else if (isInRange) {
                cell.classList.add('range-date');
            }

            cell.addEventListener('click', () => handleDateClick(cellDate));
            row.appendChild(cell);

            if (row.children.length % 7 === 0) {
                calendarBody.appendChild(row);
                row = document.createElement('tr');
            }
        }

        if (row.children.length > 0) {
            calendarBody.appendChild(row);
        }
    }

    function handleDateClick(date) {
        if (selectedStart && !selectedEnd && date.isSame(selectedStart, 'day')) {
            selectedStart = null;
        } else if (!selectedStart || (selectedStart && selectedEnd)) {
            selectedStart = date;
            selectedEnd = null;
        } else if (date.isBefore(selectedStart)) {
            selectedEnd = selectedStart;
            selectedStart = date;
        } else {
            selectedEnd = date;
        }

        renderCalendar();
    }

    function changeMonth(offset) {
        currentDate = currentDate.add(offset, 'month');
        renderCalendar();
    }

    renderCalendar();

    // Time Picker
    let startTime = null;
    let endTime = null;

    function populateTimePicker() {
        const startScroll = document.getElementById("start-time-scroll");
        const endScroll = document.getElementById("end-time-scroll");

        startScroll.innerHTML = '';
        endScroll.innerHTML = '';

        for (let hour = 0; hour < 24; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                const startOption = document.createElement("div");
                startOption.classList.add("time-option");
                startOption.textContent = timeStr;
                startOption.addEventListener("click", () => {
                    startScroll.querySelectorAll(".time-option").forEach(opt => opt.classList.remove("selected"));
                    startOption.classList.add("selected");
                    startTime = timeStr;
                });
                startScroll.appendChild(startOption);

                const endOption = document.createElement("div");
                endOption.classList.add("time-option");
                endOption.textContent = timeStr;
                endOption.addEventListener("click", () => {
                    endScroll.querySelectorAll(".time-option").forEach(opt => opt.classList.remove("selected"));
                    endOption.classList.add("selected");
                    endTime = timeStr;
                });
                endScroll.appendChild(endOption);
            }
        }
    }

    populateTimePicker();

    // Reminder
    let reminderEnabled = false;
    let forcedReminder = false;
    let reminderTime = { value: 0, unit: "hours" };

    document.getElementById("reminder").addEventListener("change", (e) => {
        reminderEnabled = e.target.checked;
        document.querySelector(".reminder-hide").style.visibility = reminderEnabled ? "visible" : "hidden";
    });

    document.getElementById("forced").addEventListener("change", (e) => {
        forcedReminder = e.target.checked;
    });

    document.querySelectorAll(".option-button").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".option-button").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const type = btn.getAttribute("data-type");
            reminderTime.unit = type;

            document.querySelectorAll(".scroll-select").forEach(scroll => scroll.classList.add("hidden"));
            document.getElementById(`scroll-${type}`).classList.remove("hidden");
        });
    });

    document.querySelectorAll(".scroll-select").forEach(scroll => {
        scroll.addEventListener("click", (e) => {
            if (e.target.classList.contains("scroll-option")) {
                scroll.querySelectorAll(".scroll-option").forEach(opt => opt.classList.remove("selected"));
                e.target.classList.add("selected");
                reminderTime.value = parseFloat(e.target.textContent);
            }
        });
    });

    // Repeat
    let repeatType = null;
    let repeatCount = 0;
    let repeatDays = [];

    document.querySelectorAll('.repeat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (selectedStart && selectedEnd && !selectedStart.isSame(selectedEnd, 'day')) {
                showPopupNote();
                return;
            }

            document.querySelectorAll('.repeat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            repeatType = btn.getAttribute('data-type');
        });
    });

    document.querySelectorAll('.week-circle').forEach(circle => {
        circle.addEventListener('click', () => {
            circle.classList.toggle('active');
            const day = parseInt(circle.getAttribute('data-day'));
            const index = repeatDays.indexOf(day);
            if (index > -1) {
                repeatDays.splice(index, 1);
            } else {
                repeatDays.push(day);
            }
        });
    });

    const repeatButtons = document.querySelectorAll('.repeat-btn');
    const allParts = ['day-part', 'week-part', 'month-part'];

    repeatButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            allParts.forEach(id => {
                const part = document.getElementById(id);
                if (part) part.style.display = 'none';
            });

            const clickedId = btn.id;
            const partId = clickedId.replace('repeat-', '') + '-part';
            const activePart = document.getElementById(partId);
            if (activePart) activePart.style.display = 'block';
        });
    });

    document.getElementById("dayRepeatCount").addEventListener("input", (e) => {
        repeatCount = parseInt(e.target.value) || 0;
    });

    document.getElementById("weekRepeatCount").addEventListener("input", (e) => {
        repeatCount = parseInt(e.target.value) || 0;
    });

    document.getElementById("monthRepeatCount").addEventListener("input", (e) => {
        repeatCount = parseInt(e.target.value) || 0;
    });

    // Custom Calendar for Repeat (Month)
    let customCurrentDate = dayjs();
    let selectedRepeatDays = [];

    function renderCustomCalendar() {
        const firstDayOfMonth = customCurrentDate.startOf('month');
        const lastDayOfMonth = customCurrentDate.endOf('month');
        const daysInMonth = lastDayOfMonth.date();
        const firstDayWeekday = (firstDayOfMonth.day() + 6) % 7;

        document.getElementById('calendar-month-year').textContent = customCurrentDate.format('YYYY MMMM');
        const calendarBody = document.getElementById('calendar-custom-body');
        calendarBody.innerHTML = '';

        let row = document.createElement('tr');
        for (let i = 0; i < firstDayWeekday; i++) {
            row.appendChild(document.createElement('td'));
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('td');
            const circle = document.createElement('div');
            circle.classList.add('day-circle');
            circle.textContent = day;
            if (selectedRepeatDays.includes(day)) {
                circle.classList.add('selected-day');
            }
            cell.appendChild(circle);

            cell.addEventListener('click', () => {
                const index = selectedRepeatDays.indexOf(day);
                if (index > -1) {
                    selectedRepeatDays.splice(index, 1);
                } else {
                    selectedRepeatDays.push(day);
                }
                renderCustomCalendar();
            });

            row.appendChild(cell);
            if (row.children.length % 7 === 0) {
                calendarBody.appendChild(row);
                row = document.createElement('tr');
            }
        }

        if (row.children.length > 0) {
            calendarBody.appendChild(row);
        }
    }

    function changeCustomMonth(offset) {
        customCurrentDate = customCurrentDate.add(offset, 'month');
        renderCustomCalendar();
    }

    renderCustomCalendar();

    // Save Plan
    document.getElementById("save-btn").addEventListener("click", async () => {
        const isEditMode = document.getElementById("save-btn").dataset.editPlanId;
        const planName = document.getElementById("planName").value.trim();
        const notes = document.getElementById("notes").value.trim();
        const planData = {
            plan_name: planName,
            folder: selectedFolder,
            notes: notes,
            date_start: selectedStart ? selectedStart.format('YYYY-MM-DD') : null,
            date_end: selectedEnd ? selectedEnd.format('YYYY-MM-DD') : null,
            time_start: startTime,
            time_end: endTime,
            repeat: selectedStart && selectedEnd && !selectedStart.isSame(selectedEnd, 'day') ? null : {
                type: repeatType,
                count: repeatCount,
                days: repeatType === "week" ? repeatDays : (repeatType === "month" ? selectedRepeatDays : null)
            },
            reminder: reminderEnabled ? {
                enabled: reminderEnabled,
                forced: forcedReminder,
                time: reminderTime
            } : null,
            quadrant: selectedQuadrant
        };

        let url = '/api/add_plan';
        let successMessage = 'Plan added successfully';
        if (isEditMode) {
            url = '/api/edit_plan';
            planData.plan_id = isEditMode;
            successMessage = 'Plan updated successfully';
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(planData)
            });

            const result = await response.json();
            if (response.ok) {
                const plan = result.plan || planData;
                document.getElementById("planNameDisplay").textContent = plan.plan_name;
                document.getElementById("folderNameDisplay").textContent = plan.folder;
                document.getElementById("notesDisplay").textContent = plan.notes || "No notes";

                if (plan.date_start) {
                    document.getElementById("dateRangeDisplay").textContent = plan.date_end && plan.date_start !== plan.date_end
                        ? `${plan.date_start} to ${plan.date_end}`
                        : plan.date_start;
                }

                if (plan.time_start || plan.time_end) {
                    document.getElementById("timeRangeDisplay").textContent = `${plan.time_start || ''} - ${plan.time_end || ''}`;
                    if (plan.time_end) {
                        const now = dayjs();
                        const endDateTime = dayjs(`${plan.date_start} ${plan.time_end}`);
                        const timeLeft = endDateTime.diff(now, 'minute');
                        document.getElementById("timeLeftDisplay").textContent = `${timeLeft} minutes left`;
                    }
                }

                document.getElementById("reminderToggle").checked = plan.reminder?.enabled || false;
                if (plan.repeat) {
                    document.getElementById("repeatDisplay").textContent = `${plan.repeat.type} (${plan.repeat.count} times)`;
                }

                const oval = document.querySelector('.highlight-oval-plan');
                const quadrantItems = document.querySelectorAll('.quadrant-item-plan');
                quadrantItems.forEach(item => {
                    if (item.classList.contains(plan.quadrant)) {
                        const rect = item.getBoundingClientRect();
                        const parentRect = item.parentElement.getBoundingClientRect();
                        const color = colorMap[plan.quadrant];
                        oval.style.left = (rect.left - parentRect.left + rect.width / 2 - 90) + "px";
                        oval.style.top = (rect.top - parentRect.top + 10) + "px";
                        oval.style.borderColor = color;
                        oval.style.display = "block";
                    }
                });

                document.querySelector(".plan-details").dataset.planId = isEditMode || plan.id;
                document.querySelector(".plan-details").style.display = "block";
                delete document.getElementById("save-btn").dataset.editPlanId;
                alert(successMessage);
            } else if (response.status === 401) {
                alert("Please log in to save your plan.");
                window.location.href = "/login";
            } else {
                alert(result.error || "Failed to save plan.");
            }
        } catch (error) {
            console.error("Error saving plan:", error);
            alert("Error saving plan: " + error.message);
        }
    });

    // Delete Plan
    document.querySelector(".delete-btn-plan").addEventListener("click", async () => {
        const planId = document.querySelector(".plan-details").dataset.planId;
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
            if (response.ok) {
                alert("Plan deleted successfully!");
                document.querySelector(".plan-details").style.display = "none";
                document.getElementById("planName").value = "";
                document.getElementById("notes").value = "";
                document.getElementById("selectedFolder").textContent = "Select folder";
                selectedFolder = null;
                selectedStart = null;
                selectedEnd = null;
                startTime = null;
                endTime = null;
                repeatType = null;
                repeatCount = 0;
                repeatDays = [];
                selectedRepeatDays = [];
                reminderEnabled = false;
                forcedReminder = false;
                reminderTime = { value: 0, unit: "hours" };
                selectedQuadrant = null;
                checkSaveButtonVisibility();
            } else {
                alert(result.error || "Failed to delete plan.");
            }
        } catch (error) {
            console.error("Error deleting plan:", error);
            alert("Error deleting plan: " + error.message);
        }
    });

    // Edit Plan
    document.querySelector(".edit-btn-plan").addEventListener("click", async () => {
        const planId = document.querySelector(".plan-details").dataset.planId;
        if (!planId) {
            alert("Plan ID not found.");
            return;
        }

        try {
            const response = await fetch('/api/get_plans');
            const result = await response.json();
            if (response.ok) {
                const plan = result.plans.find(p => p.id === planId);
                if (plan) {
                    document.getElementById("planName").value = plan.plan_name;
                    document.getElementById("notes").value = plan.notes;
                    selectedFolder = plan.folder;
                    document.getElementById("selectedFolder").textContent = plan.folder;
                    selectedStart = plan.date_start ? dayjs(plan.date_start) : null;
                    selectedEnd = plan.date_end ? dayjs(plan.date_end) : null;
                    startTime = plan.time_start;
                    endTime = plan.time_end;
                    repeatType = plan.repeat?.type || null;
                    repeatCount = plan.repeat?.count || 0;
                    repeatDays = plan.repeat?.days || [];
                    selectedRepeatDays = plan.repeat?.days || [];
                    reminderEnabled = plan.reminder?.enabled || false;
                    forcedReminder = plan.reminder?.forced || false;
                    reminderTime = plan.reminder?.time || { value: 0, unit: "hours" };
                    selectedQuadrant = plan.quadrant;

                    document.getElementById("reminder").checked = reminderEnabled;
                    document.querySelector(".reminder-hide").style.visibility = reminderEnabled ? "visible" : "hidden";
                    document.getElementById("forced").checked = forcedReminder;
                    if (repeatType) {
                        document.querySelector(`#repeat-${repeatType}`).classList.add('active');
                        document.getElementById(`${repeatType}-part`).style.display = 'block';
                        document.getElementById(`${repeatType}RepeatCount`).value = repeatCount;
                        if (repeatType === "week") {
                            repeatDays.forEach(day => {
                                document.querySelector(`.week-circle[data-day="${day}"]`).classList.add('active');
                            });
                        }
                    }
                    renderCalendar();
                    renderCustomCalendar();
                    populateTimePicker();

                    document.querySelector(".plan-details").style.display = "none";
                    document.getElementById("save-btn").dataset.editPlanId = planId;
                }
            } else {
                alert(result.error || "Failed to load plan for editing.");
            }
        } catch (error) {
            console.error("Error loading plan for editing:", error);
            alert("Error loading plan for editing: " + error.message);
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