// Theme Management (Light/Dark Mode)

const Theme = {
  currentTheme: 'light',

  // Initialize theme from storage or system preference
  init() {
    const config = Storage.getConfig();
    const savedTheme = config?.theme;
    
    if (savedTheme) {
      this.setTheme(savedTheme);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.setTheme(prefersDark ? 'dark' : 'light');
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!Storage.getConfig()?.theme) {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });
  },

  // Set theme
  setTheme(theme) {
    if (theme !== 'light' && theme !== 'dark') {
      theme = 'light';
    }

    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    
    // Save to config
    const config = Storage.getConfig();
    if (config) {
      config.theme = theme;
      Storage.saveConfig(config);
    }

    // Update theme toggle icon
    this.updateThemeToggle();
  },

  // Toggle between light and dark
  toggle() {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  },

  // Get current theme
  getTheme() {
    return this.currentTheme;
  },

  // Update theme toggle button icon
  updateThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;

    const icon = toggleBtn.querySelector('svg');
    if (!icon) return;

    if (this.currentTheme === 'dark') {
      // Show sun icon for dark mode (to switch to light)
      icon.innerHTML = `
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      `;
    } else {
      // Show moon icon for light mode (to switch to dark)
      icon.innerHTML = `
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      `;
    }
  }
};

