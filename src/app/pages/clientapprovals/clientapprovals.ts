import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router'; // استيراد Router
import { ClientApproval } from '../../core/services/clientApprovalls/client-approval';
import { ApprovallsclientDTO } from '../../shared/models/ApprovallsclientDTO';
import Swal from 'sweetalert2';
import { AuthService } from '../../core/services/auth/auth-service';

@Component({
  selector: 'app-clientapprovals',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clientapprovals.html',
  styleUrl: './clientapprovals.css',
})
export class Clientapprovals implements OnInit {
  approvallsToDay: ApprovallsclientDTO[] = [];
  
  // Search properties
  showSearchInput: boolean = false;
  apptype: 'all' | 'notcompelete' = 'all';
  searchType: 'approval' | 'member' | null = null;
  searchValue: number | null = null;
  
  // Pagination properties
  currentPage: number = 1;
  itemsPerPage: number = 8;
  totalPages: number[] = [];

  constructor(
    private service: ClientApproval,
    private router: Router,
    private auth:AuthService // حقن Router
  ) {}

  ngOnInit(): void {
    this.loadapprovalls();
  }

  loadapprovalls(): void {
    this.service.getalltoday(this.auth.getvendor()).subscribe({
      next: (res) => {
        console.log(res);
        
        this.approvallsToDay = res.data.approvals;
        this.calculateTotalPages();
      },
      error: (error) => {
        console.log(error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load approvals',
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  toggleSearch(type: 'approval' | 'member'): void {
    this.searchType = type;
    this.showSearchInput = true;
    this.searchValue = null;
  }
  
  toggleapp(type: 'all' | 'notcompelete'): void {
    if (!type) return;
    
    this.apptype = type;
    
    if (type === 'all') {
      this.loadapprovalls();
    } else if (type === 'notcompelete') {
      this.service.getallnotcomplete(this.auth.getvendor()).subscribe({
        next: (res) => {
          this.approvallsToDay = res;
          this.calculateTotalPages();
          this.currentPage = 1;
        },
        error: (error) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load approvals',
            confirmButtonColor: '#d33'
          });
        }
      });
    }
  }

  cancelSearch(): void {
    this.showSearchInput = false;
    this.searchType = null;
    this.searchValue = null;
  }

  performSearch(): void {
    if (!this.searchValue) return;

    if (this.searchValue <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Input',
        text: 'Please enter a valid number greater than 0',
        confirmButtonColor: '#f59e0b'
      });
      return;
    }

    if (this.searchType === 'approval') {
      this.service.searchonapp(this.searchValue).subscribe({
        next: (res) => {
          this.checkSearchResult(res);
        },
        error: (err) => {
          console.error('Error searching by approval:', err);
          Swal.fire({
            icon: 'error',
            title: 'Search Failed',
            text: 'Failed to search by approval',
            confirmButtonColor: '#d33'
          });
        }
      });
    } 
    else if (this.searchType === 'member') {
      this.service.searchonmemberID(this.searchValue).subscribe({
        next: (res) => {
          
          this.checkSearchResult(res);
        },
        error: (err) => {
          console.error('Error searching by member ID:', err);
          Swal.fire({
            icon: 'error',
            title: 'Search Failed',
            text: 'Failed to search by member ID',
            confirmButtonColor: '#d33'
          });
        }
      });
    }
  }

  checkSearchResult(result: any): void {
    if (!result || (typeof result === 'object' && Object.keys(result).length === 0)) {
      Swal.fire({
        icon: 'info',
        title: 'No Results Found',
        html: `
          <div class="text-center">
            <i class="fas fa-search fa-3x text-muted mb-3"></i>
            <p class="mb-0">No approval found for this ${this.searchType === 'approval' ? 'approval number' : 'member ID'}</p>
            <small class="text-muted">Please check the number and try again</small>
          </div>
        `,
        confirmButtonColor: '#667eea'
      });
      this.cancelSearch();
      return;
    }

    // هنا بقى السحر الحقيقي - التوجيه لصفحة تانية
    this.router.navigate(['/approval-result'], {
      state: { 
        result: result,
        searchType: this.searchType 
      }
    });
    
    this.cancelSearch(); // قفل الـ input
  }

  // Pagination methods
  get pagedApprovals(): ApprovallsclientDTO[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.approvallsToDay.slice(start, start + this.itemsPerPage);
  }

  calculateTotalPages(): void {
    const pages = Math.ceil(this.approvallsToDay.length / this.itemsPerPage);
    this.totalPages = Array.from({ length: pages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    this.currentPage = page;
  }
}