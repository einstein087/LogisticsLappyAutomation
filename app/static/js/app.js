/* LappyAutomation – client-side enhancements */

// Auto-refresh dashboard every 60 seconds
(function () {
  const dashboardRefresh = 60000;
  if (document.querySelector('[data-page="dashboard"]') ||
      window.location.pathname === '/' ||
      window.location.pathname === '/dashboard') {
    setTimeout(() => window.location.reload(), dashboardRefresh);
  }
})();
