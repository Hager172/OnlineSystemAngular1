import { Inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpEventType, HttpParams } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth-service';

/**
 * Provider-side chat against the IQ-Health portal chat API.
 *
 * A provider has exactly ONE conversation with the ACMS support team. Real-time
 * traffic flows over the SignalR hub at environment.chatHubUrl (authenticated
 * with the normal portal JWT); history/unread state loads over REST (api/chat/...).
 *
 * State is exposed as SIGNALS, not observables: this app is zoneless, and only
 * signal writes (or user events) schedule change detection. SignalR callbacks
 * writing plain fields/subjects would update memory without re-rendering —
 * messages would only "appear" on the next click.
 *
 * Providers never see the individual agent's name: agent messages are labeled
 * with a per-client support alias (supportName) instead. ACMS keeps real names.
 */

export interface ChatMessage {
  id: number;
  conversationId: number;
  senderType: 'Provider' | 'AcmsUser' | string;
  senderId?: string | null;
  senderName?: string | null;
  message?: string | null;
  createdAtUtc?: string | null;
  isRead: boolean;
  /** True when sent by this provider (drives bubble alignment). */
  mine: boolean;
  /** Download/view URL when the message carries a file (absolute, see resolveUrl). */
  attachmentUrl?: string | null;
  /** Original file name of the attachment. */
  attachmentName?: string | null;
  /** MIME type of the attachment (image/* renders inline). */
  attachmentContentType?: string | null;
}

/** Progress of an in-flight attachment upload (percent 0-100, then done). */
export interface UploadProgress {
  percent: number;
  done: boolean;
}

export interface ChatConversation {
  id: number;
  providerId?: string | null;
  providerName?: string | null;
  lastMessageAtUtc?: string | null;
  lastMessagePreview?: string | null;
  isClosed: boolean;
  unreadCount: number;
  isProviderOnline: boolean;
  onlineAgentCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private hub?: signalR.HubConnection;
  private readonly isBrowser: boolean;
  private typingClear?: ReturnType<typeof setTimeout>;

  /** Hub connection state. */
  readonly connected = signal(false);

  /** The provider's conversation thread, oldest first. */
  readonly messages = signal<ChatMessage[]>([]);

  /** Unread agent replies — drives the launcher badge. */
  readonly unread = signal(0);

  /** Support alias currently typing (e.g. "Mashreq Support"), or null. */
  readonly agentTyping = signal<string | null>(null);

  /** True while at least one ACMS agent is connected. */
  readonly supportOnline = signal(false);

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /**
   * What the provider sees instead of the agent's real name, based on the
   * client the provider is logged into.
   */
  get supportName(): string {
    switch (this.auth.getclientid()) {
      case '2': return 'Mashreq Support';
      case '3': return 'Medigold Support';
      default: return 'Support';
    }
  }

  // ── Connection ─────────────────────────────────────────────────────────

  startConnection(): void {
    if (!this.isBrowser || !this.auth.getToken()) {
      return; // SSR pass or not logged in yet
    }
    if (this.hub && this.hub.state !== signalR.HubConnectionState.Disconnected) {
      return;
    }

    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(environment.chatHubUrl, {
        // WebSockets bypass HTTP interceptors, so the JWT goes in explicitly.
        accessTokenFactory: () => this.auth.getToken() ?? ''
      })
      .withAutomaticReconnect()
      .build();

    this.hub.on('ReceiveMessage', (m: any) => this.onMessage(m));
    this.hub.on('ConversationUpdated', (c: any) => this.onConversation(c));
    this.hub.on('TypingIndicator', (t: any) => this.onTyping(t));
    this.hub.on('PresenceChanged', (p: any) => this.onPresence(p));
    this.hub.on('MessagesRead', (r: any) => this.onMessagesRead(r));

    this.hub.onreconnected(() => {
      this.connected.set(true);
      this.refresh();
    });
    this.hub.onclose(() => this.connected.set(false));

    this.hub
      .start()
      .then(() => {
        this.connected.set(true);
        this.refresh();
      })
      .catch(err => console.error('Chat hub connection failed', err));
  }

  stopConnection(): void {
    this.hub?.stop();
  }

  // ── Actions ────────────────────────────────────────────────────────────

  /** Sends a message. The stored copy arrives back via ReceiveMessage. */
  send(text: string): void {
    const message = text.trim();
    if (!message) {
      return;
    }
    if (!this.hub || this.hub.state !== signalR.HubConnectionState.Connected) {
      console.warn('Chat hub is not connected yet');
      return;
    }

    this.hub
      .invoke('SendMessage', message, null)
      .catch(err => console.error('SendMessage failed', err));
  }

  /**
   * Uploads a file/image as a chat attachment. The backend stores the file,
   * creates the chat message and broadcasts it via ReceiveMessage — so, like
   * send(), the message shows up through the normal hub flow.
   * Emits upload progress; errors surface through the returned observable.
   */
  sendAttachment(file: File, caption = ''): Observable<UploadProgress> {
    const form = new FormData();
    form.append('file', file, file.name);
    if (caption.trim()) {
      form.append('message', caption.trim());
    }

    return new Observable<UploadProgress>(subscriber => {
      const sub = this.http
        .post(environment.apiUrl + 'chat/attachments', form, {
          reportProgress: true,
          observe: 'events'
        })
        .subscribe({
          next: event => {
            if (event.type === HttpEventType.UploadProgress && event.total) {
              subscriber.next({
                percent: Math.round((event.loaded / event.total) * 100),
                done: false
              });
            } else if (event.type === HttpEventType.Response) {
              subscriber.next({ percent: 100, done: true });
              subscriber.complete();
            }
          },
          error: err => subscriber.error(err)
        });
      return () => sub.unsubscribe();
    });
  }

  /** True when the attachment should render as an inline image. */
  isImage(m: ChatMessage): boolean {
    return !!m.attachmentUrl
      && (m.attachmentContentType ?? '').toLowerCase().startsWith('image/');
  }

  /** Typing indicator towards the agents. */
  setTyping(isTyping: boolean): void {
    if (this.hub?.state === signalR.HubConnectionState.Connected) {
      this.hub.invoke('Typing', isTyping, null, null).catch(() => { /* non-critical */ });
    }
  }

  /**
   * Marks all agent replies as read (call when the chat UI is visible).
   * Idempotent: when nothing is unread it writes nothing and calls nothing —
   * safe to call from effects that read messages() without causing a loop.
   */
  markRead(): void {
    const hadUnreadBadge = this.unread() !== 0;
    if (hadUnreadBadge) {
      this.unread.set(0);
    }

    const messages = this.messages();
    const hasUnreadIncoming = messages.some(m => !m.mine && !m.isRead);
    if (hasUnreadIncoming) {
      this.messages.set(
        messages.map(m => (m.mine || m.isRead ? m : { ...m, isRead: true }))
      );
    }

    if ((hadUnreadBadge || hasUnreadIncoming)
        && this.hub?.state === signalR.HubConnectionState.Connected) {
      this.hub.invoke('MarkConversationRead', null).catch(() => { /* non-critical */ });
    }
  }

  /** Reloads the thread (most recent `take` messages, oldest first). */
  loadHistory(take = 50): void {
    this.http
      .get<any[]>(environment.apiUrl + 'chat/history', {
        params: new HttpParams().set('skip', 0).set('take', take)
      })
      .subscribe({
        next: rows => this.messages.set((rows ?? []).map(r => this.toMessage(r))),
        error: err => console.warn('Failed to load chat history', err)
      });
  }

  // ── Internals ──────────────────────────────────────────────────────────

  private refresh(): void {
    this.loadHistory();
    this.loadConversationState();
  }

  /** Unread badge + support presence from the conversation list endpoint. */
  private loadConversationState(): void {
    this.http.get<ChatConversation[]>(environment.apiUrl + 'chat/conversations').subscribe({
      next: conversations => {
        const mine = (conversations ?? [])[0];
        if (mine) {
          this.unread.set(mine.unreadCount ?? 0);
          this.supportOnline.set((mine.onlineAgentCount ?? 0) > 0);
        }
      },
      error: err => console.warn('Failed to load chat state', err)
    });
  }

  private onMessage(raw: any): void {
    const message = this.toMessage(raw);
    this.messages.update(list => [...list, message]);

    if (!message.mine) {
      this.unread.update(u => u + 1);
      this.agentTyping.set(null);
    }
  }

  private onConversation(c: any): void {
    if (typeof c?.onlineAgentCount === 'number') {
      this.supportOnline.set(c.onlineAgentCount > 0);
    }
  }

  private onTyping(t: any): void {
    if (t?.senderType !== 'AcmsUser') {
      return;
    }
    clearTimeout(this.typingClear);
    if (t.isTyping) {
      // Providers see the support alias, never the agent's real name.
      this.agentTyping.set(this.supportName);
      // Safety net: never let a lost "stopped typing" event stick forever.
      this.typingClear = setTimeout(() => this.agentTyping.set(null), 4000);
    } else {
      this.agentTyping.set(null);
    }
  }

  private onPresence(p: any): void {
    if (p?.participantType !== 'AcmsUser') {
      return;
    }
    if (p.isOnline) {
      this.supportOnline.set(true);
    } else {
      // An agent left; re-check whether anyone is still online.
      this.loadConversationState();
    }
  }

  /** Agent read our messages -> flip the ticks on everything we sent. */
  private onMessagesRead(r: any): void {
    if (r?.readerType !== 'AcmsUser') {
      return;
    }
    const messages = this.messages();
    if (messages.some(m => m.mine && !m.isRead)) {
      this.messages.set(
        messages.map(m => (m.mine && !m.isRead ? { ...m, isRead: true } : m))
      );
    }
  }

  /** Attachment URLs come back site-relative (/uploads/chat/...). */
  private resolveUrl(url?: string | null): string | null {
    if (!url) {
      return null;
    }
    if (/^https?:\/\//i.test(url)) {
      return url;
    }
    const origin = new URL(environment.apiUrl).origin;
    return url.startsWith('/') ? origin + url : origin + '/' + url;
  }

  private toMessage(r: any): ChatMessage {
    const senderType = r?.senderType ?? '';
    return {
      id: r?.id ?? 0,
      conversationId: r?.conversationId ?? 0,
      senderType,
      senderId: r?.senderId,
      senderName: r?.senderName,
      message: r?.message,
      createdAtUtc: r?.createdAtUtc,
      isRead: !!r?.isRead,
      mine: senderType === 'Provider',
      attachmentUrl: this.resolveUrl(r?.attachmentUrl ?? r?.fileUrl),
      attachmentName: r?.attachmentName ?? r?.fileName,
      attachmentContentType: r?.attachmentContentType ?? r?.contentType
    };
  }
}
