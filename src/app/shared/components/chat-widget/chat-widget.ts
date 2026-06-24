import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  ChatService,
  ChatMessage,
  ChatContact
} from '../../../core/services/Chat/chat.service';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-widget.html',
  styleUrl: './chat-widget.css',
})
export class ChatWidget implements OnInit, OnDestroy {

  open = false;
  message = '';

  contacts: ChatContact[] = [];
  thread: ChatMessage[] = [];
  connected = false;

  private subs: Subscription[] = [];

  constructor(public chat: ChatService, private elRef: ElementRef) {}

  ngOnInit(): void {
    this.chat.startConnection();

    this.subs.push(
      this.chat.contacts$.subscribe(c => this.contacts = c),
      this.chat.activeThread$.subscribe(t => this.thread = t),
      this.chat.connected$.subscribe(c => this.connected = c),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  /** Total unread across all conversations — drives the navbar badge. */
  get totalUnread(): number {
    return this.contacts.reduce((sum, c) => sum + c.unread, 0);
  }

  get activePeer(): string | null {
    return this.chat.currentPeer;
  }

  toggle(): void {
    this.open = !this.open;
  }

  selectContact(contact: ChatContact): void {
    this.chat.openConversation(contact.peer);
  }

  back(): void {
    this.chat.closeConversation();
  }

  send(): void {
    const text = this.message.trim();
    if (!text || !this.activePeer) {
      return;
    }
    this.chat.send(text);
    this.message = '';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open && !this.elRef.nativeElement.contains(event.target)) {
      this.open = false;
    }
  }
}
