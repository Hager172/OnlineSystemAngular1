import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth-service';

export interface ChatMessage {
  senderId: string;
  receiverId: string;
  message: string;
  /** True when this message was sent by the current agent. */
  mine: boolean;
  timestamp: Date;
}

export interface ChatContact {
  /** The other party's username (the sender, from the agent's point of view). */
  peer: string;
  displayName: string;
  unread: number;
  lastMessage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private hub?: signalR.HubConnection;

  private connectedSubject = new BehaviorSubject<boolean>(false);
  connected$ = this.connectedSubject.asObservable();

  /** Inbox: one entry per person the agent has chatted with. */
  private contactsSubject = new BehaviorSubject<ChatContact[]>([]);
  contacts$ = this.contactsSubject.asObservable();

  /** Messages of the currently open conversation. */
  private activeThreadSubject = new BehaviorSubject<ChatMessage[]>([]);
  activeThread$ = this.activeThreadSubject.asObservable();

  /** Per-peer message threads. */
  private threads = new Map<string, ChatMessage[]>();
  private activePeer: string | null = null;

  constructor(private http: HttpClient, private auth: AuthService) {}

  /** The agent's own id — what the backend stores as senderId/receiverId. */
  get myId(): string {
    return this.auth.getUsername() ?? this.auth.getVendorId() ?? 'AngularUser';
  }

  get currentPeer(): string | null {
    return this.activePeer;
  }

  // ── Connection ─────────────────────────────────────────────────────────

  startConnection(): void {
    if (this.hub && this.hub.state !== signalR.HubConnectionState.Disconnected) {
      return;
    }

    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(environment.chatHubUrl, {
        // SignalR WebSocket bypasses HTTP interceptors, so we inject the JWT manually.
        accessTokenFactory: () => this.auth.getToken() ?? ''
      })
      .withAutomaticReconnect()
      .build();

    // Hub broadcasts via Clients.All, so the agent receives both inbound
    // messages and the echo of its own sends here.
    this.hub.on(
      'ReceiveMessage',
      (senderId: string, receiverId: string, message: string) =>
        this.handleIncoming(senderId, receiverId, message)
    );

    this.hub.onreconnected(() => this.connectedSubject.next(true));
    this.hub.onclose(() => this.connectedSubject.next(false));

    this.hub
      .start()
      .then(() => {
        this.connectedSubject.next(true);
        this.loadConversations();
      })
      .catch(err => console.error('SignalR connection error', err));
  }

  stopConnection(): void {
    this.hub?.stop();
  }

  // ── Inbox ──────────────────────────────────────────────────────────────

  /** Loads the contact list (conversations grouped by sender) from the DB. */
  loadConversations(): void {
    this.http.get<any>(environment.chatBridgeUrl + 'conversations').subscribe({
      next: res => {
        for (const item of this.asArray(res)) {
          const peer = this.peerOf(item);
          if (!peer || peer === this.myId) {
            continue;
          }
          const displayName = item?.displayName ?? item?.name ?? peer;
          this.upsertContact(
            peer,
            displayName,
            item?.lastMessage ?? item?.message ?? undefined,
            Number(item?.unread ?? item?.unreadCount ?? 0)
          );
        }
      },
      error: err => console.warn('Failed to load conversations', err)
    });
  }

  /** Opens a conversation: loads its history, marks it read, makes it active. */
  openConversation(peer: string): void {
    this.activePeer = peer;
    this.clearUnread(peer);
    this.emitActive();

    this.http
      .get<any>(environment.chatBridgeUrl + 'history', {
        params: new HttpParams().set('peer', peer)
      })
      .subscribe({
        next: res => {
          const history = this.asArray(res).map(m => this.toMessage(m));
          this.threads.set(peer, history);
          if (this.activePeer === peer) {
            this.emitActive();
          }
        },
        error: err => console.warn('Failed to load history for ' + peer, err)
      });
  }

  /** Returns to the inbox list (no conversation open). */
  closeConversation(): void {
    this.activePeer = null;
    this.emitActive();
  }

  /** Sends to the currently open conversation. */
  send(message: string): void {
    if (this.activePeer) {
      this.sendTo(this.activePeer, message);
    }
  }

  /** Sends to a specific peer via the hub. */
  sendTo(receiverId: string, message: string): void {
    const text = message.trim();
    if (!text) {
      return;
    }
    if (!this.hub || this.hub.state !== signalR.HubConnectionState.Connected) {
      console.warn('Chat hub is not connected yet');
      return;
    }

    const clientId = this.auth.getclientid() ?? '';
    // The hub echoes back via Clients.All, so we let handleIncoming append it.
    this.hub
      .invoke('SendMessage', this.myId, receiverId, text, clientId)
      .catch(err => console.error('SendMessage failed', err));
  }

  // ── Internals ──────────────────────────────────────────────────────────

  private handleIncoming(senderId: string, receiverId: string, message: string): void {
    const mine = senderId === this.myId;
    const peer = mine ? receiverId : senderId;
    if (!peer) {
      return;
    }

    const msg: ChatMessage = { senderId, receiverId, message, mine, timestamp: new Date() };

    const thread = this.threads.get(peer) ?? [];
    thread.push(msg);
    this.threads.set(peer, thread);

    // Unread only for inbound messages not in the open conversation.
    const incUnread = !mine && peer !== this.activePeer ? 1 : 0;
    this.upsertContact(peer, peer, message, incUnread, /*increment*/ true);

    if (peer === this.activePeer) {
      this.emitActive();
    }
  }

  /**
   * Inserts or updates a contact and moves it to the top.
   * When `increment` is true, `unread` is added to the running count;
   * otherwise it replaces it (used when seeding from the server).
   */
  private upsertContact(
    peer: string,
    displayName: string,
    lastMessage: string | undefined,
    unread: number,
    increment = false
  ): void {
    const list = this.contactsSubject.value;
    const existing = list.find(c => c.peer === peer);

    const contact: ChatContact = existing
      ? {
          ...existing,
          lastMessage: lastMessage ?? existing.lastMessage,
          unread: increment ? existing.unread + unread : unread
        }
      : { peer, displayName, lastMessage, unread };

    this.contactsSubject.next([contact, ...list.filter(c => c.peer !== peer)]);
  }

  private clearUnread(peer: string): void {
    this.contactsSubject.next(
      this.contactsSubject.value.map(c =>
        c.peer === peer ? { ...c, unread: 0 } : c
      )
    );
  }

  private emitActive(): void {
    this.activeThreadSubject.next(
      this.activePeer ? this.threads.get(this.activePeer) ?? [] : []
    );
  }

  /** Normalizes a history row (tolerant of varying backend field names). */
  private toMessage(m: any): ChatMessage {
    const senderId = m?.senderId ?? m?.SenderId ?? m?.sender ?? m?.from ?? '';
    const receiverId = m?.receiverId ?? m?.ReceiverId ?? m?.receiver ?? m?.to ?? '';
    const message = m?.message ?? m?.Message ?? m?.text ?? m?.body ?? '';
    const ts = m?.timestamp ?? m?.sentAt ?? m?.createdAt ?? m?.date;
    return {
      senderId,
      receiverId,
      message,
      mine: senderId === this.myId,
      timestamp: ts ? new Date(ts) : new Date()
    };
  }

  /** Extracts a peer username from a conversation row of unknown shape. */
  private peerOf(item: any): string {
    if (typeof item === 'string') {
      return item;
    }
    return (
      item?.peer ??
      item?.otherParty ??
      item?.userName ??
      item?.username ??
      item?.name ??
      ''
    );
  }

  /** Unwraps ServiceResponse<T> ({ data }) or a bare array. */
  private asArray(res: any): any[] {
    if (Array.isArray(res)) {
      return res;
    }
    if (Array.isArray(res?.data)) {
      return res.data;
    }
    return [];
  }
}
