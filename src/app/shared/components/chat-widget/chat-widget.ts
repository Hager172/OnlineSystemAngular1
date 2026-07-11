import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatService, ChatMessage } from '../../../core/services/Chat/chat.service';

const MAX_ATTACHMENT_MB = 10;
const ACCEPTED_TYPES = [
  'image/', 'application/pdf', 'text/plain',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed',
];

/**
 * Floating support-chat widget for providers: one conversation with the
 * support team (shown under a per-client alias like "Mashreq Support" — never
 * the agent's real name). Unread badge, presence, typing indicator, read
 * ticks and file attachments.
 *
 * Choosing a file only STAGES it (chip above the compose box, removable);
 * nothing uploads until the user presses Send — so a mistaken file pick
 * never sends anything.
 *
 * Zoneless app: all mutable view state is signals; the service exposes
 * signals too, so SignalR pushes re-render immediately.
 */
@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-widget.html',
  styleUrl: './chat-widget.css',
})
export class ChatWidget implements OnInit, OnDestroy {

  open = signal(false);
  message = '';

  uploading = signal(false);
  uploadProgress = signal(0);
  uploadError = signal<string | null>(null);

  /** File picked but not yet sent (sent on Send, removable before that). */
  pendingFile = signal<File | null>(null);
  /** Object URL for the thumbnail when the pending file is an image. */
  pendingPreviewUrl = signal<string | null>(null);

  @ViewChild('messagesBox') messagesBox?: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('msgBox') msgBox?: ElementRef<HTMLTextAreaElement>;

  private subs: Subscription[] = [];
  private typingTimer?: ReturnType<typeof setTimeout>;

  constructor(public chat: ChatService, private elRef: ElementRef) {
    // New messages while the panel is open: mark read + keep scrolled down.
    // markRead() is idempotent, so this effect cannot loop.
    effect(() => {
      this.chat.messages();
      if (this.open()) {
        this.chat.markRead();
        this.scrollToBottom();
      }
    });

    effect(() => {
      if (this.chat.agentTyping() && this.open()) {
        this.scrollToBottom();
      }
    });
  }

  ngOnInit(): void {
    this.chat.startConnection();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    clearTimeout(this.typingTimer);
    this.revokePreview();
  }

  toggle(): void {
    this.open.update(o => !o);
    if (this.open()) {
      this.chat.markRead();
      this.scrollToBottom();
    }
  }

  /** True when there is something to send (text and/or staged file). */
  get canSend(): boolean {
    return this.chat.connected()
      && !this.uploading()
      && (!!this.message.trim() || !!this.pendingFile());
  }

  send(): void {
    if (this.uploading()) {
      return;
    }

    const text = this.message.trim();
    const file = this.pendingFile();

    this.chat.setTyping(false);
    clearTimeout(this.typingTimer);

    if (file) {
      // Staged attachment goes out now, with any typed text as its caption.
      this.uploading.set(true);
      this.uploadProgress.set(0);
      this.uploadError.set(null);

      this.subs.push(
        this.chat.sendAttachment(file, text).subscribe({
          next: p => {
            this.uploadProgress.set(p.percent);
            if (p.done) {
              this.uploading.set(false);
              this.message = '';
              this.removePending();
              this.scrollToBottom();
            }
          },
          error: () => {
            // Keep the staged file so the user can just press Send again.
            this.uploading.set(false);
            this.uploadError.set('Upload failed. Please try again.');
          }
        })
      );
      return;
    }

    if (!text) {
      return;
    }
    this.chat.send(text);
    this.message = '';
    setTimeout(() => this.autoGrow());
  }

  /** Enter sends; Shift+Enter inserts a new line. */
  onEnter(event: Event): void {
    const e = event as KeyboardEvent;
    if (!e.shiftKey) {
      e.preventDefault();
      this.send();
    }
  }

  onInput(): void {
    this.autoGrow();
    this.chat.setTyping(true);
    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => this.chat.setTyping(false), 1200);
  }

  /** Grows the compose box with the text (up to ~4 lines). */
  private autoGrow(): void {
    const el = this.msgBox?.nativeElement;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 110) + 'px';
    }
  }

  // ── Attachments ────────────────────────────────────────────────────────

  attach(): void {
    this.uploadError.set(null);
    this.fileInput?.nativeElement.click();
  }

  /** Validates and STAGES the picked file — nothing is uploaded yet. */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow re-selecting the same file next time
    if (!file) {
      return;
    }

    if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
      this.uploadError.set(`File is too large (max ${MAX_ATTACHMENT_MB} MB).`);
      return;
    }
    if (!ACCEPTED_TYPES.some(t => file.type.startsWith(t)) && file.type !== '') {
      this.uploadError.set('This file type is not allowed.');
      return;
    }

    this.uploadError.set(null);
    this.revokePreview();
    this.pendingFile.set(file);
    this.pendingPreviewUrl.set(
      file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    );
  }

  removePending(): void {
    this.revokePreview();
    this.pendingFile.set(null);
  }

  isImage(m: ChatMessage): boolean {
    return this.chat.isImage(m);
  }

  trackById(_: number, m: ChatMessage): number {
    return m.id;
  }

  formatTime(iso?: string | null): string {
    if (!iso) {
      return '';
    }
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  private revokePreview(): void {
    const url = this.pendingPreviewUrl();
    if (url) {
      URL.revokeObjectURL(url);
      this.pendingPreviewUrl.set(null);
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.messagesBox?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.elRef.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }
}
