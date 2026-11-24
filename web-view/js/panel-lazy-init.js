/* Shared event-driven initializer for data-bearing panels. */
export function createPanelLazyInitializer(doc, options) {
  options = options || {};
  var selector = options.selector || '';
  var initialize = options.initialize || function () {};
  var initialized = new WeakSet();

  function initPanel(targetId) {
    if (!targetId || !selector) { return; }
    var panel = doc.getElementById('tab-' + targetId);
    if (!panel) { return; }
    panel.querySelectorAll(selector).forEach(function (container) {
      if (initialized.has(container)) { return; }
      try {
        initialize(container);
        initialized.add(container);
      } catch (err) {
        /* Failed synchronous mounts remain eligible on a later activation. */
        if (options.onError) { options.onError(container, err); }
      }
    });
  }

  doc.addEventListener('aios:panel-activated', function (event) {
    initPanel(event && event.detail && event.detail.targetId);
  });

  function initActivePanel() {
    var activePanel = null;
    doc.querySelectorAll('.tab-panel').forEach(function (panel) {
      if (!activePanel && panel.classList.contains('active')) { activePanel = panel; }
    });
    if (activePanel) { initPanel(activePanel.id.replace(/^tab-/, '')); }
  }

  return { initPanel: initPanel, initActivePanel: initActivePanel };
}
