import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatService, ChatMessage } from '../../core/services/Chat/chat.service';
import { environment } from '../../core/environments/environment';

@Component({
  selector: 'app-chat',
  imports: [FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat implements OnInit, OnDestroy {

  receiverId = environment.chatDefaultReceiverId;
  message = '';
  messages: ChatMessage[] = [];

  private sub?: Subscription;

  constructor(public chatService: ChatService) {}

  ngOnInit(): void {
    this.chatService.startConnection();
    this.chatService.openConversation(this.receiverId);
    this.sub = this.chatService.activeThread$.subscribe(t => this.messages = t);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  sendMessage(): void {
    if (!this.message.trim()) {
      return;
    }
    this.chatService.sendTo(this.receiverId, this.message);
    this.message = '';
  }
}
