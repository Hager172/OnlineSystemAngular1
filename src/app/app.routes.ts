import { Routes } from '@angular/router';
import { Login } from './shared/components/login/login';
import { Mainlayout } from './layouts/mainlayout/mainlayout';
import { Home } from './shared/components/home/home';
import { AuthGuard } from './core/guards/auth/auth-guard';
import { Approvalexchange } from './shared/components/approval/approvalexchange/approvalexchange';
import { ApprovalInput } from './shared/components/approval/approval-input/approval-input';
import { ApprovalEdit } from './shared/components/approval/approval-edit/approval-edit';
import { InvoicePrint } from './shared/components/approval/invoice-print/invoice-print';
import { MemberApproval } from './shared/components/member-approval/member-approval';
import { Memberapprovaln } from './shared/components/memberapprovaln/memberapprovaln';
import { Test } from './shared/components/test/test';
import { Addapproval } from './shared/components/addapproval/addapproval';

import { SearchResults } from './shared/components/search-results/search-results';

import { Chat } from './pages/chat/chat';
import { Approvals3m } from './shared/components/approvals3m/approvals3m';
import { ApprovalEditSearch } from './shared/components/approval-edit-search/approval-edit-search';



export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  {
    path: '',
    component: Mainlayout,
    children: [
      { path: 'home', component: Home },
      {path: 'exchange' , component: Approvalexchange},
      {path: 'appinput', component:ApprovalInput},
      {path: 'approval-edit/:approvalNumber', component: ApprovalEdit},
      {path: 'approval-edit-search/:approvalNumber', component: ApprovalEditSearch},
      {path: 'invoice-print/:approvalNumber', component: InvoicePrint},
      //{path:'memberapp', component:MemberApproval},
      {path: 'mem' , component:Memberapprovaln},
      {path:'test', component:Test},
      {path: 'add', component:Addapproval},

    {path: 'search-results', component: SearchResults},
    {path:'monthlyapprovals',component:Approvals3m},

      {path: 'chat', component:Chat},

    ],
    //canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: 'login' },



];
