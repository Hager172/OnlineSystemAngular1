import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private hubConnection!: signalR.HubConnection;

  public messages: any[] = [];

  startConnection() {

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('https://localhost:5001/chatHub')
      .withAutomaticReconnect()
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log('SignalR Connected');
      })
      .catch(err => console.log(err));

    this.receiveMessages();
  }

  receiveMessages() {

    this.hubConnection.on(
      'ReceiveMessage',
      (
        senderId: string,
        receiverId: string,
        message: string
      ) => {

        this.messages.push({
          senderId,
          receiverId,
          message
        });
      });
  }

  sendMessage(
    senderId: string,
    receiverId: string,
    message: string
  ) {

    this.hubConnection.invoke(
      'SendMessage',
      senderId,
      receiverId,
      message
    );
  }
}