import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RequestStateService } from '../../../core/services/request-state/request-state';

@Component({
  selector: 'app-request-attachments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './request-attachments.html',
  styleUrl: './request-attachments.css',
})
export class RequestAttachments {
  constructor(public state: RequestStateService) {}

  handleFileSelect(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.state.addFiles(files);
    }
  }

  handleFileDrop(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.state.addFiles(files);
    }
  }

  removeFile(index: number): void {
    this.state.removeFile(index);
  }

  totalSizeMb(): string {
    const totalBytes = this.state.selectedFiles().reduce((sum, f) => sum + f.size, 0);
    return (totalBytes / (1024 * 1024)).toFixed(1);
  }

  fileSizeMb(file: File): string {
    return (file.size / (1024 * 1024)).toFixed(1);
  }
}
