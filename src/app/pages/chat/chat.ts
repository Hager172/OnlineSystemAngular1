import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatService, ChatMessage } from '../../core/services/Chat/chat.service';

const MAX_ATTACHMENT_MB = 10;

/**
 * Full-page version of the provider support chat (route: /chat).
 * Same single conversation as the header widget, just more room.
 *
 * Choosing a file only STAGES it; it uploads when the user presses Send
 * (typed text becomes the caption). Zoneless app: state is signals.
 */
@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css',
})
export class Chat implements OnInit, OnDestroy {

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

  constructor(public chat: ChatService) {
    // The page is always "open": new messages are read immediately and the
    // view stays scrolled down. markRead() is idempotent — no loops.
    effect(() => {
      this.chat.messages();
      this.chat.markRead();
      this.scrollToBottom();
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

  /** Grows the compose box with the text (up to ~5 lines). */
  private autoGrow(): void {
    const el = this.msgBox?.nativeElement;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 140) + 'px';
    }
  }

  attach(): void {
    this.uploadError.set(null);
    this.fileInput?.nativeElement.click();
  }

  /** Validates and STAGES the picked file — nothing is uploaded yet. */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
      this.uploadError.set(`File is too large (max ${MAX_ATTACHMENT_MB} MB).`);
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
      return new Date(iso).toLocaleString();
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
}
