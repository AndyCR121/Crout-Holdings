// Production environment
// apiUrl is intentionally empty — the WordPress plugin injects
// window.__env.apiUrl at runtime via wp_inline_script.
export const environment = {
  production: true,
  apiUrl: 'https://api.automations.crout-holdings.com',
};
