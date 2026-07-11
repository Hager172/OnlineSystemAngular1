export const environment = {
  production: false,
  apiUrl: 'https://localhost:7043/api/',
  // IQ-Health portal SignalR chat hub (app.MapHub<ChatHub>("/chatHub")).
  // Providers and ACMS agents both connect to this same hub.
  chatHubUrl: 'https://localhost:7043/chatHub'
};
