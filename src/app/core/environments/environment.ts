export const environment = {
  production: false,
  apiUrl: 'https://localhost:7043/api/',
  // SignalR ChatHub endpoint exposed by the .NET app. Adjust the host/port
  // to match wherever the backend maps the hub (e.g. app.MapHub<ChatHub>("/chatHub")).
  chatHubUrl: 'https://localhost:7043/chatHub',
  // Base URL for the ChatBridge REST endpoints used to load the inbox + history:
  //   GET {chatBridgeUrl}Conversations        -> contacts grouped by sender
  //   GET {chatBridgeUrl}History?peer=<user>   -> message history with that peer
  // Point this at your Core app's own endpoints, or at ACMS's /ChatBridge/ if same-network (CORS).
  chatBridgeUrl: 'https://localhost:7043/api/chat/',
  // Fallback peer for the standalone /chat page when no contact is selected.
  chatDefaultReceiverId: 'DotNetUser'
};
