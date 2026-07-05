import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RequestDetails } from '../request-details/request-details';

@Component({
  selector: 'app-issue-approval',
  standalone: true,
  imports: [CommonModule, RequestDetails],
  templateUrl: './issue-approval.html',
  styleUrl: './issue-approval.css',
})
export class IssueApproval {}