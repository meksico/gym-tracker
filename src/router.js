export function navigate(route) {
  if (window.location.hash === route) {
    window.dispatchEvent(new Event('hashchange'));
  } else {
    window.location.hash = route;
  }
}

export function getCurrentRoute() {
  return window.location.hash || '#home';
}
