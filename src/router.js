export function navigate(route) {
  window.location.hash = route;
}

export function getCurrentRoute() {
  return window.location.hash || '#home';
}
