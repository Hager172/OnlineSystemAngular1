import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../core/services/Chat/chat.service';

@Component({
  selector: 'app-chat',
  imports:  [FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat implements OnInit{
 senderId = 'AngularUser';

  receiverId = 'DotNetUser';

  message = '';

  constructor(public chatService: ChatService) {}

  ngOnInit(): void {

    this.chatService.startConnection();
  }

  sendMessage() {

    if (!this.message.trim()) {
      return;
    }

    this.chatService.sendMessage(
      this.senderId,
      this.receiverId,
      this.message
    );

    this.message = '';
  }
}
