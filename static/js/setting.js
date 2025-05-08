document.addEventListener('DOMContentLoaded', () => {
    try {
        // Load saved settings
        const savedTheme = localStorage.getItem('theme') || 'light';
        applyTheme(savedTheme);
        document.getElementById('theme-select').value = savedTheme;

        const savedNotifications = localStorage.getItem('notifications');
        if (savedNotifications !== null) {
            document.getElementById('notifications-toggle').checked = savedNotifications === 'true';
        }

        const savedLanguage = localStorage.getItem('language') || 'en';
        document.getElementById('language-select').value = savedLanguage;

        // Sidebar toggle functionality
        const sidebar = document.querySelector('.sidebar');
        const toggleBtn = document.querySelector('.toggle-btn');
        const plusIcon = document.querySelector('.plus-icon');

        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            plusIcon.style.display = sidebar.classList.contains('open') ? 'none' : 'block';
        });
    } catch (error) {
        console.error('Error loading settings or initializing sidebar:', error);
        alert('Failed to load settings or initialize sidebar. Please try again.');
    }
});

function applyTheme(theme) {
    try {
        document.body.classList.remove('light', 'dark', 'dark-blue', 'dark-purple');
        document.body.classList.add(theme);
    } catch (error) {
        console.error('Error applying theme:', error);
        alert('Failed to apply theme. Please try again.');
    }
}

function saveSettings() {
    try {
        // 获取设置值
        const theme = document.getElementById('theme-select').value;
        const notifications = document.getElementById('notifications-toggle').checked;
        const language = document.getElementById('language-select').value;

        // 保存到 localStorage
        try {
            localStorage.setItem('theme', theme);
            localStorage.setItem('notifications', notifications.toString());
            localStorage.setItem('language', language);
            console.log('Settings saved to localStorage:', { theme, notifications, language });
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            alert('Failed to save settings to localStorage. Your browser may be in private mode or have storage restrictions.');
            return;
        }

        // 应用主题
        applyTheme(theme);

        // 保存到后端（如果有）
        fetch('/update_settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ theme, notifications, language })
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                console.error('Failed to save settings to backend:', data.error);
            } else {
                console.log('Settings saved to backend successfully');
            }
        })
        .catch(error => {
            console.error('Error saving settings to backend:', error);
            // 不影响前端保存，继续显示成功提示
        });

        // 提示用户
        let themeDisplayName = theme === 'light' ? 'Light Mode' :
                             theme === 'dark' ? 'Dark Mode (Gray)' :
                             theme === 'dark-blue' ? 'Dark Mode (Blue)' :
                             'Dark Mode (Purple)';
        alert('Settings saved successfully! 🎉\nTheme: ' + themeDisplayName +
              '\nNotifications: ' + (notifications ? 'Enabled' : 'Disabled') +
              '\nLanguage: ' + (language === 'en' ? 'English' : 'Chinese (Coming Soon)'));
    } catch (error) {
        console.error('Error in saveSettings:', error);
        alert('Failed to save settings. Please try again.');
    }
}